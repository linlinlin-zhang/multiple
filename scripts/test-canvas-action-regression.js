import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  compactPipelineActionTypes,
  finalizeCanvasActions
} from "../src/lib/canvasActionPipeline.js";
import {
  buildCanvasActionPolicy,
  filterCanvasActionsByPolicy,
  summarizeCanvasActionPolicy
} from "../src/lib/canvasActionPolicy.js";
import { ensureCommittedCanvasActions } from "../src/lib/canvasActionReliability.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_FIXTURE_PATH = path.join(__dirname, "evals", "canvas-action-regression.jsonl");
const fixturePath = process.argv[2] || DEFAULT_FIXTURE_PATH;
const artifactDir = process.env.CANVAS_ACTION_EVAL_ARTIFACT_DIR
  ? path.resolve(process.env.CANVAS_ACTION_EVAL_ARTIFACT_DIR)
  : path.join(__dirname, "evals", "artifacts");
const failureArtifactPath = path.join(artifactDir, "canvas-action-regression-failures.json");

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

function typeList(actions = []) {
  return compactPipelineActionTypes(actions);
}

function compactPolicyTrace(policyTraces = []) {
  const list = Array.isArray(policyTraces) ? policyTraces.filter(Boolean) : [];
  const final = list[list.length - 1] || {};
  return {
    taskType: final.taskType || "",
    confidence: final.confidence,
    automaticCardMode: Boolean(final.automaticCardMode),
    allowCanvasTool: final.allowCanvasTool,
    maxActions: final.maxActions,
    allowedActionTypes: final.allowedActionTypes || [],
    proposedActionTypes: Array.from(new Set(list.flatMap((item) => item.proposedActionTypes || []))),
    finalActionTypes: final.finalActionTypes || [],
    rejected: list.flatMap((item) => item.rejected || []).slice(0, 16),
    events: list.flatMap((item) => item.events || []).slice(-28)
  };
}

function buildRegressionDependencies(fixture) {
  return {
    normalizeActions: (raw) => Array.isArray(raw) ? raw : [],
    applyPolicy: ({ actions, message, context, stage }) => {
      const policy = buildCanvasActionPolicy(message, {
        agentMode: Boolean(fixture.agentMode),
        thinkingMode: context.thinkingMode || fixture.thinkingMode || "no-thinking",
        selectedContext: fixture.selectedContext || null,
        canvas: fixture.canvas || {}
      });
      const result = filterCanvasActionsByPolicy(actions, policy);
      context.policyTraces.push(summarizeCanvasActionPolicy(policy, {
        proposed: actions,
        final: result.actions,
        rejected: result.rejected,
        loop: result.loop,
        stage
      }));
      return result.actions;
    },
    ensureMediaGenerationActions: ({ actions }) => actions,
    ensureCommittedCanvasActions: ({ message, actions, reply, analysis, lang, maxActions }) => ensureCommittedCanvasActions({
      message,
      actions,
      reply,
      analysis,
      lang,
      maxActions
    }),
    cleanupFallbackActions: ({ actions }) => actions,
    mergeReferenceActions: ({ actions }) => actions,
    enrichActions: ({ actions }) => actions,
    finalizeAgentActions: ({ actions, agentMode }) => (
      agentMode ? actions : actions.filter((action) => action?.type !== "create_agent")
    ),
    ensureAutomaticSmartCardActions: ({ actions, message, reply, lang }) => {
      if (actions.length) return actions;
      if (!fixture.autoSmartCard) return actions;
      const policy = buildCanvasActionPolicy(message, { thinkingMode: fixture.thinkingMode || "no-thinking" });
      const intent = policy.intent || {};
      if (intent.noCanvas || intent.trivial) return actions;
      const title = fixture.autoSmartCardTitle || (lang === "en" ? "Recovered canvas card" : "补齐的画布卡片");
      if (intent.visualEvaluation || intent.directAnalysis) {
        return [{
          type: "create_comparison",
          title,
          content: {
            items: [{ title: lang === "en" ? "Result" : "结论", summary: String(reply || message || title).slice(0, 420) }]
          }
        }];
      }
      if (intent.planning || intent.structuredDeliverable) {
        return [{
          type: "create_plan",
          title,
          content: {
            summary: String(reply || message || title).slice(0, 700),
            steps: [{ title: lang === "en" ? "Next step" : "下一步", description: String(reply || message || title).slice(0, 700) }]
          }
        }];
      }
      return [{
        type: "create_note",
        title,
        content: { text: String(reply || message || title).slice(0, 1000) }
      }];
    },
    compactActionPolicyTrace: compactPolicyTrace
  };
}

function runFixture(fixture) {
  return finalizeCanvasActions({
    rawActions: fixture.mockRawActions || fixture.rawActions || [],
    message: fixture.message || "",
    reply: fixture.mockReply || fixture.reply || "",
    response: fixture.mockResponse || null,
    lang: fixture.lang || "zh",
    thinkingMode: fixture.thinkingMode || "no-thinking",
    agentMode: Boolean(fixture.agentMode),
    selectedContext: fixture.selectedContext || null,
    canvas: fixture.canvas || {},
    analysis: fixture.analysis || {},
    webSearchEnabled: Boolean(fixture.webSearchEnabled),
    maxActions: fixture.maxActions || 8,
    traceId: fixture.id,
    model: fixture.model || "deterministic-fixture",
    provider: "local-eval",
    inlineActions: fixture.mockInlineActions || [],
    thinkingMentionedActionTypes: fixture.thinkingMentionedActionTypes || [],
    dependencies: buildRegressionDependencies(fixture)
  });
}

function hasIntersection(actual, expected) {
  return expected.some((type) => actual.includes(type));
}

function hasOwnPath(value, pathExpression) {
  return getPath(value, pathExpression).exists;
}

function getPath(value, pathExpression) {
  const parts = String(pathExpression || "").split(".").filter(Boolean);
  let current = value;
  for (const part of parts) {
    if (!current || typeof current !== "object" || !(part in current)) return { exists: false, value: undefined };
    current = current[part];
  }
  return { exists: true, value: current };
}

function flattenText(value) {
  const chunks = [];
  const walk = (item) => {
    if (item === null || item === undefined) return;
    if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
      chunks.push(String(item));
      return;
    }
    if (Array.isArray(item)) {
      item.forEach(walk);
      return;
    }
    if (typeof item === "object") {
      Object.values(item).forEach(walk);
    }
  };
  walk(value);
  return chunks.join("\n");
}

function regexFromPattern(pattern) {
  if (pattern instanceof RegExp) return pattern;
  const text = String(pattern || "");
  const match = text.match(/^\/([\s\S]*)\/([a-z]*)$/i);
  if (match) return new RegExp(match[1], match[2]);
  return new RegExp(text, "i");
}

function textMatchesAny(text, patterns = []) {
  return patterns
    .map(regexFromPattern)
    .filter((regex) => regex.test(text))
    .map((regex) => regex.toString());
}

function actionsByType(actions, type) {
  return actions.filter((action) => action?.type === type);
}

function actionUserFacingText(actions) {
  return flattenText((actions || []).map((action) => ({
    title: action?.title,
    description: action?.description,
    prompt: action?.prompt,
    query: action?.query,
    url: action?.url,
    role: action?.role,
    deliverable: action?.deliverable,
    successCriteria: action?.successCriteria,
    content: action?.content
  })));
}

function assertFixture(fixture) {
  const result = runFixture(fixture);
  const actual = typeList(result.actions);
  const expected = fixture.expected || {};
  const failures = [];

  if (expected.taskType && result.actionPolicy?.taskType !== expected.taskType) {
    failures.push(`expected taskType=${expected.taskType}, got ${result.actionPolicy?.taskType || "unknown"}`);
  }
  if (Array.isArray(expected.any) && expected.any.length && !hasIntersection(actual, expected.any)) {
    failures.push(`expected any of [${expected.any.join(", ")}], got [${actual.join(", ")}]`);
  }
  if (Array.isArray(expected.all)) {
    const missing = expected.all.filter((type) => !actual.includes(type));
    if (missing.length) failures.push(`missing expected action types [${missing.join(", ")}], got [${actual.join(", ")}]`);
  }
  if (Array.isArray(expected.none)) {
    const forbidden = expected.none.filter((type) => actual.includes(type));
    if (forbidden.length) failures.push(`forbidden action types present [${forbidden.join(", ")}]`);
  }
  if (Number.isFinite(expected.minCount) && actual.length < expected.minCount) {
    failures.push(`expected at least ${expected.minCount} actions, got ${actual.length}`);
  }
  if (Number.isFinite(expected.maxCount) && actual.length > expected.maxCount) {
    failures.push(`expected at most ${expected.maxCount} actions, got ${actual.length}`);
  }
  if (Number.isFinite(expected.exactCount) && actual.length !== expected.exactCount) {
    failures.push(`expected exactly ${expected.exactCount} actions, got ${actual.length}`);
  }
  if (expected.countByType && typeof expected.countByType === "object") {
    for (const [type, count] of Object.entries(expected.countByType)) {
      const actualCount = actual.filter((item) => item === type).length;
      if (actualCount !== count) failures.push(`expected ${count} ${type} actions, got ${actualCount}`);
    }
  }
  if (Array.isArray(expected.stageNames)) {
    const stageNames = result.stages.map((stage) => stage.name);
    const missing = expected.stageNames.filter((name) => !stageNames.includes(name));
    if (missing.length) failures.push(`missing pipeline stages [${missing.join(", ")}]`);
  }
  if (Array.isArray(expected.rejectedReasons)) {
    const rejectedReasons = (result.actionPolicy?.rejected || []).map((item) => item.reason).filter(Boolean);
    const missing = expected.rejectedReasons.filter((reason) => !rejectedReasons.includes(reason));
    if (missing.length) failures.push(`missing rejection reasons [${missing.join(", ")}], got [${rejectedReasons.join(", ")}]`);
  }
  if (expected.contentFields && typeof expected.contentFields === "object") {
    for (const [type, fields] of Object.entries(expected.contentFields)) {
      const action = result.actions.find((item) => item?.type === type);
      if (!action) {
        failures.push(`missing ${type} action for content field checks`);
        continue;
      }
      const missing = fields.filter((field) => !hasOwnPath(action.content, field));
      if (missing.length) failures.push(`${type} missing content fields [${missing.join(", ")}]`);
    }
  }
  if (expected.actionFields && typeof expected.actionFields === "object") {
    for (const [type, fields] of Object.entries(expected.actionFields)) {
      const action = result.actions.find((item) => item?.type === type);
      if (!action) {
        failures.push(`missing ${type} action for action field checks`);
        continue;
      }
      const missing = fields.filter((field) => !getPath(action, field).exists);
      if (missing.length) failures.push(`${type} missing action fields [${missing.join(", ")}]`);
    }
  }
  if (expected.absentContentFields && typeof expected.absentContentFields === "object") {
    for (const [type, fields] of Object.entries(expected.absentContentFields)) {
      const action = result.actions.find((item) => item?.type === type);
      if (!action) continue;
      const present = fields.filter((field) => hasOwnPath(action.content, field));
      if (present.length) failures.push(`${type} should not include content fields [${present.join(", ")}]`);
    }
  }
  if (expected.minArrayLength && typeof expected.minArrayLength === "object") {
    for (const [type, checks] of Object.entries(expected.minArrayLength)) {
      const action = result.actions.find((item) => item?.type === type);
      if (!action) {
        failures.push(`missing ${type} action for array length checks`);
        continue;
      }
      for (const [pathExpression, minLength] of Object.entries(checks || {})) {
        const resolved = getPath(action, pathExpression);
        const actualLength = Array.isArray(resolved.value) ? resolved.value.length : -1;
        if (actualLength < minLength) failures.push(`${type}.${pathExpression} expected length >= ${minLength}, got ${actualLength}`);
      }
    }
  }
  if (expected.exactArrayLength && typeof expected.exactArrayLength === "object") {
    for (const [type, checks] of Object.entries(expected.exactArrayLength)) {
      const action = result.actions.find((item) => item?.type === type);
      if (!action) {
        failures.push(`missing ${type} action for exact array length checks`);
        continue;
      }
      for (const [pathExpression, exactLength] of Object.entries(checks || {})) {
        const resolved = getPath(action, pathExpression);
        const actualLength = Array.isArray(resolved.value) ? resolved.value.length : -1;
        if (actualLength !== exactLength) failures.push(`${type}.${pathExpression} expected length ${exactLength}, got ${actualLength}`);
      }
    }
  }
  if (expected.textIncludes && typeof expected.textIncludes === "object") {
    for (const [type, snippets] of Object.entries(expected.textIncludes)) {
      const text = actionUserFacingText(actionsByType(result.actions, type));
      const missing = (snippets || []).filter((snippet) => !text.includes(String(snippet)));
      if (missing.length) failures.push(`${type} text missing snippets [${missing.join(", ")}]`);
    }
  }
  if (expected.textExcludes && typeof expected.textExcludes === "object") {
    for (const [type, patterns] of Object.entries(expected.textExcludes)) {
      const text = actionUserFacingText(actionsByType(result.actions, type));
      const matched = textMatchesAny(text, patterns || []);
      if (matched.length) failures.push(`${type} text matched forbidden patterns [${matched.join(", ")}]`);
    }
  }
  if (Array.isArray(expected.requiredTextPatterns) && expected.requiredTextPatterns.length) {
    const text = flattenText({ actions: result.actions, reply: fixture.mockReply || fixture.reply || "" });
    const missing = expected.requiredTextPatterns
      .map(regexFromPattern)
      .filter((regex) => !regex.test(text))
      .map((regex) => regex.toString());
    if (missing.length) failures.push(`missing required text patterns [${missing.join(", ")}]`);
  }
  if (Array.isArray(expected.forbiddenTextPatterns) && expected.forbiddenTextPatterns.length) {
    const text = flattenText({ actions: result.actions, reply: fixture.mockReply || fixture.reply || "" });
    const matched = textMatchesAny(text, expected.forbiddenTextPatterns);
    if (matched.length) failures.push(`matched forbidden text patterns [${matched.join(", ")}]`);
  }
  if (expected.trace && typeof expected.trace === "object") {
    if (Array.isArray(expected.trace.finalActionTypes)) {
      const missing = expected.trace.finalActionTypes.filter((type) => !(result.trace?.finalActionTypes || []).includes(type));
      if (missing.length) failures.push(`trace missing final action types [${missing.join(", ")}]`);
    }
    if (Array.isArray(expected.trace.stageNames)) {
      const stageNames = (result.trace?.pipelineStages || []).map((stage) => stage.name);
      const missing = expected.trace.stageNames.filter((name) => !stageNames.includes(name));
      if (missing.length) failures.push(`trace missing stage names [${missing.join(", ")}]`);
    }
  }

  if (failures.length) {
    return {
      id: fixture.id,
      category: fixture.category,
      message: fixture.message,
      failures,
      actualActionTypes: actual,
      actions: result.actions,
      actionPolicy: result.actionPolicy,
      trace: result.trace
    };
  }
  return null;
}

const fixtures = readJsonl(fixturePath);
const failures = fixtures.map(assertFixture).filter(Boolean);
if (failures.length) {
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(failureArtifactPath, `${JSON.stringify({
    createdAt: new Date().toISOString(),
    fixturePath,
    failureCount: failures.length,
    failures
  }, null, 2)}\n`);
  assert.fail(`canvas action regression failed (${failures.length}/${fixtures.length}); artifact: ${failureArtifactPath}\n${JSON.stringify(failures[0], null, 2)}`);
}
if (fs.existsSync(failureArtifactPath)) fs.rmSync(failureArtifactPath);
console.log(`[test] canvas action regression: PASS (${fixtures.length} fixtures)`);
