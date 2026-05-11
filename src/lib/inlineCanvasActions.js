function stringOr(value, fallback = "") {
  return typeof value === "string" && value ? value : fallback;
}

function parseJsonFromText(text) {
  const value = String(text || "").trim();
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    const match = value.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function parseToolArguments(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  return parseJsonFromText(value);
}

function normalizeInlineCanvasAction(value, allowedTypes) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const type = stringOr(value.type || value.action || value.actionType || value.name, "").trim();
  if (!allowedTypes.includes(type)) return null;
  const { action, actionType, name, params, ...rest } = value;
  const flattenedParams = params && typeof params === "object" && !Array.isArray(params) ? params : {};
  return { ...flattenedParams, ...rest, type };
}

function collectInlineCanvasActionCandidates(value, allowedTypes, actions = []) {
  if (!value) return actions;
  if (Array.isArray(value)) {
    value.forEach((item) => collectInlineCanvasActionCandidates(item, allowedTypes, actions));
    return actions;
  }
  if (typeof value !== "object") return actions;
  const direct = normalizeInlineCanvasAction(value, allowedTypes);
  if (direct) actions.push(direct);
  if (Array.isArray(value.actions)) collectInlineCanvasActionCandidates(value.actions, allowedTypes, actions);
  if (value.canvas_action && typeof value.canvas_action === "object") {
    collectInlineCanvasActionCandidates(value.canvas_action, allowedTypes, actions);
  }
  if (value.function?.name === "canvas_action" && value.function?.arguments !== undefined) {
    collectInlineCanvasActionCandidates(parseToolArguments(value.function.arguments), allowedTypes, actions);
  }
  return actions;
}

function collectTaggedParameterActions(text, allowedTypes) {
  const actions = [];
  String(text || "").replace(/<function\s*=\s*["']?canvas_action["']?[\s\S]*?<\/function>/gi, (block) => {
    const values = {};
    block.replace(/<parameter\s*=\s*["']?([^>"'\s]+)["']?\s*>([\s\S]*?)<\/parameter>/gi, (_match, key, value) => {
      values[String(key || "").trim()] = String(value || "").trim();
      return "";
    });
    const action = normalizeInlineCanvasAction(values, allowedTypes);
    if (action) actions.push(action);
    return "";
  });
  return actions;
}

export function extractInlineCanvasActionsFromReply(reply, { allowedTypes = [] } = {}) {
  const text = String(reply || "");
  if (!text || !allowedTypes.length) return [];
  if (!/(canvas_action|create_|generate_|image_search|reverse_image_search|text_image_search|web_search|"action"|"type")/i.test(text)) return [];
  const blocks = [];
  text.replace(/```(?:json|javascript|js)?\s*([\s\S]*?)```/gi, (_match, body) => {
    blocks.push(body);
    return "";
  });
  text.replace(/<canvas_action[^>]*>([\s\S]*?)<\/canvas_action>/gi, (_match, body) => {
    blocks.push(body);
    return "";
  });
  const trimmed = text.trim();
  if (/^[\[{]/.test(trimmed)) blocks.push(trimmed);

  const actions = collectTaggedParameterActions(text, allowedTypes);
  for (const block of blocks) {
    const parsed = parseToolArguments(block);
    if (!parsed) continue;
    collectInlineCanvasActionCandidates(parsed, allowedTypes, actions);
  }
  const seen = new Set();
  return actions.filter((action) => {
    const key = JSON.stringify(action);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function removeInlineCanvasActionBlocks(reply, { allowedTypes = [] } = {}) {
  const text = String(reply || "");
  if (!text) return "";
  return text.replace(/```(?:json|javascript|js)?\s*([\s\S]*?)```/gi, (match, body) => (
    extractInlineCanvasActionsFromReply(body, { allowedTypes }).length ? "" : match
  )).replace(/<canvas_action[^>]*>[\s\S]*?<\/canvas_action>/gi, "")
    .replace(/<function\s*=\s*["']?canvas_action["']?[\s\S]*?<\/function>/gi, "")
    .replace(/<tool_call>\s*<\/tool_call>/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
