import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const publicApp = fs.readFileSync(path.join(repoRoot, "public", "app.js"), "utf8");
const publicCss = fs.readFileSync(path.join(repoRoot, "public", "styles.css"), "utf8");

function extractFunctionBody(source, functionName, nextFunctionName) {
  const start = source.indexOf(`function ${functionName}`);
  const asyncStart = source.indexOf(`async function ${functionName}`);
  const index = start >= 0 ? start : asyncStart;
  assert.notEqual(index, -1, `${functionName} must exist`);
  const end = nextFunctionName ? source.indexOf(`function ${nextFunctionName}`, index + 1) : -1;
  return source.slice(index, end >= 0 ? end : undefined);
}

const chatMessageNormalizer = extractFunctionBody(publicApp, "normalizeChatThreadMessage", "normalizeChatAttachments");
const chatMessageSerializer = extractFunctionBody(publicApp, "serializeChatThreads", "getChatThreadTitle");
const chatMessageUpdater = extractFunctionBody(publicApp, "updateChatMessage", "ensureRenderedThinkingPre");
const actionResultNormalizer = extractFunctionBody(publicApp, "normalizeChatActionResults", "actionDisplayTitle");

for (const field of ["pendingActionBundle", "actionProgress"]) {
  assert.ok(chatMessageNormalizer.includes(field), `chat message normalizer must preserve ${field}`);
  assert.ok(chatMessageSerializer.includes(field), `chat message serializer must persist ${field}`);
  assert.ok(chatMessageUpdater.includes(field), `chat message updater must accept ${field}`);
}

assert.ok(actionResultNormalizer.includes("base") && actionResultNormalizer.includes("\"success\" in base"), "action result normalizer must preserve already-normalized success values");

for (const functionName of [
  "renderChatActionConfirmation",
  "renderChatActionProgress",
  "renderChatReferencesPanel",
  "confirmChatActionBundle",
  "cancelChatActionBundle",
  "retryChatAction",
  "startChatFollowupForNode",
  "createChatBranchFromMessage"
]) {
  assert.ok(publicApp.includes(`function ${functionName}`) || publicApp.includes(`async function ${functionName}`), `${functionName} must exist`);
}

for (const token of [
  "chat.actionPlanTitle",
  "chat.actionProgressTitle",
  "chat.retryAction",
  "chat.askCard",
  "chat.branchThread",
  "chat.referencesTitle"
]) {
  assert.ok(publicApp.includes(token), `translation key must exist: ${token}`);
}

for (const selector of [
  ".chat-action-confirmation",
  ".chat-action-progress",
  ".chat-references",
  ".chat-action-inline-button",
  ".chat-message-toolbar"
]) {
  assert.ok(publicCss.includes(selector), `chat controller CSS must include ${selector}`);
}

console.log("[test] chat controller: PASS");
