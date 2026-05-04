const GENERIC_SESSION_TITLES = new Set([
  "",
  "未命名会话",
  "untitled session",
  "unnamed session",
  "new session",
  "session.unnamed"
]);

function cleanTitleText(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/["“”'‘’<>《》【】\[\]{}]+/g, " ")
    .replace(/[#*_~|]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function isGenericSessionTitle(title) {
  const clean = cleanTitleText(title).toLowerCase();
  if (GENERIC_SESSION_TITLES.has(clean)) return true;
  return /^(未命名|untitled|unnamed)(\s|$)/i.test(clean) || /(?:的探索|exploration)$/i.test(clean);
}

function trimTitleByLanguage(text) {
  const clean = cleanTitleText(text);
  if (!clean) return "";
  const hasCjk = /[\u4e00-\u9fff]/.test(clean);
  if (hasCjk) {
    return clean
      .replace(/^(请|请你|帮我|帮忙|我想|我需要|能不能|可以|麻烦你|好的|然后|关于|围绕|针对)+/g, "")
      .replace(/[，。！？；：,.!?;:].*$/g, "")
      .trim()
      .slice(0, 28);
  }
  return clean
    .replace(/^(please|help me|can you|could you|i want to|i need to|about|regarding)\s+/i, "")
    .split(/\s+/)
    .slice(0, 8)
    .join(" ")
    .slice(0, 72)
    .trim();
}

function firstUsefulSentence(text) {
  const clean = cleanTitleText(text);
  if (!clean) return "";
  const parts = clean.split(/[。！？；\n.!?;]+/).map((item) => item.trim()).filter(Boolean);
  return parts.find((item) => item.length >= 4) || parts[0] || clean;
}

export function deriveSessionTitleFromMessages(messages = []) {
  const list = Array.isArray(messages) ? messages : [];
  const firstUserIndex = list.findIndex((message) => message?.role === "user" && String(message?.content || "").trim());
  if (firstUserIndex < 0) return "";
  const firstUser = list[firstUserIndex];
  const firstAssistant = list.slice(firstUserIndex + 1).find((message) => message?.role === "assistant" && String(message?.content || "").trim());
  const userSentence = firstUsefulSentence(firstUser.content);
  const userTitle = trimTitleByLanguage(userSentence);
  if (userTitle && userTitle.length >= 4 && !/^(你好|hello|hi|嗨)$/i.test(userTitle)) return userTitle;
  const assistantSentence = firstUsefulSentence(firstAssistant?.content || "");
  return trimTitleByLanguage(assistantSentence);
}

export function resolveSessionTitle({ requestedTitle = "", chatMessages = [], fallbackTitle = "未命名会话" } = {}) {
  const cleanRequested = cleanTitleText(requestedTitle).slice(0, 160);
  if (cleanRequested && !isGenericSessionTitle(cleanRequested)) return cleanRequested;
  const derived = deriveSessionTitleFromMessages(chatMessages);
  if (derived) return derived;
  return cleanRequested || fallbackTitle;
}
