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
  const parts = String(pathExpression || "").split(".").filter(Boolean);
  let current = value;
  for (const part of parts) {
    if (!current || typeof current !== "object" || !(part in current)) return false;
    current = current[part];
  }
  return true;
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
  if (expected.absentContentFields && typeof expected.absentContentFields === "object") {
    for (const [type, fields] of Object.entries(expected.absentContentFields)) {
      const action = result.actions.find((item) => item?.type === type);
      if (!action) continue;
      const present = fields.filter((field) => hasOwnPath(action.content, field));
      if (present.length) failures.push(`${type} should not include content fields [${present.join(", ")}]`);
    }
  }

  if (failures.length) {
    return {
      id: fixture.id,
      category: fixture.category,
      message: fixture.message,
      failures,
      actualActionTypes: actual,
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
