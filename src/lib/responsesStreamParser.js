function stringOr(value, fallback = "") {
  return typeof value === "string" && value ? value : fallback;
}

export function extractResponsesTextDelta(eventName, chunk) {
  const name = String(eventName || "");
  if (/reasoning|thinking/i.test(name)) return "";
  if (/output_text\.delta|text\.delta|message\.delta/i.test(name)) {
    return stringOr(chunk?.delta || chunk?.text || chunk?.content, "");
  }
  if (typeof chunk?.delta === "string" && /text|message|output/i.test(String(chunk?.type || name))) {
    return chunk.delta;
  }
  return "";
}

export function extractResponsesReasoningDelta(eventName, chunk) {
  const name = String(eventName || "");
  const type = String(chunk?.type || "");
  if (/reasoning|thinking/i.test(name) && /\.delta$/i.test(name)) {
    return stringOr(chunk?.delta || chunk?.text || chunk?.content, "");
  }
  if (typeof chunk?.delta === "string" && /reasoning|thinking/i.test(type) && /\.delta$/i.test(type)) {
    return chunk.delta;
  }
  return "";
}
