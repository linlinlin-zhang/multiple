import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_FIXTURE_PATH = path.join(__dirname, "evals", "chat-system-eval.jsonl");
const fixturePath = process.argv[2] || DEFAULT_FIXTURE_PATH;
const artifactDir = process.env.CHAT_SYSTEM_EVAL_ARTIFACT_DIR
  ? path.resolve(process.env.CHAT_SYSTEM_EVAL_ARTIFACT_DIR)
  : path.join(__dirname, "evals", "artifacts");
const reportPath = path.join(artifactDir, "chat-system-eval-report.json");
const endpoint = process.env.CHAT_SYSTEM_EVAL_ENDPOINT || "http://127.0.0.1:3000/api/chat";
const shouldRun = process.env.RUN_CHAT_SYSTEM_EVALS === "1";
const maxFixtures = Math.max(0, Math.min(Number(process.env.CHAT_SYSTEM_EVAL_MAX_FIXTURES) || 0, 100));
const fixtureIdFilter = new Set(String(process.env.CHAT_SYSTEM_EVAL_IDS || "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean));
const timeoutMs = Math.max(10000, Math.min(Number(process.env.CHAT_SYSTEM_EVAL_TIMEOUT_MS) || 180000, 300000));

function readJsonl(filePath) {
  return fs.readFileSync(filePath, "utf8")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        error.message = `${filePath}:${index + 1}: ${error.message}`;
        throw error;
      }
    });
}

function typeList(actions) {
  return Array.from(new Set((Array.isArray(actions) ? actions : [])
    .map((action) => action?.type || action?.name || "")
    .filter(Boolean)));
}

function hasIntersection(actual, expected) {
  return expected.some((type) => actual.includes(type));
}

function collectRejectedReasons(data) {
  const reasons = [];
  const direct = data?.actionPolicy?.rejected || data?.trace?.rejected || [];
  if (Array.isArray(direct)) {
    for (const item of direct) {
      const reason = typeof item === "string" ? item : item?.reason;
      if (reason) reasons.push(reason);
    }
  }
  const stages = data?.actionTrace?.pipelineStages || data?.trace?.pipelineStages || [];
  if (Array.isArray(stages)) {
    for (const stage of stages) {
      for (const item of Array.isArray(stage?.rejected) ? stage.rejected : []) {
        if (item?.reason) reasons.push(item.reason);
      }
    }
  }
  return Array.from(new Set(reasons));
}

function evaluateResult(data, expected = {}) {
  const actions = Array.isArray(data.actions) ? data.actions : [];
  const actual = typeList(actions);
  const failures = [];
  if (Array.isArray(expected.all)) {
    const missing = expected.all.filter((type) => !actual.includes(type));
    if (missing.length) failures.push(`expected all of [${expected.all.join(", ")}], missing [${missing.join(", ")}]`);
  }
  if (Array.isArray(expected.any) && expected.any.length && !hasIntersection(actual, expected.any)) {
    failures.push(`expected any of [${expected.any.join(", ")}], got [${actual.join(", ")}]`);
  }
  if (Array.isArray(expected.none)) {
    const forbidden = expected.none.filter((type) => actual.includes(type));
    if (forbidden.length) failures.push(`forbidden action types present [${forbidden.join(", ")}]`);
  }
  if (Number.isFinite(expected.exactCount) && actions.length !== expected.exactCount) {
    failures.push(`expected exactly ${expected.exactCount} actions, got ${actions.length}`);
  }
  if (Number.isFinite(expected.minCount) && actions.length < expected.minCount) {
    failures.push(`expected at least ${expected.minCount} actions, got ${actions.length}`);
  }
  if (Number.isFinite(expected.maxCount) && actions.length > expected.maxCount) {
    failures.push(`expected at most ${expected.maxCount} actions, got ${actions.length}`);
  }
  if (Number.isFinite(expected.minReplyChars) && String(data.reply || "").length < expected.minReplyChars) {
    failures.push(`expected reply length >= ${expected.minReplyChars}, got ${String(data.reply || "").length}`);
  }
  if (expected.taskType) {
    const taskType = data.actionPolicy?.taskType || data.actionTrace?.intent?.taskType || data.trace?.intent?.taskType || "";
    if (taskType !== expected.taskType) failures.push(`expected taskType ${expected.taskType}, got ${taskType || "<empty>"}`);
  }
  if (Array.isArray(expected.taskTypeOneOf) && expected.taskTypeOneOf.length) {
    const taskType = data.actionPolicy?.taskType || data.actionTrace?.intent?.taskType || data.trace?.intent?.taskType || "";
    if (!expected.taskTypeOneOf.includes(taskType)) failures.push(`expected taskType one of [${expected.taskTypeOneOf.join(", ")}], got ${taskType || "<empty>"}`);
  }
  if (Array.isArray(expected.rejectedReasons) && expected.rejectedReasons.length) {
    const rejectedReasons = collectRejectedReasons(data);
    const missingReasons = expected.rejectedReasons.filter((reason) => !rejectedReasons.includes(reason));
    if (missingReasons.length) failures.push(`expected rejected reasons [${missingReasons.join(", ")}], got [${rejectedReasons.join(", ")}]`);
  }
  if (Array.isArray(expected.replyIncludes) && expected.replyIncludes.length) {
    const reply = String(data.reply || data.message || data.rawText || "");
    const missing = expected.replyIncludes.filter((value) => !reply.includes(value));
    if (missing.length) failures.push(`expected reply to include [${missing.join(", ")}]`);
  }
  return { actions, actual, failures };
}

function parseSseFinal(text) {
  let currentEvent = "message";
  let currentData = [];
  let finalPayload = null;
  let reply = "";
  let errorPayload = null;
  const flush = () => {
    if (!currentData.length) return;
    const raw = currentData.join("\n");
    let parsed = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { rawText: raw };
    }
    if (currentEvent === "reply") reply += String(parsed.delta || "");
    if (currentEvent === "final") finalPayload = parsed;
    if (currentEvent === "error") errorPayload = parsed;
    currentEvent = "message";
    currentData = [];
  };
  for (const line of String(text || "").split(/\r?\n/)) {
    if (!line.trim()) {
      flush();
      continue;
    }
    if (line.startsWith("event:")) {
      currentEvent = line.slice(6).trim() || "message";
    } else if (line.startsWith("data:")) {
      currentData.push(line.slice(5).trimStart());
    }
  }
  flush();
  if (finalPayload) return { ...finalPayload, streamedReply: reply || finalPayload.reply || "" };
  if (errorPayload) return { ...errorPayload, reply, streamError: errorPayload.error || "stream error" };
  return { rawText: text, reply };
}

async function postChat(payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    const text = await response.text();
    if (payload.stream === true) {
      return { response, data: parseSseFinal(text) };
    }
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { rawText: text };
    }
    return { response, data };
  } finally {
    clearTimeout(timer);
  }
}

async function runFixture(fixture) {
  const startedAt = Date.now();
  const payload = {
    message: fixture.message,
    language: fixture.lang || "zh",
    thinkingMode: fixture.thinkingMode || "no-thinking",
    selectedContext: fixture.selectedContext || null,
    canvas: fixture.canvas || { nodes: [], links: [] },
    analysis: fixture.analysis || {},
    messages: fixture.messages || [],
    stream: fixture.stream === true,
    systemContext: fixture.systemContext || "",
    chatAttachments: fixture.chatAttachments || fixture.attachments || []
  };
  if (fixture.imageDataUrl) payload.imageDataUrl = fixture.imageDataUrl;
  if (Array.isArray(fixture.imageDataUrls)) payload.imageDataUrls = fixture.imageDataUrls;
  if (fixture.videoDataUrl) payload.videoDataUrl = fixture.videoDataUrl;
  if (fixture.sessionId) payload.sessionId = fixture.sessionId;
  if (fixture.previousResponseId) payload.previousResponseId = fixture.previousResponseId;
  if (fixture.agentSkill) payload.agentSkill = fixture.agentSkill;
  if (fixture.agentMode === true) payload.agentMode = true;
  if (fixture.subagentsEnabled === true) payload.subagentsEnabled = true;
  Object.assign(payload, fixture.payload && typeof fixture.payload === "object" ? fixture.payload : {});
  const { response, data } = await postChat(payload);
  const evaluated = response.ok ? evaluateResult(data, fixture.expected || {}) : { actions: [], actual: [], failures: [`HTTP ${response.status}`] };
  return {
    id: fixture.id,
    category: fixture.category,
    status: response.status,
    ok: response.ok,
    latencyMs: Date.now() - startedAt,
    model: data.model || "",
    replySnippet: String(data.reply || data.message || data.rawText || "").slice(0, 500),
    actionTypes: evaluated.actual,
    actionCount: evaluated.actions.length,
    failures: evaluated.failures,
    taskType: data.actionPolicy?.taskType || data.actionTrace?.intent?.taskType || data.trace?.intent?.taskType || "",
    rejected: data.actionPolicy?.rejected || []
  };
}

const allFixtures = readJsonl(fixturePath);
const filteredFixtures = fixtureIdFilter.size
  ? allFixtures.filter((fixture) => fixtureIdFilter.has(fixture.id))
  : allFixtures;
const fixtures = maxFixtures > 0 ? filteredFixtures.slice(0, maxFixtures) : filteredFixtures;
if (!shouldRun) {
  console.log(`[chat-system] eval skipped (${fixtures.length} fixture(s)). Set RUN_CHAT_SYSTEM_EVALS=1 to call ${endpoint}.`);
  process.exit(0);
}

const results = [];
for (const fixture of fixtures) {
  console.log(`[chat-system] running ${fixture.id}`);
  results.push(await runFixture(fixture));
}
const failures = results.filter((item) => item.failures.length);
fs.mkdirSync(artifactDir, { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify({
  createdAt: new Date().toISOString(),
  endpoint,
  fixturePath,
  total: results.length,
  passed: results.length - failures.length,
  failed: failures.length,
  passRate: results.length ? (results.length - failures.length) / results.length : 0,
  averageLatencyMs: results.length ? Math.round(results.reduce((sum, item) => sum + item.latencyMs, 0) / results.length) : 0,
  results
}, null, 2)}\n`);

console.log(`[chat-system] report: ${reportPath}`);
console.log(`[chat-system] ${results.length - failures.length}/${results.length} passed`);
for (const failure of failures.slice(0, 8)) {
  console.log(`[chat-system] FAIL ${failure.id}: ${failure.failures.join("; ")} actions=[${failure.actionTypes.join(",")}] taskType=${failure.taskType}`);
}
if (failures.length) {
  assert.fail(`chat system eval failed (${failures.length}/${results.length}); report: ${reportPath}`);
}
