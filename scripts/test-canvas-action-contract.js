import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CANVAS_ACTION_TYPES } from "../src/prompts/shared.js";
import { CANVAS_ACTION_REGISTRY } from "../src/lib/canvasActionPolicy.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const publicApp = fs.readFileSync(path.join(repoRoot, "public", "app.js"), "utf8");
const server = fs.readFileSync(path.join(repoRoot, "server.js"), "utf8");
const serverModulesDir = path.join(repoRoot, "src", "server");
const serverModules = fs.readdirSync(serverModulesDir)
  .filter((fileName) => fileName.endsWith(".js"))
  .map((fileName) => fs.readFileSync(path.join(serverModulesDir, fileName), "utf8"))
  .join("\n");
const serverSurface = `${server}\n${serverModules}`;

function extractFunctionBody(source, functionName, nextFunctionName) {
  const start = source.indexOf(`function ${functionName}`);
  const asyncStart = source.indexOf(`async function ${functionName}`);
  const index = start >= 0 ? start : asyncStart;
  assert.notEqual(index, -1, `${functionName} must exist`);
  const end = nextFunctionName ? source.indexOf(`function ${nextFunctionName}`, index + 1) : -1;
  return source.slice(index, end >= 0 ? end : undefined);
}

function extractConstArray(source, name) {
  const match = new RegExp(`const\\s+${name}\\s*=\\s*\\[([^\\]]*)\\]`, "m").exec(source);
  assert.ok(match, `${name} must exist`);
  return Array.from(match[1].matchAll(/"([^"]+)"/g)).map((item) => item[1]);
}

const executorBody = extractFunctionBody(publicApp, "executeCanvasAction", "getNodeType");
const richCardTypes = extractConstArray(publicApp, "RICH_CARD_ACTION_TYPES");

for (const type of CANVAS_ACTION_TYPES) {
  assert.ok(CANVAS_ACTION_REGISTRY[type], `${type} must be present in CANVAS_ACTION_REGISTRY`);
}

for (const [type, metadata] of Object.entries(CANVAS_ACTION_REGISTRY)) {
  assert.ok(CANVAS_ACTION_TYPES.includes(type), `${type} registry entry must be in CANVAS_ACTION_TYPES`);
  assert.ok(metadata.group, `${type} must declare group`);
  assert.ok(metadata.risk, `${type} must declare risk`);
}

const missingFrontendExecutor = CANVAS_ACTION_TYPES.filter((type) => {
  if (richCardTypes.includes(type)) return false;
  return !executorBody.includes(`type === "${type}"`);
});
assert.deepEqual(missingFrontendExecutor, [], `Missing frontend executor coverage: ${missingFrontendExecutor.join(", ")}`);

for (const type of richCardTypes) {
  assert.ok(CANVAS_ACTION_TYPES.includes(type), `${type} rich card type must be model-visible`);
  assert.ok(CANVAS_ACTION_REGISTRY[type], `${type} rich card type must be in registry`);
}

const resultNormalizer = extractFunctionBody(publicApp, "normalizeCanvasActionResultContract", "actionResultNodeIds");
for (const field of ["type", "success", "nodeId", "nodeIds", "title", "error", "errorCode"]) {
  assert.ok(new RegExp(`\\b${field}\\b`).test(resultNormalizer), `action result contract must normalize ${field}`);
}

const chatMessageNormalizer = extractFunctionBody(publicApp, "normalizeChatThreadMessage", "normalizeChatAttachments");
const chatMessageSerializer = extractFunctionBody(publicApp, "serializeChatThreads", "getChatThreadTitle");
const chatMessageUpdater = extractFunctionBody(publicApp, "updateChatMessage", "ensureRenderedThinkingPre");
for (const field of ["actionPolicy", "actionTrace", "contextBudget"]) {
  assert.ok(chatMessageNormalizer.includes(field), `chat message normalizer must preserve ${field}`);
  assert.ok(chatMessageSerializer.includes(field), `chat message serializer must persist ${field}`);
  assert.ok(chatMessageUpdater.includes(field), `chat message updater must accept ${field}`);
}
assert.ok(publicApp.includes("renderChatActionTraceViewer"), "frontend must expose developer action trace viewer");

for (const token of [
  "/api/debug/action-traces",
  "handleListActionTraceSummaries",
  "persistActionTraceSummary",
  "buildActionTraceSummary",
  "CANVAS_ACTION_TRACE_LOG_RETENTION",
  "summary_only_no_hidden_reasoning"
]) {
  assert.ok(serverSurface.includes(token), `server must preserve action trace summary support: ${token}`);
}

for (const type of ["create_plan", "create_comparison", "generate_image", "create_note", "create_table"]) {
  assert.ok(server.includes(`${type}:`), `${type} must have agent-facing action selection guidance`);
}

console.log("[test] canvas action contract: PASS");
