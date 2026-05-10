import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compactPipelineActionTypes } from "../src/lib/canvasActionPipeline.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_FIXTURE_PATH = path.join(__dirname, "evals", "canvas-action-capability-smoke.jsonl");
const fixturePath = process.argv[2] || DEFAULT_FIXTURE_PATH;
const artifactDir = process.env.CANVAS_ACTION_EVAL_ARTIFACT_DIR
  ? path.resolve(process.env.CANVAS_ACTION_EVAL_ARTIFACT_DIR)
  : path.join(__dirname, "evals", "artifacts");
const reportPath = path.join(artifactDir, "canvas-action-capability-smoke-report.json");
const endpoint = process.env.CANVAS_ACTION_SMOKE_ENDPOINT || "http://127.0.0.1:3000/api/chat";
const shouldRun = process.env.RUN_MODEL_SMOKE_EVALS === "1";
const trials = Math.max(1, Math.min(Number(process.env.CANVAS_ACTION_SMOKE_TRIALS) || 1, 10));

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

function hasIntersection(actual, expected) {
  return expected.some((type) => actual.includes(type));
}

function evaluateExpected(actions, expected = {}) {
  const actual = compactPipelineActionTypes(actions);
  const failures = [];
  if (Array.isArray(expected.any) && expected.any.length && !hasIntersection(actual, expected.any)) {
    failures.push(`expected any of [${expected.any.join(", ")}], got [${actual.join(", ")}]`);
  }
  if (Array.isArray(expected.none)) {
    const forbidden = expected.none.filter((type) => actual.includes(type));
    if (forbidden.length) failures.push(`forbidden action types present [${forbidden.join(", ")}]`);
  }
  if (Number.isFinite(expected.exactCount) && actual.length !== expected.exactCount) {
    failures.push(`expected exactly ${expected.exactCount} actions, got ${actual.length}`);
  }
  return { actual, failures };
}

async function runFixture(fixture) {
  const startedAt = Date.now();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: fixture.message,
      language: fixture.lang || "zh",
      thinkingMode: fixture.thinkingMode || "no-thinking",
      messages: []
    })
  });
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { rawText: text };
  }
  const actions = Array.isArray(data.actions) ? data.actions : (data.action ? [data.action] : []);
  const { actual, failures } = evaluateExpected(actions, fixture.expected || {});
  return {
    id: fixture.id,
    category: fixture.category,
    status: response.status,
    ok: response.ok,
    latencyMs: Date.now() - startedAt,
    actualActionTypes: actual,
    failures: response.ok ? failures : [`HTTP ${response.status}`],
    actionPolicy: data.actionPolicy,
    trace: data.actionTrace || data.trace || null
  };
}

async function runFixtureTrials(fixture) {
  const runs = [];
  for (let trial = 0; trial < trials; trial += 1) {
    runs.push({
      trial: trial + 1,
      ...(await runFixture(fixture))
    });
  }
  const passedRuns = runs.filter((run) => !run.failures.length);
  const signatures = runs.map((run) => run.actualActionTypes.join(","));
  const uniqueSignatures = Array.from(new Set(signatures));
  return {
    id: fixture.id,
    category: fixture.category,
    passAt1: passedRuns.length > 0,
    passRate: passedRuns.length / runs.length,
    consistency: uniqueSignatures.length === 1 ? 1 : Math.max(0, 1 - ((uniqueSignatures.length - 1) / runs.length)),
    uniqueActionTypeSignatures: uniqueSignatures,
    failures: passedRuns.length ? [] : runs.flatMap((run) => run.failures).slice(0, 8),
    runs
  };
}

const fixtures = readJsonl(fixturePath);
if (!shouldRun) {
  console.log(`[smoke] canvas action capability eval skipped (${fixtures.length} fixtures, ${trials} trial(s)). Set RUN_MODEL_SMOKE_EVALS=1 to call ${endpoint}.`);
  process.exit(0);
}

const results = [];
for (const fixture of fixtures) {
  results.push(await runFixtureTrials(fixture));
}
const failures = results.filter((item) => item.failures.length);
fs.mkdirSync(artifactDir, { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify({
  createdAt: new Date().toISOString(),
  endpoint,
  fixturePath,
  trials,
  total: results.length,
  passed: results.length - failures.length,
  failed: failures.length,
  passAt1: results.length ? (results.length - failures.length) / results.length : 0,
  averageConsistency: results.length ? results.reduce((sum, item) => sum + item.consistency, 0) / results.length : 0,
  results
}, null, 2)}\n`);

if (failures.length) {
  assert.fail(`canvas action capability smoke eval failed (${failures.length}/${results.length}); report: ${reportPath}`);
}
console.log(`[smoke] canvas action capability eval: PASS (${results.length} fixtures); report: ${reportPath}`);
