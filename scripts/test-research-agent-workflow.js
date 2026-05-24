import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const publicApp = fs.readFileSync(path.join(repoRoot, "public", "app.js"), "utf8");

function extractFunctionBody(source, functionName, nextFunctionName) {
  const start = source.indexOf(`function ${functionName}`);
  const asyncStart = source.indexOf(`async function ${functionName}`);
  const index = start >= 0 ? start : asyncStart;
  assert.notEqual(index, -1, `${functionName} must exist`);
  const end = nextFunctionName ? source.indexOf(`function ${nextFunctionName}`, index + 1) : -1;
  return source.slice(index, end >= 0 ? end : undefined);
}

for (const functionName of [
  "isResearchAgentWorkflowRequest",
  "buildResearchAgentDeepPrompt",
  "createResearchAgentWorkflowHub",
  "startResearchAgentWorkflow",
  "researchAgentEvidenceTable",
  "researchAgentNextStepCard",
  "enrichResearchAgentPlan"
]) {
  assert.ok(publicApp.includes(`function ${functionName}`) || publicApp.includes(`async function ${functionName}`), `${functionName} must exist`);
}

const submitBody = extractFunctionBody(publicApp, "handleChatSubmit", "submitChatMessage");
assert.ok(submitBody.includes("isResearchAgentWorkflowRequest(message)"), "chat submit must route research-agent requests");
assert.ok(submitBody.includes("startResearchAgentWorkflow(message)"), "chat submit must start the research-agent workflow");

const deepThinkBody = extractFunctionBody(publicApp, "startDeepThink", "applyDeepThinkPlan");
for (const token of [
  "options.parentNodeId",
  "workflow === \"research-agent\"",
  "branchNodeId: parentNodeId",
  "buildResearchAgentDeepPrompt(prompt)",
  "enrichResearchAgentPlan"
]) {
  assert.ok(deepThinkBody.includes(token), `startDeepThink must preserve research-agent behavior: ${token}`);
}

const hubBody = extractFunctionBody(publicApp, "createResearchAgentWorkflowHub", "startResearchAgentWorkflow");
for (const token of [
  "nodeType: \"plan\"",
  "deepThinkType: \"agent\"",
  "chat.researchAgentEvidence",
  "forceSelectNode(hubId)"
]) {
  assert.ok(hubBody.includes(token), `research agent hub must create visible workflow canvas cards: ${token}`);
}

for (const key of [
  "chat.researchAgent",
  "chat.researchAgentDesc",
  "chat.researchAgentStarted",
  "chat.researchAgentEvidence",
  "chat.researchAgentReport"
]) {
  assert.ok(publicApp.includes(key), `translation key must exist: ${key}`);
}

console.log("[test] research agent workflow: PASS");
