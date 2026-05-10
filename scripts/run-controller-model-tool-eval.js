import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const DEFAULT_FIXTURE_PATH = path.join(__dirname, "evals", "controller-model-tool-eval.jsonl");
const fixturePath = process.argv[2] || DEFAULT_FIXTURE_PATH;
const artifactDir = process.env.CONTROLLER_MODEL_EVAL_ARTIFACT_DIR
  ? path.resolve(process.env.CONTROLLER_MODEL_EVAL_ARTIFACT_DIR)
  : path.join(__dirname, "evals", "artifacts");
const reportPath = path.join(artifactDir, "controller-model-tool-eval-report.json");
const shouldRun = process.env.RUN_CONTROLLER_MODEL_EVALS === "1";
const timeoutMs = Math.max(10000, Math.min(Number(process.env.CONTROLLER_MODEL_EVAL_TIMEOUT_MS) || 120000, 300000));
const maxFixtures = Math.max(0, Math.min(Number(process.env.CONTROLLER_MODEL_EVAL_MAX_FIXTURES) || 0, 100));

const CANDIDATE_PREFIXES = ["BASELINE", "MIMO", "KIMI", "DEEPSEEK"];
const ACTION_TYPES = [
  "create_note",
  "create_plan",
  "create_todo",
  "create_table",
  "create_timeline",
  "create_comparison",
  "create_metric",
  "create_quote",
  "create_code",
  "create_web_card",
  "create_link",
  "web_search",
  "image_search",
  "text_image_search",
  "reverse_image_search",
  "generate_image",
  "generate_video",
  "arrange_canvas",
  "auto_layout",
  "tidy_canvas",
  "delete_node"
];

loadDotEnv(path.join(projectRoot, ".env"));

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

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

function parseOptions(raw) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function candidateFromPrefix(prefix) {
  const root = `CONTROLLER_MODEL_CANDIDATE_${prefix}`;
  const provider = process.env[`${root}_PROVIDER`] || "openai-compatible";
  const baseUrl = normalizeOpenAiCompatibleBaseUrl(process.env[`${root}_API_BASE_URL`] || "");
  const rawModel = process.env[`${root}_MODEL`] || "";
  const model = rawModel === "MiMo-V2.5-Pro" ? "mimo-v2.5-pro" : rawModel;
  const explicitKey = process.env[`${root}_API_KEY`] || "";
  const apiKey = explicitKey
    || (prefix === "BASELINE" || provider === "dashscope-qwen" ? (process.env.CHAT_API_KEY || process.env.DASHSCOPE_API_KEY || "") : "");
  return {
    id: prefix.toLowerCase(),
    provider,
    baseUrl,
    model,
    apiKey,
    options: parseOptions(process.env[`${root}_OPTIONS`] || "")
  };
}

function normalizeOpenAiCompatibleBaseUrl(value) {
  return String(value || "")
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/chat\/completions$/i, "");
}

function configuredCandidates() {
  return CANDIDATE_PREFIXES.map(candidateFromPrefix)
    .filter((candidate) => candidate.baseUrl && candidate.model && candidate.apiKey);
}

function buildCanvasTool() {
  return {
    type: "function",
    function: {
      name: "canvas_action",
      description: "Create exactly the canvas action(s) that match the user's intent. Do not create canvas actions for text-only/no-canvas requests.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["actions"],
        properties: {
          actions: {
            type: "array",
            maxItems: 5,
            items: {
              type: "object",
              additionalProperties: true,
              required: ["type", "title"],
              properties: {
                type: { type: "string", enum: ACTION_TYPES },
                title: { type: "string" },
                description: { type: "string" },
                prompt: { type: "string" },
                query: { type: "string" },
                content: { type: "object" },
                nodeId: { type: "string" },
                nodeName: { type: "string" }
              }
            }
          }
        }
      }
    }
  };
}

function buildMessages(fixture) {
  return [
    {
      role: "system",
      content: [
        "你是 ThoughtGrid 的画布动作路由器。",
        "判断用户是否需要画布动作；需要时调用 canvas_action 工具，不需要时只用文字回答。",
        "单张照片点评优先 create_note/create_metric；多张照片比较才用 create_comparison。",
        "明确成图请求必须用 generate_image；明确找参考图用 image_search；明确不要卡片/只要文字时不要调用工具。",
        "回答保持简短，重点是正确选择工具。"
      ].join("\n")
    },
    { role: "user", content: fixture.message }
  ];
}

function requestBody(candidate, fixture) {
  const options = candidate.options || {};
  const body = {
    model: candidate.model,
    messages: buildMessages(fixture),
    tools: [buildCanvasTool()],
    tool_choice: "auto",
    max_tokens: Number(options.max_tokens) || 4096,
    temperature: /kimi/i.test(candidate.provider) || /moonshot/i.test(candidate.baseUrl) ? 0.6 : 0.2
  };
  if (/kimi/i.test(candidate.provider) || /moonshot/i.test(candidate.baseUrl)) {
    body.thinking = { type: "disabled" };
  }
  return body;
}

async function postJson(url, apiKey, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { rawText: text };
    }
    return { status: response.status, ok: response.ok, data };
  } finally {
    clearTimeout(timer);
  }
}

function parseToolActions(data) {
  const choices = Array.isArray(data?.choices) ? data.choices : [];
  const actions = [];
  for (const choice of choices) {
    const calls = choice?.message?.tool_calls || [];
    for (const call of calls) {
      const name = call?.function?.name || "";
      if (name !== "canvas_action") continue;
      let args = {};
      try {
        args = JSON.parse(call?.function?.arguments || "{}");
      } catch {
        args = {};
      }
      if (Array.isArray(args.actions)) actions.push(...args.actions);
      else if (args.type) actions.push(args);
    }
  }
  return actions.filter((action) => action?.type);
}

function typeList(actions) {
  return Array.from(new Set((actions || []).map((action) => action?.type).filter(Boolean)));
}

function hasIntersection(actual, expected) {
  return expected.some((type) => actual.includes(type));
}

function evaluate(actions, expected = {}) {
  const actual = typeList(actions);
  const failures = [];
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
  return { actual, failures };
}

async function runOne(candidate, fixture) {
  const startedAt = Date.now();
  const url = `${candidate.baseUrl}/chat/completions`;
  const body = requestBody(candidate, fixture);
  const response = await postJson(url, candidate.apiKey, body);
  const actions = response.ok ? parseToolActions(response.data) : [];
  const { actual, failures } = response.ok ? evaluate(actions, fixture.expected || {}) : { actual: [], failures: [`HTTP ${response.status}`] };
  const message = response.data?.choices?.[0]?.message || {};
  return {
    fixtureId: fixture.id,
    category: fixture.category,
    status: response.status,
    ok: response.ok,
    latencyMs: Date.now() - startedAt,
    actualActionTypes: actual,
    actionCount: actions.length,
    failures,
    finishReason: response.data?.choices?.[0]?.finish_reason || "",
    contentSnippet: String(message.content || "").slice(0, 300),
    error: response.ok ? undefined : response.data?.error || response.data
  };
}

async function runCandidate(candidate, fixtures) {
  const runs = [];
  for (const fixture of fixtures) {
    runs.push(await runOne(candidate, fixture));
  }
  const passed = runs.filter((run) => !run.failures.length).length;
  return {
    id: candidate.id,
    provider: candidate.provider,
    baseUrl: candidate.baseUrl,
    model: candidate.model,
    total: runs.length,
    passed,
    failed: runs.length - passed,
    passRate: runs.length ? passed / runs.length : 0,
    averageLatencyMs: runs.length ? Math.round(runs.reduce((sum, run) => sum + run.latencyMs, 0) / runs.length) : 0,
    runs
  };
}

const fixturesAll = readJsonl(fixturePath);
const fixtures = maxFixtures > 0 ? fixturesAll.slice(0, maxFixtures) : fixturesAll;
const candidates = configuredCandidates();
if (!shouldRun) {
  console.log(`[eval] controller model tool eval skipped (${candidates.length} configured candidate(s), ${fixtures.length} fixture(s)). Set RUN_CONTROLLER_MODEL_EVALS=1 to run.`);
  process.exit(0);
}
if (!candidates.length) {
  assert.fail("No configured controller model candidates found. Fill CONTROLLER_MODEL_CANDIDATE_*_API_BASE_URL/MODEL/API_KEY in .env.");
}

const results = [];
for (const candidate of candidates) {
  console.log(`[eval] running ${candidate.id}: ${candidate.model} @ ${candidate.baseUrl}`);
  results.push(await runCandidate(candidate, fixtures));
}
results.sort((a, b) => b.passRate - a.passRate || a.averageLatencyMs - b.averageLatencyMs);
fs.mkdirSync(artifactDir, { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify({
  createdAt: new Date().toISOString(),
  fixturePath,
  totalFixtures: fixtures.length,
  candidates: results.map((item) => ({
    id: item.id,
    provider: item.provider,
    baseUrl: item.baseUrl,
    model: item.model,
    total: item.total,
    passed: item.passed,
    failed: item.failed,
    passRate: item.passRate,
    averageLatencyMs: item.averageLatencyMs
  })),
  results
}, null, 2)}\n`);

console.log(`[eval] controller model tool eval report: ${reportPath}`);
for (const item of results) {
  console.log(`[eval] ${item.id}: ${item.passed}/${item.total} passRate=${item.passRate.toFixed(2)} avgLatencyMs=${item.averageLatencyMs}`);
  const firstFailure = item.runs.find((run) => run.failures.length);
  if (firstFailure) console.log(`[eval] first failure ${item.id}/${firstFailure.fixtureId}: ${firstFailure.failures.join("; ")}`);
}
