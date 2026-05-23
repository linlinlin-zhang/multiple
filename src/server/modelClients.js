export function createModelClients({
  applyRequestOptions,
  isMiMoChatConfig,
  completionTimeoutMs = 180000,
  streamIdleTimeoutMs = completionTimeoutMs
} = {}) {
  if (typeof applyRequestOptions !== "function") {
    throw new Error("createModelClients requires applyRequestOptions.");
  }

  const isMiMo = typeof isMiMoChatConfig === "function" ? isMiMoChatConfig : () => false;

  function modelRequestHeaders(config, extra = {}) {
    const headers = {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      ...extra
    };
    if (isMiMo(config)) {
      headers["api-key"] = config.apiKey;
    }
    return headers;
  }

  async function chatCompletions(config, payload, options = {}) {
    const requestPayload = applyRequestOptions({
      model: config.model,
      ...payload
    }, config);
    const timeoutMs = Number(options.timeoutMs || completionTimeoutMs);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    let response;
    let text;
    try {
      response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: modelRequestHeaders(config),
        body: JSON.stringify(requestPayload),
        signal: controller.signal
      });
      text = await response.text();
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new Error(`${config.role} API timeout after ${Math.round(timeoutMs / 1000)}s`);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }

    if (!response.ok) {
      const detail = json?.error?.message || text || response.statusText;
      throw new Error(`${config.role} API ${response.status}: ${detail}`);
    }

    return json;
  }

  async function streamChatCompletions(config, payload, options = {}) {
    const requestPayload = applyRequestOptions({
      model: config.model,
      ...payload,
      stream: true,
      stream_options: {
        ...(payload.stream_options || {}),
        include_usage: false
      }
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
      response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: modelRequestHeaders(config),
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
      throw new Error(`${config.role} API ${response.status}: ${detail || response.statusText}`);
    }

    try {
      const { content, reasoning, model, toolCalls } = await collectStreamingChatPayload(response, {
        ...options,
        onActivity() {
          refreshTimeout();
          options.onActivity?.();
        }
      });
      const message = {
        role: "assistant",
        content,
        reasoning_content: reasoning
      };
      if (toolCalls && toolCalls.length) {
        message.tool_calls = toolCalls;
      }
      return {
        id: `stream-${Date.now()}`,
        object: "chat.completion",
        model: model || config.model,
        choices: [
          {
            index: 0,
            message,
            finish_reason: toolCalls && toolCalls.length ? "tool_calls" : "stop"
          }
        ]
      };
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    chatCompletions,
    collectStreamingChatPayload,
    collectStreamingChatText,
    extractStreamingReasoningDelta,
    extractStreamingTextDelta,
    modelRequestHeaders,
    streamChatCompletions
  };
}

export async function collectStreamingChatText(response) {
  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";

  while (true) {
    const { value, done } = await reader.read();
    if (value) buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const chunk = JSON.parse(data);
        if (!extractStreamingReasoningDelta(chunk)) text += extractStreamingTextDelta(chunk);
      } catch {
        // Ignore keepalive or non-JSON stream fragments.
      }
    }

    if (done) break;
  }

  if (buffer.trim().startsWith("data:")) {
    const data = buffer.trim().slice(5).trim();
    if (data && data !== "[DONE]") {
      try {
        const chunk = JSON.parse(data);
        if (!extractStreamingReasoningDelta(chunk)) text += extractStreamingTextDelta(chunk);
      } catch {
        // Ignore trailing non-JSON stream fragments.
      }
    }
  }

  return text;
}

export async function collectStreamingChatPayload(response, options = {}) {
  if (!response.body) return { content: "", reasoning: "", model: "", toolCalls: [] };

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let reasoning = "";
  let model = "";
  const toolCalls = [];

  function consumeData(data) {
    if (!data || data === "[DONE]") return;
    try {
      const chunk = JSON.parse(data);
      options.onActivity?.();
      if (chunk?.model) model = chunk.model;
      const reasoningDelta = extractStreamingReasoningDelta(chunk);
      const textDelta = reasoningDelta ? "" : extractStreamingTextDelta(chunk);
      const toolDeltas = chunk?.choices?.[0]?.delta?.tool_calls || [];
      for (const td of toolDeltas) {
        const idx = td.index ?? 0;
        if (!toolCalls[idx]) {
          toolCalls[idx] = { id: td.id || "", type: td.type || "function", function: { name: "", arguments: "" } };
        }
        if (td.function?.name) toolCalls[idx].function.name += td.function.name;
        if (td.function?.arguments) toolCalls[idx].function.arguments += td.function.arguments;
      }
      if (textDelta) {
        content += textDelta;
        options.onText?.(textDelta);
      }
      if (reasoningDelta) {
        reasoning += reasoningDelta;
        options.onReasoning?.(reasoningDelta);
      }
    } catch {
      // Ignore keepalive or non-JSON stream fragments.
    }
  }

  while (true) {
    const { value, done } = await reader.read();
    if (value) buffer += decoder.decode(value, { stream: !done });
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() || "";

    for (const event of events) {
      const dataLines = event
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim());
      for (const data of dataLines) consumeData(data);
    }

    if (done) break;
  }

  if (buffer.trim()) {
    const dataLines = buffer
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim());
    for (const data of dataLines) consumeData(data);
  }

  return { content, reasoning, model, toolCalls };
}

export function extractStreamingTextDelta(chunk) {
  const delta = chunk?.choices?.[0]?.delta;
  if (!delta) return "";
  if (typeof delta.content === "string") return delta.content;
  if (Array.isArray(delta.content)) {
    return delta.content.map((part) => part?.text || part?.content || "").join("");
  }
  if (typeof delta.audio?.transcript === "string") return delta.audio.transcript;
  if (typeof delta.transcript === "string") return delta.transcript;
  return "";
}

export function extractStreamingReasoningDelta(chunk) {
  const delta = chunk?.choices?.[0]?.delta;
  if (!delta) return "";
  const candidates = [
    delta.reasoning_content,
    delta.reasoningContent,
    delta.reasoning,
    delta.thinking_content,
    delta.thinkingContent,
    delta.thinking
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate) return candidate;
  }
  return "";
}
