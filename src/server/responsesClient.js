import { extractResponsesReasoningDelta, extractResponsesTextDelta } from "../lib/responsesStreamParser.js";

export function createResponsesClient({
  applyRequestOptions,
  extractStreamingReasoningDelta,
  extractStreamingTextDelta,
  completionTimeoutMs = 180000,
  streamIdleTimeoutMs = completionTimeoutMs
} = {}) {
  if (typeof applyRequestOptions !== "function") {
    throw new Error("createResponsesClient requires applyRequestOptions.");
  }

  async function qwenResponsesRequest(config, payload) {
    const response = await fetch(`${qwenResponsesBaseUrl(config)}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
    if (!response.ok) {
      const detail = json?.error?.message || json?.message || text || response.statusText;
      throw new Error(`${config.role} Responses API ${response.status}: ${detail}`);
    }
    return json;
  }

  async function streamQwenResponses(config, payload, options = {}) {
    const requestPayload = applyRequestOptions({
      model: config.model,
      ...payload,
      stream: true
    }, config);
    const timeoutMs = Number(options.timeoutMs || streamIdleTimeoutMs || completionTimeoutMs);
    const controller = new AbortController();
    let timer = null;
    const refreshTimeout = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        controller.abort();
      }, timeoutMs);
    };
    refreshTimeout();

    let response;
    try {
      response = await fetch(`${qwenResponsesBaseUrl(config)}/responses`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal
      });
    } catch (error) {
      if (timer) clearTimeout(timer);
      if (error?.name === "AbortError") {
        throw new Error(`${config.role} stream timed out after ${Math.round(timeoutMs / 1000)}s without new output`);
      }
      throw error;
    }

    if (!response.ok) {
      if (timer) clearTimeout(timer);
      const detail = await response.text().catch(() => response.statusText);
      throw new Error(`${config.role} Responses API ${response.status}: ${detail || response.statusText}`);
    }

    try {
      const collected = await collectStreamingResponsesPayload(response, {
        ...options,
        onActivity() {
          refreshTimeout();
          options.onActivity?.();
        }
      });
      return responsesToChatCompletion(collected.response || {}, config, collected);
    } catch (error) {
      if (error?.name === "AbortError" || /abort/i.test(String(error?.message || ""))) {
        throw new Error(`${config.role} stream timed out after ${Math.round(timeoutMs / 1000)}s without new output`);
      }
      throw error;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function collectStreamingResponsesPayload(response, options = {}) {
    if (!response.body) return { content: "", reasoning: "", model: "", toolCalls: [], response: null };

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let content = "";
    let reasoning = "";
    let model = "";
    let completedResponse = null;
    const toolCalls = new Map();

    function getToolCall(key) {
      const normalizedKey = key || "0";
      if (!toolCalls.has(normalizedKey)) {
        toolCalls.set(normalizedKey, {
          id: normalizedKey,
          type: "function",
          function: { name: "", arguments: "" }
        });
      }
      return toolCalls.get(normalizedKey);
    }

    function captureFunctionCall(item, fallbackKey = "") {
      if (!item || typeof item !== "object") return;
      const name = item.name || item.function?.name || "";
      const args = item.arguments ?? item.function?.arguments;
      if (name !== "canvas_action") return;
      const key = item.call_id || item.callId || item.id || fallbackKey || String(toolCalls.size);
      const call = getToolCall(key);
      call.id = key;
      call.function.name = name;
      if (args !== undefined) {
        call.function.arguments = typeof args === "string" ? args : JSON.stringify(args || {});
      }
    }

    function consumeData(eventName, data) {
      if (!data || data === "[DONE]") return;
      let chunk;
      try {
        chunk = JSON.parse(data);
      } catch {
        return;
      }
      options.onActivity?.();
      if (chunk?.model) model = chunk.model;
      if (chunk?.response) {
        completedResponse = chunk.response;
        if (chunk.response?.model) model = chunk.response.model;
      }
      if (/response\.completed|completed|done/i.test(eventName) && chunk?.id && chunk?.output) {
        completedResponse = chunk;
      }

      const reasoningDelta = extractResponsesReasoningDelta(eventName, chunk) || extractStreamingReasoningDelta?.(chunk);
      const textDelta = reasoningDelta ? "" : (extractResponsesTextDelta(eventName, chunk) || extractStreamingTextDelta?.(chunk));
      if (textDelta) {
        content += textDelta;
        options.onText?.(textDelta);
      }
      if (reasoningDelta) {
        reasoning += reasoningDelta;
        options.onReasoning?.(reasoningDelta);
      }

      const item = chunk.item || chunk.output_item || chunk.response?.output_item;
      captureFunctionCall(item, chunk.item_id || chunk.output_index);
      captureFunctionCall(chunk, chunk.item_id || chunk.output_index);

      if (/function_call_arguments\.delta/i.test(eventName)) {
        const key = chunk.item_id || chunk.call_id || chunk.id || String(chunk.output_index ?? chunk.index ?? 0);
        const call = getToolCall(key);
        if (chunk.name && !call.function.name) call.function.name = chunk.name;
        call.function.arguments += chunk.delta || chunk.arguments_delta || "";
      }
      if (/function_call_arguments\.done/i.test(eventName)) {
        const key = chunk.item_id || chunk.call_id || chunk.id || String(chunk.output_index ?? chunk.index ?? 0);
        const call = getToolCall(key);
        if (chunk.name && !call.function.name) call.function.name = chunk.name;
        if (typeof chunk.arguments === "string") call.function.arguments = chunk.arguments;
      }
    }

    while (true) {
      const { value, done } = await reader.read();
      if (value) buffer += decoder.decode(value, { stream: !done });
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() || "";

      for (const event of events) {
        const lines = event.split(/\r?\n/).map((line) => line.trim());
        const eventName = lines.find((line) => line.startsWith("event:"))?.slice(6).trim() || "message";
        const dataLines = lines
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim());
        for (const data of dataLines) consumeData(eventName, data);
      }

      if (done) break;
    }

    if (buffer.trim()) {
      const lines = buffer.split(/\r?\n/).map((line) => line.trim());
      const eventName = lines.find((line) => line.startsWith("event:"))?.slice(6).trim() || "message";
      const dataLines = lines
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim());
      for (const data of dataLines) consumeData(eventName, data);
    }

    const normalizedToolCalls = Array.from(toolCalls.values())
      .filter((call) => call.function.name === "canvas_action" && call.function.arguments);
    return { content, reasoning, model, toolCalls: normalizedToolCalls, response: completedResponse };
  }

  return {
    collectStreamingResponsesPayload,
    qwenResponsesRequest,
    responsesToChatCompletion,
    streamQwenResponses
  };
}

export function responsesToChatCompletion(response, config, collected = {}) {
  const raw = response?.response || response || {};
  const rawContent = collected.content || extractResponsesText(raw);
  const reasoning = sanitizeReasoningContent(collected.reasoning || extractResponsesReasoning(raw), rawContent);
  const content = stripReasoningEchoFromResponseText(rawContent, reasoning);
  const toolCalls = mergeResponsesToolCalls(collected.toolCalls || [], extractResponsesToolCallsAsChat(raw));
  const message = {
    role: "assistant",
    content,
    reasoning_content: reasoning
  };
  if (toolCalls.length) message.tool_calls = toolCalls;
  return {
    id: raw.id || response?.id || "",
    object: "response",
    model: collected.model || raw.model || config.model,
    rawResponse: raw,
    choices: [
      {
        index: 0,
        message,
        finish_reason: toolCalls.length ? "tool_calls" : "stop"
      }
    ]
  };
}

function mergeResponsesToolCalls(...groups) {
  const seen = new Set();
  const merged = [];
  for (const group of groups) {
    for (const call of group || []) {
      if (!call?.function?.name || !call.function.arguments) continue;
      const key = `${call.function.name}:${call.function.arguments}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(call);
    }
  }
  return merged;
}

function extractResponsesReasoning(value) {
  const parts = [];
  walkJson(value, (item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return;
    const type = String(item.type || item.kind || "");
    const isReasoningTyped = /reasoning|thinking/i.test(type);
    const explicit = normalizeReasoningPart(
      item.reasoning_content ??
      item.reasoningContent ??
      item.thinking_content ??
      item.thinkingContent,
      "reasoning"
    );
    if (explicit) parts.push(explicit);
    if (isReasoningTyped) {
      const text = normalizeReasoningPart(
        item.text ?? item.content ?? item.summary ?? item.reasoning ?? item.thinking,
        type
      );
      if (text) parts.push(text);
    }
  });
  return dedupeTextParts(parts);
}

function extractResponsesToolCallsAsChat(value) {
  const calls = [];
  walkJson(value, (item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return;
    const name = item.name || item.function?.name || "";
    const args = item.arguments ?? item.function?.arguments;
    if (name !== "canvas_action" || args === undefined || item.parameters) return;
    calls.push({
      id: String(item.call_id || item.callId || item.id || `responses-call-${calls.length + 1}`),
      type: "function",
      function: {
        name,
        arguments: typeof args === "string" ? args : JSON.stringify(args || {})
      }
    });
  });
  return calls;
}

function qwenResponsesBaseUrl(config) {
  const base = String(config.baseUrl || "https://dashscope.aliyuncs.com/compatible-mode/v1").replace(/\/+$/, "");
  if (/dashscope\.aliyuncs\.com\/compatible-mode\/v1$/i.test(base)) {
    return base.replace(/dashscope\.aliyuncs\.com\/compatible-mode\/v1$/i, "dashscope.aliyuncs.com/api/v2/apps/protocols/compatible-mode/v1");
  }
  if (/dashscope-intl\.aliyuncs\.com\/compatible-mode\/v1$/i.test(base)) {
    return base.replace(/dashscope-intl\.aliyuncs\.com\/compatible-mode\/v1$/i, "dashscope-intl.aliyuncs.com/api/v2/apps/protocols/compatible-mode/v1");
  }
  return base;
}

export function extractResponsesText(value) {
  const raw = value?.response || value || {};
  const direct = [
    raw.output_text,
    raw.text,
    raw.message?.content,
    raw.choices?.[0]?.message?.content
  ].map(textFromMixedContent).filter(Boolean);
  if (direct.length) return dedupeTextParts(direct);

  const output = Array.isArray(raw.output) ? raw.output : [];
  const texts = [];
  for (const item of output) {
    const itemType = String(item?.type || "");
    if (/reasoning|thinking/i.test(itemType)) continue;
    if (itemType === "message" || item.role === "assistant") {
      texts.push(textFromResponseContentParts(item.content));
    }
    if (itemType === "output_text") {
      texts.push(textFromMixedContent(item.text || item.content));
    }
  }
  return dedupeTextParts(texts);
}

function textFromResponseContentParts(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return textFromMixedContent(content);
  return content
    .filter((part) => {
      const type = String(part?.type || "");
      return !/reasoning|thinking/i.test(type);
    })
    .map((part) => {
      const type = String(part?.type || "");
      if (type === "output_text" || type === "text" || !type) {
        return textFromMixedContent(part?.text || part?.content || part);
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

export function dedupeTextParts(parts = []) {
  const seen = new Set();
  const result = [];
  for (const part of parts) {
    const text = String(part || "").trim();
    if (!text) continue;
    const key = normalizeTextFingerprint(text);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(text);
  }
  return result.join("\n").trim();
}

function normalizeTextFingerprint(value) {
  return String(value || "").normalize("NFKC").replace(/\s+/g, " ").trim();
}

export function stripReasoningEchoFromResponseText(text, reasoning) {
  let value = String(text || "").trim();
  const reasoningText = String(reasoning || "").trim();
  if (!value) return "";
  if (reasoningText) {
    const replyKey = normalizeReasoningEchoKey(value);
    const reasoningKey = normalizeReasoningEchoKey(reasoningText);
    if (replyKey && reasoningKey) {
      const shortReasoningKey = reasoningKey.slice(0, Math.min(800, reasoningKey.length));
      if (replyKey === reasoningKey || replyKey.startsWith(shortReasoningKey) || reasoningKey.includes(replyKey)) {
        return "";
      }
    }
  }
  value = removeLeadingInternalPlanningBlock(value);
  return value.trim();
}

export function sanitizeReasoningContent(reasoning, reply = "") {
  const raw = dedupeReasoningParagraphs(String(reasoning || "").trim());
  if (!raw) return "";
  const rawKey = normalizeReasoningEchoKey(raw);
  const replyKey = normalizeReasoningEchoKey(reply);
  if (rawKey && replyKey && (rawKey === replyKey || rawKey.includes(replyKey) || replyKey.includes(rawKey))) return "";
  if (looksLikeRawInternalReasoning(raw)) return "";
  return raw.slice(0, 12000);
}

function normalizeReasoningEchoKey(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#*_`~>|[\](){}"'“”‘’《》「」]/g, " ")
    .replace(/[，。！？、；：:;,.!?/\\\-\s]+/g, " ")
    .toLowerCase()
    .trim();
}

function dedupeReasoningParagraphs(value) {
  const seen = new Set();
  const parts = String(value || "")
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  const kept = [];
  for (const part of parts) {
    const key = normalizeReasoningEchoKey(part).slice(0, 600);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    kept.push(part);
  }
  return kept.join("\n\n").trim();
}

function removeLeadingInternalPlanningBlock(value) {
  const parts = String(value || "")
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  while (parts.length > 1 && looksLikeRawInternalReasoning(parts[0])) parts.shift();
  if (parts.length === 1 && looksLikeRawInternalReasoning(parts[0])) return "";
  return parts.join("\n\n");
}

function looksLikeRawInternalReasoning(value) {
  const text = String(value || "").normalize("NFKC").trim();
  if (text.length < 24) return false;
  const markers = [
    /用户.{0,24}(选中|选择|要求|请求|想要|希望|问|上传|提供)/,
    /我(?:需要|应该|要|会|将|可以|来|打算|必须).{0,80}(分析|判断|创建|生成|调用|使用|提出|总结|回复|检查|需要)/,
    /(create_direction|create_comparison|generate_image|tool|function call|canvas action)/i,
    /\b(the user|i need to|i should|i will|i must|we need to)\b/i
  ];
  const markerCount = markers.reduce((count, re) => count + (re.test(text) ? 1 : 0), 0);
  if (markerCount >= 2) return true;
  const paragraphs = text.split(/\n{2,}/).map((part) => normalizeReasoningEchoKey(part)).filter(Boolean);
  if (paragraphs.length >= 2 && new Set(paragraphs).size < paragraphs.length) return true;
  return false;
}

function normalizeReasoningPart(value, contextType = "") {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value
      .map((part) => normalizeReasoningPart(part, contextType))
      .filter(Boolean)
      .join("\n");
  }
  if (typeof value !== "object") return "";

  const type = String(value.type || value.kind || contextType || "");
  const isReasoningTyped = /reasoning|thinking/i.test(type);
  const explicit = value.reasoning_content ?? value.reasoningContent ?? value.thinking_content ?? value.thinkingContent;
  if (typeof explicit === "string") return explicit.trim();
  if (explicit) return normalizeReasoningPart(explicit, "reasoning");

  if (isReasoningTyped) {
    const text = value.text ?? value.content ?? value.summary ?? value.reasoning ?? value.thinking;
    if (typeof text === "string") return text.trim();
    if (Array.isArray(text)) return normalizeReasoningPart(text, type);
  }

  return "";
}

function textFromMixedContent(value) {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value.map(textFromMixedContent).filter(Boolean).join("\n");
  }
  if (value && typeof value === "object") {
    return textFromMixedContent(value.text ?? value.content ?? value.output_text ?? value.summary ?? "");
  }
  return "";
}

function walkJson(value, visitor, seen = new Set()) {
  if (!value || typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);
  visitor(value);
  if (Array.isArray(value)) {
    value.forEach((item) => walkJson(item, visitor, seen));
  } else {
    Object.values(value).forEach((item) => walkJson(item, visitor, seen));
  }
}
