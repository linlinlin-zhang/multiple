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
const runId = process.env.CHAT_SYSTEM_EVAL_RUN_ID || new Date().toISOString().replace(/[:.]/g, "-");
const reportPath = process.env.CHAT_SYSTEM_EVAL_REPORT_PATH
  ? path.resolve(process.env.CHAT_SYSTEM_EVAL_REPORT_PATH)
  : path.join(artifactDir, "chat-system-eval-report.json");
const runReportPath = process.env.CHAT_SYSTEM_EVAL_RUN_REPORT_PATH
  ? path.resolve(process.env.CHAT_SYSTEM_EVAL_RUN_REPORT_PATH)
  : path.join(artifactDir, `chat-system-eval-report-${runId}.json`);
const progressPath = process.env.CHAT_SYSTEM_EVAL_PROGRESS_PATH
  ? path.resolve(process.env.CHAT_SYSTEM_EVAL_PROGRESS_PATH)
  : path.join(artifactDir, `chat-system-eval-progress-${runId}.ndjson`);
const endpoint = process.env.CHAT_SYSTEM_EVAL_ENDPOINT || "http://127.0.0.1:3000/api/chat";
const shouldRun = process.env.RUN_CHAT_SYSTEM_EVALS === "1";
const maxFixtures = Math.max(0, Math.min(Number(process.env.CHAT_SYSTEM_EVAL_MAX_FIXTURES) || 0, 100));
const trials = Math.max(1, Math.min(Number(process.env.CHAT_SYSTEM_EVAL_TRIALS) || 1, 10));
const fixtureIdFilter = new Set(String(process.env.CHAT_SYSTEM_EVAL_IDS || "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean));
const timeoutMs = Math.max(10000, Math.min(Number(process.env.CHAT_SYSTEM_EVAL_TIMEOUT_MS) || 180000, 300000));
const includeFullActions = process.env.CHAT_SYSTEM_EVAL_INCLUDE_ACTIONS !== "0";
const resumeRun = process.env.CHAT_SYSTEM_EVAL_RESUME === "1";

const CONTENT_CARD_TYPES = new Set([
  "create_card", "new_card", "create_direction", "create_web_card",
  "create_note", "create_plan", "create_todo", "create_weather",
  "create_map", "create_link", "create_code", "create_table",
  "create_timeline", "create_comparison", "create_metric", "create_quote"
]);
const STRUCTURED_REQUIRED_CARD_TYPES = new Set([
  "create_note", "create_plan", "create_todo", "create_weather",
  "create_map", "create_link", "create_code", "create_table",
  "create_timeline", "create_comparison", "create_metric", "create_quote"
]);
const EXECUTION_CARD_TYPES = new Set(["web_search", "image_search", "text_image_search", "reverse_image_search", "generate_image", "generate_video", "create_agent"]);
const GENERIC_TITLE_RE = /^(untitled|未命名|无标题|note|笔记|card|卡片|result|结果|plan|计划|todo|清单|table|表格|summary|总结|overview|概览|要点|内容|\d+|项目\s*\d+|item\s*\d+)$/i;
const PLACEHOLDER_RE = /(待补充|暂无|无具体|这里填写|placeholder|todo|tbd|n\/a|not specified|details are available|详细内容已写入画布卡片|从回答中抽取|supporting notes extracted)/i;

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

function plainText(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(plainText).filter(Boolean).join("\n");
  if (typeof value === "object") {
    return Object.entries(value)
      .filter(([key]) => !/^(id|nodeId|parentNodeId|anchorNodeId|url|faviconUrl|imageDataUrl)$/i.test(key))
      .map(([, item]) => plainText(item))
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

function compactText(value, max = 240) {
  return String(value || "")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function contentTextForAction(action = {}) {
  const content = action.content && typeof action.content === "object" ? action.content : null;
  return [
    plainText(content),
    action.description,
    action.prompt,
    action.query,
    action.deliverable,
    action.successCriteria
  ].map(plainText).filter(Boolean).join("\n");
}

function isGenericTitle(value) {
  const title = compactText(value, 120);
  if (!title) return true;
  if (GENERIC_TITLE_RE.test(title)) return true;
  if (/^(创建|生成|整理|保存成|帮我|请).{0,16}(卡片|节点)$/i.test(title)) return true;
  return false;
}

function usefulLength(value) {
  return compactText(value, 100000).replace(/[，。；：、,.!?！？\s]/g, "").length;
}

function normalizeSearchText(value) {
  return compactText(value, 100000)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[，。；：、,.!?！？"'“”‘’()（）[\]【】{}<>《》\-–—_/\\|]+/g, "");
}

function countUsefulItems(items, fields = ["title", "text", "description", "summary", "body", "value"]) {
  if (!Array.isArray(items)) return 0;
  return items.filter((item) => {
    if (typeof item === "string") return usefulLength(item) >= 8;
    if (Array.isArray(item)) return usefulLength(item.join(" ")) >= 8;
    if (!item || typeof item !== "object") return false;
    return fields.some((field) => usefulLength(item[field]) >= 8);
  }).length;
}

function addIssue(issues, condition, scorePenalty, message) {
  if (!condition) return 0;
  issues.push(message);
  return scorePenalty;
}

function evaluateActionQuality(action = {}, options = {}) {
  const type = String(action.type || action.name || "");
  const title = compactText(action.title || action.nodeName || action.target || action.query || action.prompt, 160);
  const content = action.content && typeof action.content === "object" ? action.content : {};
  const body = contentTextForAction(action);
  const bodyLength = usefulLength(body);
  const minContentChars = Number.isFinite(options.minContentChars) ? options.minContentChars : 120;
  const issues = [];
  let penalty = 0;
  penalty += addIssue(issues, !type, 45, "missing action type");
  penalty += addIssue(issues, isGenericTitle(title), 12, "generic or missing title");
  penalty += addIssue(issues, PLACEHOLDER_RE.test(body), 18, "placeholder or extraction-only wording");

  if (STRUCTURED_REQUIRED_CARD_TYPES.has(type)) {
    penalty += addIssue(issues, !action.content || typeof action.content !== "object", 28, "missing structured content object");
    penalty += addIssue(issues, bodyLength < minContentChars, bodyLength < 60 ? 30 : 18, `thin card content (${bodyLength} useful chars)`);
  }

  if (type === "create_note") {
    const sections = Array.isArray(content.sections) ? content.sections : [];
    const minNoteChars = Number.isFinite(options.minNoteChars) ? options.minNoteChars : 220;
    penalty += addIssue(issues, bodyLength < minNoteChars, bodyLength < 120 ? 32 : 20, `thin note body (${bodyLength} useful chars)`);
    penalty += addIssue(issues, sections.length > 0 && countUsefulItems(sections, ["title", "body", "text", "description"]) < sections.length, 12, "one or more note sections are shallow");
  } else if (type === "create_plan") {
    const steps = Array.isArray(content.steps) ? content.steps : [];
    penalty += addIssue(issues, countUsefulItems(steps, ["title", "description", "validation"]) < 3, 24, "plan has fewer than 3 useful steps");
    penalty += addIssue(issues, steps.length >= 3 && countUsefulItems(steps, ["description", "validation"]) < Math.ceil(steps.length / 2), 14, "most plan steps lack useful detail");
  } else if (type === "create_todo") {
    const items = Array.isArray(content.items) ? content.items : [];
    penalty += addIssue(issues, countUsefulItems(items, ["text", "title"]) < 4, 22, "todo has fewer than 4 useful items");
    penalty += addIssue(issues, items.length >= 4 && countUsefulItems(items, ["rationale", "priority"]) < Math.floor(items.length / 3), 8, "todo lacks priorities or rationale");
  } else if (type === "create_table") {
    const columns = Array.isArray(content.columns) ? content.columns : [];
    const rows = Array.isArray(content.rows) ? content.rows : [];
    penalty += addIssue(issues, columns.length < 2, 18, "table has fewer than 2 columns");
    penalty += addIssue(issues, rows.length < 3, 18, "table has fewer than 3 rows");
    penalty += addIssue(issues, rows.length >= 3 && countUsefulItems(rows, columns) < Math.ceil(rows.length / 2), 12, "table rows are shallow");
  } else if (type === "create_timeline") {
    penalty += addIssue(issues, countUsefulItems(content.items, ["title", "description", "time", "phase", "date"]) < 3, 22, "timeline has fewer than 3 useful items");
  } else if (type === "create_comparison") {
    const items = Array.isArray(content.items) ? content.items : [];
    penalty += addIssue(issues, countUsefulItems(items, ["title", "summary", "pros", "cons"]) < 2, 24, "comparison has fewer than 2 useful options");
    penalty += addIssue(issues, !usefulLength(content.recommendation) && countUsefulItems(content.criteria) < 2, 12, "comparison lacks criteria or recommendation");
  } else if (type === "create_metric") {
    penalty += addIssue(issues, countUsefulItems(content.metrics, ["label", "value", "note", "delta"]) < 2, 22, "metric card has fewer than 2 useful metrics");
  } else if (type === "create_quote") {
    const quotes = Array.isArray(content.quotes) ? content.quotes : [];
    penalty += addIssue(issues, countUsefulItems(quotes, ["text"]) < 2 && usefulLength(content.context) < 80, 20, "quote card lacks useful excerpts");
    penalty += addIssue(issues, quotes.length && countUsefulItems(quotes, ["source", "author", "url"]) === 0, 8, "quote card lacks source context");
  } else if (type === "create_code") {
    penalty += addIssue(issues, usefulLength(content.code) < 80, 24, "code card lacks substantial code");
    penalty += addIssue(issues, !content.language, 8, "code card lacks language");
  } else if (type === "create_web_card" || type === "create_link") {
    penalty += addIssue(issues, !(content.url || action.url), 26, "web card lacks URL");
    penalty += addIssue(issues, usefulLength(content.description || action.description) < 50, 16, "web card description is shallow");
  } else if (type === "create_direction") {
    penalty += addIssue(issues, usefulLength(action.prompt || action.description || body) < 80, 20, "direction card lacks a concrete visual brief");
  } else if (type === "generate_image" || type === "generate_video") {
    penalty += addIssue(issues, usefulLength(action.prompt || action.description) < 80, 22, "media generation prompt is shallow");
  } else if (type === "image_search" || type === "text_image_search" || type === "reverse_image_search" || type === "web_search") {
    penalty += addIssue(issues, usefulLength(action.query || action.prompt || action.description) < 24, 18, "search query is too vague");
  } else if (type === "create_agent") {
    penalty += addIssue(issues, usefulLength(action.prompt || action.description) < 100, 18, "agent prompt is shallow");
    penalty += addIssue(issues, usefulLength(action.deliverable) < 40, 12, "agent deliverable is vague");
    penalty += addIssue(issues, usefulLength(action.successCriteria) < 40, 12, "agent success criteria are vague");
  }

  const score = Math.max(0, Math.min(100, 100 - penalty));
  return {
    type,
    title,
    score,
    contentChars: bodyLength,
    issues,
    snippet: compactText(body, 320)
  };
}

function evaluateCardQuality(actions = [], expected = {}) {
  const config = expected.cardQuality;
  const evaluatedActions = actions.filter((action) => CONTENT_CARD_TYPES.has(action?.type) || EXECUTION_CARD_TYPES.has(action?.type));
  const cards = evaluatedActions.map((action) => evaluateActionQuality(action, config && typeof config === "object" ? config : {}));
  const failures = [];
  if (!config) return { cards, failures };
  const minCards = Number.isFinite(config.minCards) ? config.minCards : 0;
  const minContentCards = Number.isFinite(config.minContentCards) ? config.minContentCards : 0;
  const minAverageScore = Number.isFinite(config.minAverageScore) ? config.minAverageScore : 0;
  const minCardScore = Number.isFinite(config.minCardScore) ? config.minCardScore : 0;
  const contentCardCount = evaluatedActions.filter((action) => CONTENT_CARD_TYPES.has(action?.type)).length;
  const averageScore = cards.length ? cards.reduce((sum, card) => sum + card.score, 0) / cards.length : 0;
  if (cards.length < minCards) failures.push(`expected at least ${minCards} card-like actions for quality eval, got ${cards.length}`);
  if (contentCardCount < minContentCards) failures.push(`expected at least ${minContentCards} content card actions, got ${contentCardCount}`);
  if (minAverageScore && averageScore < minAverageScore) failures.push(`expected average card quality >= ${minAverageScore}, got ${averageScore.toFixed(1)}`);
  if (minCardScore) {
    const weak = cards.filter((card) => card.score < minCardScore);
    if (weak.length) failures.push(`card quality below ${minCardScore}: ${weak.map((card) => `${card.type}:${card.score}:${card.title || "<untitled>"}`).join("; ")}`);
  }
  if (config.noGenericTitles) {
    const generic = cards.filter((card) => isGenericTitle(card.title));
    if (generic.length) failures.push(`generic card titles: ${generic.map((card) => `${card.type}:${card.title || "<empty>"}`).join("; ")}`);
  }
  if (Array.isArray(config.keywords) && config.keywords.length) {
    const combined = normalizeSearchText(actions.map((action) => `${action?.title || ""}\n${contentTextForAction(action)}`).join("\n"));
    const missing = config.keywords.filter((keyword) => !combined.includes(normalizeSearchText(keyword)));
    if (missing.length) failures.push(`expected card content keywords missing [${missing.join(", ")}]`);
  }
  return {
    cards,
    averageScore,
    contentCardCount,
    failures
  };
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
  const quality = evaluateCardQuality(actions, expected);
  failures.push(...quality.failures);
  return { actions, actual, failures, quality };
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

async function runFixture(fixture, trial) {
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
  let response;
  let data;
  try {
    const result = await postChat(payload);
    response = result.response;
    data = result.data;
  } catch (error) {
    return {
      id: fixture.id,
      trial,
      category: fixture.category,
      status: 0,
      ok: false,
      latencyMs: Date.now() - startedAt,
      model: "",
      replySnippet: "",
      actionTypes: [],
      actionCount: 0,
      actions: includeFullActions ? [] : undefined,
      cardQuality: { averageScore: 0, contentCardCount: 0, cards: [] },
      failures: [`request failed or timed out: ${error?.name || "Error"} ${error?.message || String(error)}`],
      taskType: "",
      rejected: [],
      actionTraceId: "",
      contextBudget: undefined
    };
  }
  const httpErrorDetail = [data?.error, data?.message, data?.details, data?.rawText]
    .map((item) => plainText(item))
    .filter(Boolean)
    .join(" | ");
  const evaluated = response.ok
    ? evaluateResult(data, fixture.expected || {})
    : { actions: [], actual: [], failures: [`HTTP ${response.status}${httpErrorDetail ? `: ${compactText(httpErrorDetail, 500)}` : ""}`] };
  const quality = evaluated.quality || { cards: [], averageScore: 0, contentCardCount: 0, failures: [] };
  return {
    id: fixture.id,
    trial,
    category: fixture.category,
    status: response.status,
    ok: response.ok,
    latencyMs: Date.now() - startedAt,
    model: data.model || "",
    replySnippet: String(data.reply || data.message || data.rawText || "").slice(0, 500),
    actionTypes: evaluated.actual,
    actionCount: evaluated.actions.length,
    actions: includeFullActions ? evaluated.actions : undefined,
    cardQuality: {
      averageScore: Number.isFinite(quality.averageScore) ? Number(quality.averageScore.toFixed(1)) : undefined,
      contentCardCount: quality.contentCardCount,
      cards: quality.cards
    },
    failures: evaluated.failures,
    taskType: data.actionPolicy?.taskType || data.actionTrace?.intent?.taskType || data.trace?.intent?.taskType || "",
    rejected: data.actionPolicy?.rejected || [],
    actionTraceId: data.actionTrace?.traceId || data.trace?.traceId || "",
    contextBudget: data.contextBudget ? {
      tier: data.contextBudget.tier,
      reduced: data.contextBudget.reduced,
      droppedImages: data.contextBudget.droppedImages,
      droppedVideo: data.contextBudget.droppedVideo,
      compactedText: data.contextBudget.compactedText
    } : undefined
  };
}

function actionSignature(result) {
  return (result.actionTypes || []).slice().sort().join("+") || "<none>";
}

function summarizeByFixture(results, fixtures) {
  return fixtures.map((fixture) => {
    const runs = results.filter((item) => item.id === fixture.id);
    const signatures = runs.map(actionSignature);
    const signatureCounts = new Map();
    for (const signature of signatures) {
      signatureCounts.set(signature, (signatureCounts.get(signature) || 0) + 1);
    }
    const mostCommonSignatureCount = Math.max(0, ...signatureCounts.values());
    return {
      id: fixture.id,
      category: fixture.category,
      runs: runs.length,
      passAt1: runs[0] ? runs[0].failures.length === 0 : false,
      passed: runs.filter((item) => !item.failures.length).length,
      failed: runs.filter((item) => item.failures.length).length,
      consistency: runs.length ? mostCommonSignatureCount / runs.length : 0,
      averageCardQuality: runs.length
        ? Number((runs.reduce((sum, item) => sum + (Number(item.cardQuality?.averageScore) || 0), 0) / runs.length).toFixed(1))
        : 0,
      signatures: Object.fromEntries(signatureCounts)
    };
  });
}

const allFixtures = readJsonl(fixturePath);
const filteredFixtures = fixtureIdFilter.size
  ? allFixtures.filter((fixture) => fixtureIdFilter.has(fixture.id))
  : allFixtures;
const fixtures = maxFixtures > 0 ? filteredFixtures.slice(0, maxFixtures) : filteredFixtures;
if (!shouldRun) {
  console.log(`[chat-system] eval skipped (${fixtures.length} fixture(s), ${trials} trial(s)). Set RUN_CHAT_SYSTEM_EVALS=1 to call ${endpoint}.`);
  process.exit(0);
}

fs.mkdirSync(artifactDir, { recursive: true });
const results = [];
const completed = new Set();
if (resumeRun && fs.existsSync(progressPath)) {
  const progressLines = fs.readFileSync(progressPath, "utf8")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  for (const line of progressLines) {
    try {
      const result = JSON.parse(line);
      if (!result?.id || !result?.trial) continue;
      results.push(result);
      completed.add(`${result.id}#${result.trial}`);
    } catch (error) {
      console.warn(`[chat-system] ignored invalid progress line: ${error?.message || error}`);
    }
  }
  console.log(`[chat-system] resume loaded ${results.length} completed run(s) from ${progressPath}`);
} else {
  fs.writeFileSync(progressPath, "");
}
for (const fixture of fixtures) {
  for (let trial = 1; trial <= trials; trial += 1) {
    const key = `${fixture.id}#${trial}`;
    if (completed.has(key)) {
      console.log(`[chat-system] skipping completed ${fixture.id} trial ${trial}/${trials}`);
      continue;
    }
    console.log(`[chat-system] running ${fixture.id} trial ${trial}/${trials}`);
    const result = await runFixture(fixture, trial);
    results.push(result);
    completed.add(key);
    fs.appendFileSync(progressPath, `${JSON.stringify(result)}\n`);
  }
}
const failures = results.filter((item) => item.failures.length);
const perFixture = summarizeByFixture(results, fixtures);
const passAt1Count = perFixture.filter((item) => item.passAt1).length;
const averageConsistency = perFixture.length
  ? perFixture.reduce((sum, item) => sum + item.consistency, 0) / perFixture.length
  : 0;
const qualityRuns = results.filter((item) => Array.isArray(item.cardQuality?.cards) && item.cardQuality.cards.length);
const averageCardQuality = qualityRuns.length
  ? qualityRuns.reduce((sum, item) => sum + (Number(item.cardQuality.averageScore) || 0), 0) / qualityRuns.length
  : 0;
const finalReport = {
  createdAt: new Date().toISOString(),
  runId,
  endpoint,
  fixturePath,
  progressPath,
  totalFixtures: fixtures.length,
  trials,
  total: results.length,
  passed: results.length - failures.length,
  failed: failures.length,
  passRate: results.length ? (results.length - failures.length) / results.length : 0,
  passAt1: perFixture.length ? passAt1Count / perFixture.length : 0,
  averageConsistency,
  averageCardQuality: Number(averageCardQuality.toFixed(1)),
  averageLatencyMs: results.length ? Math.round(results.reduce((sum, item) => sum + item.latencyMs, 0) / results.length) : 0,
  perFixture,
  results
};
const finalReportJson = `${JSON.stringify(finalReport, null, 2)}\n`;
fs.writeFileSync(reportPath, finalReportJson);
if (runReportPath !== reportPath) fs.writeFileSync(runReportPath, finalReportJson);

console.log(`[chat-system] report: ${reportPath}`);
console.log(`[chat-system] run report: ${runReportPath}`);
console.log(`[chat-system] progress: ${progressPath}`);
console.log(`[chat-system] ${results.length - failures.length}/${results.length} passed`);
console.log(`[chat-system] pass@1=${passAt1Count}/${perFixture.length} consistency=${averageConsistency.toFixed(2)} cardQuality=${averageCardQuality.toFixed(1)}`);
for (const failure of failures.slice(0, 8)) {
  console.log(`[chat-system] FAIL ${failure.id}: ${failure.failures.join("; ")} actions=[${failure.actionTypes.join(",")}] taskType=${failure.taskType}`);
  for (const card of (failure.cardQuality?.cards || []).filter((item) => item.issues?.length).slice(0, 3)) {
    console.log(`[chat-system]   CARD ${card.type} score=${card.score} title=${card.title || "<empty>"} issues=${card.issues.join(" | ")}`);
  }
}
if (failures.length) {
  assert.fail(`chat system eval failed (${failures.length}/${results.length}); report: ${reportPath}`);
}
