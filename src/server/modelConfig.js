export function createModelConfigHelpers({
  demoMode = false,
  imageSearchModel = "qwen3.5-plus",
  maxDeepResearchCanvasCards = 20,
  mimoDefaultBaseUrl = "https://api.xiaomimimo.com/v1",
  mimoDefaultModel = "mimo-v2.5-pro",
  videoPollIntervalMs = 15000,
  videoPollAttempts = 30
} = {}) {
  function buildModelConfig(role, defaults, dbSettings = null) {
    const effectiveDbSettings = isLegacyDefault(role, dbSettings) ? null : dbSettings;
    const envProvider = process.env[`${role}_PROVIDER`] || "";
    const envBaseUrl = process.env[`${role}_API_BASE_URL`] || "";
    const envModel = process.env[`${role}_MODEL`] || "";
    const ignoreLegacyEnv = isLegacyEnvDefault(role, {
      provider: envProvider,
      endpoint: envBaseUrl,
      model: envModel,
      apiKey: process.env[`${role}_API_KEY`] || ""
    });
    const defaultApiKey = firstEnv(defaults.apiKeyEnv || []);
    const apiKey =
      (effectiveDbSettings?.apiKey ?? "") ||
      (defaults.preferApiKeyEnv ? defaultApiKey : "") ||
      process.env[`${role}_API_KEY`] ||
      (!defaults.preferApiKeyEnv ? defaultApiKey : "") ||
      "";
    const baseUrl = (
      (effectiveDbSettings?.endpoint || "").replace(/\/+$/, "") ||
      (ignoreLegacyEnv ? "" : envBaseUrl) ||
      defaults.baseUrl
    ).replace(/\/+$/, "");
    const roleProvider =
      (effectiveDbSettings?.provider) ||
      (ignoreLegacyEnv ? "" : envProvider) ||
      inferProviderFromEndpoint(baseUrl, defaults.provider);
    const model =
      (effectiveDbSettings?.model) ||
      (ignoreLegacyEnv ? "" : envModel) ||
      defaults.model;
    const temperature =
      typeof effectiveDbSettings?.temperature === "number"
        ? effectiveDbSettings.temperature
        : (parseFloat(process.env[`${role}_TEMPERATURE`]) || defaults.temperature || 0.7);
    const options = normalizeModelOptions(role.toLowerCase(), {
      ...(defaults.options || {}),
      ...parseEnvOptions(role),
      ...(effectiveDbSettings?.options && typeof effectiveDbSettings.options === "object" ? effectiveDbSettings.options : {})
    });

    return { role: role.toLowerCase(), provider: roleProvider, apiKey, baseUrl, model, temperature, options };
  }

  function buildImageSearchConfig() {
    return buildModelConfig("IMAGE_SEARCH", {
      provider: "dashscope-qwen",
      model: imageSearchModel,
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      apiKeyEnv: ["IMAGE_SEARCH_API_KEY", "DASHSCOPE_API_KEY"]
    });
  }

  function isLegacyEnvDefault(role, envSettings) {
    if (!envSettings) return false;
    if (envSettings.apiKey) return false;
    const endpoint = String(envSettings.endpoint || "").replace(/\/+$/, "");
    const model = String(envSettings.model || "");
    const provider = String(envSettings.provider || "").toLowerCase();
    return (
      role === "CHAT" &&
      (provider === "kimi" || endpoint === "https://api.moonshot.cn/v1" || model === "kimi-k2.6" ||
        (provider === "dashscope-qwen" && endpoint === "https://dashscope.aliyuncs.com/compatible-mode/v1" && model === "qwen3.6-plus"))
    ) || (
      role === "ANALYSIS" &&
      (provider === "kimi" || endpoint === "https://api.moonshot.cn/v1" || model === "kimi-k2.6" ||
        (provider === "dashscope-qwen" && endpoint === "https://dashscope.aliyuncs.com/compatible-mode/v1" && model === "qwen3.6-plus"))
    ) || (
      role === "IMAGE" &&
      (provider === "tencent-tokenhub-image" || endpoint === "https://tokenhub.tencentmaas.com/v1/api/image" || model === "hy-image-v3.0")
    ) || (
      role === "DEEPTHINK" &&
      (model === "qwen3.6-max-preview" || model === "qwen3.6-plus")
    );
  }

  function isLegacyDefault(role, dbSettings) {
    if (!dbSettings) return false;
    const endpoint = String(dbSettings.endpoint || "").replace(/\/+$/, "");
    const model = String(dbSettings.model || "");
    if (
      (role === "CHAT" || role === "ANALYSIS") &&
      !dbSettings.apiKey &&
      endpoint === mimoDefaultBaseUrl &&
      model === mimoDefaultModel
    ) {
      return true;
    }
    if (
      (role === "CHAT" || role === "ANALYSIS") &&
      !dbSettings.apiKey &&
      endpoint === "https://dashscope.aliyuncs.com/compatible-mode/v1" &&
      model === "qwen3.6-plus"
    ) {
      return true;
    }
    if (
      role === "IMAGE" &&
      endpoint === "https://tokenhub.tencentmaas.com/v1/api/image" &&
      model === "hy-image-v3.0"
    ) {
      return true;
    }
    if (
      role === "CHAT" &&
      endpoint === "https://api.moonshot.cn/v1" &&
      model === "kimi-k2.6"
    ) {
      return true;
    }
    if (
      role === "ANALYSIS" &&
      endpoint === "https://api.moonshot.cn/v1" &&
      model === "kimi-k2.6"
    ) {
      return true;
    }
    if (
      role === "DEEPTHINK" &&
      endpoint === "https://dashscope.aliyuncs.com/compatible-mode/v1" &&
      (model === "qwen3.6-max-preview" || model === "qwen3.6-plus")
    ) {
      return true;
    }
    if (dbSettings.apiKey) return false;
    return (
      role === "ASR" &&
      endpoint === "https://api.openai.com/v1" &&
      model === "whisper-1"
    ) || (
      role === "REALTIME" &&
      endpoint === "https://api.openai.com/v1" &&
      model === "gpt-4o-audio-preview"
    );
  }

  function normalizeModelOptions(role, value) {
    const raw = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    if (role === "image") {
      return dropUndefined({
        size: cleanSize(raw.size) || "2048*2048",
        n: cleanInteger(raw.n, 1, 6, 1),
        prompt_extend: cleanBoolean(raw.prompt_extend, true),
        watermark: cleanBoolean(raw.watermark, false),
        negative_prompt: cleanString(raw.negative_prompt, 500),
        seed: cleanOptionalInteger(raw.seed, 0, 2147483647),
        useReferenceImage: cleanBoolean(raw.useReferenceImage, true)
      });
    }
    if (role === "video") {
      const resolution = String(raw.resolution || "720P").toUpperCase();
      const ratio = String(raw.ratio || "16:9");
      return dropUndefined({
        resolution: ["720P", "1080P"].includes(resolution) ? resolution : "720P",
        ratio: ["16:9", "9:16", "1:1", "4:3", "3:4"].includes(ratio) ? ratio : "16:9",
        duration: cleanInteger(raw.duration, 3, 15, 5),
        watermark: cleanBoolean(raw.watermark, false),
        seed: cleanOptionalInteger(raw.seed, 0, 2147483647),
        useReferenceImage: cleanBoolean(raw.useReferenceImage, true),
        imageModel: cleanString(raw.imageModel, 120) || "happyhorse-1.0-i2v",
        textModel: cleanString(raw.textModel, 120) || "happyhorse-1.0-t2v",
        pollIntervalMs: cleanInteger(raw.pollIntervalMs, 1000, 60000, videoPollIntervalMs),
        pollAttempts: cleanInteger(raw.pollAttempts, 1, 120, videoPollAttempts)
      });
    }
    if (role === "analysis") {
      return dropUndefined({
        top_p: cleanOptionalNumber(raw.top_p, 0.01, 1),
        max_tokens: cleanOptionalInteger(raw.max_tokens, 1, 200000),
        enableWebSearch: cleanBoolean(raw.enableWebSearch, true),
        jsonObjectResponse: cleanBoolean(raw.jsonObjectResponse, false),
        enableThinkingParam: cleanBoolean(raw.enableThinkingParam, false)
      });
    }
    if (role === "chat") {
      return dropUndefined({
        top_p: cleanOptionalNumber(raw.top_p, 0.01, 1),
        max_tokens: cleanOptionalInteger(raw.max_tokens, 1, 200000),
        enableWebSearch: cleanBoolean(raw.enableWebSearch, true),
        enableWebExtractor: cleanBoolean(raw.enableWebExtractor, true),
        enableCodeInterpreter: cleanBoolean(raw.enableCodeInterpreter, true),
        enableCanvasTools: cleanBoolean(raw.enableCanvasTools, true),
        enablePreviousResponse: cleanBoolean(raw.enablePreviousResponse, true),
        enableThinkingParam: cleanBoolean(raw.enableThinkingParam, false),
        showActionPolicyTrace: cleanBoolean(raw.showActionPolicyTrace, false)
      });
    }
    if (role === "asr") {
      return {
        targetLanguage: ["auto", "zh", "en"].includes(raw.targetLanguage) ? raw.targetLanguage : "auto",
        chunkMs: cleanInteger(raw.chunkMs, 600, 6000, 1800)
      };
    }
    if (role === "realtime") {
      return dropUndefined({
        voice: cleanString(raw.voice, 64) || "Ethan",
        outputAudio: cleanBoolean(raw.outputAudio, false),
        enableSearch: cleanBoolean(raw.enableSearch, false),
        smoothOutput: raw.smoothOutput === true || raw.smoothOutput === false ? raw.smoothOutput : "auto",
        transcriptionModel: cleanString(raw.transcriptionModel, 120) || "qwen3-asr-flash-realtime",
        chunkMs: cleanInteger(raw.chunkMs, 800, 8000, 3200),
        silenceThreshold: cleanOptionalNumber(raw.silenceThreshold, 0.001, 0.08) ?? 0.012,
        top_p: cleanOptionalNumber(raw.top_p, 0.01, 1)
      });
    }
    if (role === "deepthink") {
      const isPreviousDefault =
        raw.sourceCardMode === "list" &&
        Number(raw.maxCanvasCards) === 5 &&
        Number(raw.maxReferenceCards) === 8 &&
        Number(raw.liveCanvasCards) === 3;
      const source = isPreviousDefault
        ? { ...raw, sourceCardMode: "cards", maxCanvasCards: maxDeepResearchCanvasCards, maxReferenceCards: maxDeepResearchCanvasCards, liveCanvasCards: 6 }
        : raw;
      return dropUndefined({
        top_p: cleanOptionalNumber(source.top_p, 0.01, 1),
        max_tokens: cleanOptionalInteger(source.max_tokens, 1, 200000),
        sourceCardMode: ["list", "cards", "off"].includes(source.sourceCardMode) ? source.sourceCardMode : "cards",
        maxCanvasCards: cleanInteger(source.maxCanvasCards, 1, maxDeepResearchCanvasCards, maxDeepResearchCanvasCards),
        maxReferenceCards: cleanInteger(source.maxReferenceCards, 0, maxDeepResearchCanvasCards, maxDeepResearchCanvasCards),
        liveCanvasCards: cleanInteger(source.liveCanvasCards, 0, maxDeepResearchCanvasCards, 6),
        outputFormat: cleanString(source.outputFormat, 80) || "model_summary_report",
        incrementalOutput: cleanBoolean(source.incrementalOutput, true)
      });
    }
    return dropUndefined({
      top_p: cleanOptionalNumber(raw.top_p, 0.01, 1),
      max_tokens: cleanOptionalInteger(raw.max_tokens, 1, 200000)
    });
  }

  function roleHealth(config) {
    return {
      mode: isDemoRole(config) ? "demo" : "api",
      provider: config.provider,
      model: config.model,
      baseUrl: config.baseUrl
    };
  }

  function isDemoRole(config) {
    return demoMode || !config.apiKey;
  }

  return {
    buildImageSearchConfig,
    buildModelConfig,
    isDemoRole,
    roleHealth
  };
}

export function inferProviderFromEndpoint(endpoint, fallback) {
  const normalized = String(endpoint || "").toLowerCase();
  if (normalized.includes("/api/v1/services/aigc/multimodal-generation/generation")) return "dashscope-qwen-image";
  if (normalized.includes("/api/v1/services/aigc/video-generation/video-synthesis")) return "dashscope-happyhorse-video";
  if (normalized.includes("/api/v1/services/aigc/text-generation/generation")) return "dashscope-deep-research";
  if (normalized.includes("dashscope.aliyuncs.com")) return "dashscope-qwen";
  if (normalized.includes("xiaomimimo.com")) return "openai-compatible";
  return fallback;
}

export function parseEnvOptions(role) {
  const raw = process.env[`${role}_OPTIONS`];
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    console.warn(`[settings] Ignoring invalid ${role}_OPTIONS JSON.`);
    return {};
  }
}

export function cleanString(value, max = 256) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

export function cleanBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

export function cleanInteger(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

export function cleanOptionalInteger(value, min, max) {
  if (value === "" || value === null || value === undefined) return undefined;
  const number = Number(value);
  if (!Number.isFinite(number)) return undefined;
  return Math.min(max, Math.max(min, Math.round(number)));
}

export function cleanOptionalNumber(value, min, max) {
  if (value === "" || value === null || value === undefined) return undefined;
  const number = Number(value);
  if (!Number.isFinite(number)) return undefined;
  return Math.min(max, Math.max(min, number));
}

export function cleanSize(value) {
  const size = cleanString(value, 32).replace(/[xX]/g, "*");
  return /^\d{3,4}\*\d{3,4}$/.test(size) ? size : "";
}

export function dropUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

export function firstEnv(keys) {
  for (const key of keys) {
    if (process.env[key]) return process.env[key];
  }
  return "";
}

export function applyReasoningMode(payload, config, thinkingMode) {
  if (!payload || !config) return payload;
  if (config.provider === "anthropic") {
    payload.thinking = { type: thinkingMode === "thinking" ? "enabled" : "disabled" };
  } else if (config.provider === "openrouter") {
    payload.reasoning = { effort: thinkingMode === "thinking" ? "high" : "none", exclude: thinkingMode !== "thinking" };
  } else if (isKimiChatConfig(config)) {
    payload.thinking = { type: thinkingMode === "thinking" ? "enabled" : "disabled" };
  } else if (isMiMoChatConfig(config) && config.options?.enableThinkingParam !== false) {
    payload.thinking = { type: thinkingMode === "thinking" ? "enabled" : "disabled" };
  } else if (isDashScopeQwenConfig(config)) {
    payload.enable_thinking = thinkingMode === "thinking";
  }
  return payload;
}

export function isKimiChatConfig(config) {
  const provider = String(config?.provider || "").toLowerCase();
  const baseUrl = String(config?.baseUrl || "").toLowerCase();
  const model = String(config?.model || "").toLowerCase();
  return provider === "kimi" || baseUrl.includes("moonshot") || model.startsWith("kimi-");
}

export function isMiMoChatConfig(config) {
  const provider = String(config?.provider || "").toLowerCase();
  const baseUrl = String(config?.baseUrl || "").toLowerCase();
  const model = String(config?.model || "").toLowerCase();
  return provider.includes("mimo") || baseUrl.includes("xiaomimimo.com") || model.includes("mimo");
}

export function shouldUseQwenResponsesTransport(config) {
  return isDashScopeQwenConfig(config);
}

export function isDashScopeQwenConfig(config) {
  if (config?.provider === "dashscope-deep-research") return false;
  if (config?.provider === "dashscope-qwen-image") return false;
  if (/qwen-deep-research/i.test(config?.model || "")) return false;
  return config?.provider === "dashscope-qwen" || /dashscope\.aliyuncs\.com/i.test(config?.baseUrl || "");
}

export function isDashScopeQwenImageConfig(config) {
  return (
    config?.provider === "dashscope-qwen-image" ||
    /qwen-image/i.test(config?.model || "") ||
    /\/api\/v1\/services\/aigc\/multimodal-generation\/generation/i.test(config?.baseUrl || "")
  );
}

export function isDashScopeHappyHorseVideoConfig(config) {
  return (
    config?.provider === "dashscope-happyhorse-video" ||
    /happyhorse/i.test(config?.model || "") ||
    /\/api\/v1\/services\/aigc\/video-generation\/video-synthesis/i.test(config?.baseUrl || "")
  );
}

export function isDashScopeDeepResearchConfig(config) {
  return config?.provider === "dashscope-deep-research" || /qwen-deep-research/i.test(config?.model || "") || /\/api\/v1\/services\/aigc\/text-generation\/generation/i.test(config?.baseUrl || "");
}

export function applyWebSearchMode(payload, config, enabled = true, options = {}) {
  if (enabled && config?.options?.enableWebSearch !== false && isDashScopeQwenConfig(config)) {
    payload.enable_search = true;
    payload.search_options = {
      ...(payload.search_options || {}),
      enable_source: true,
      enable_citation: true,
      citation_format: "[ref_<number>]",
      forced_search: true,
      search_strategy: options.strategy || "max"
    };
  }
  return payload;
}

export function applyJsonObjectResponseMode(payload, config, enabled = true) {
  if (enabled && (isDashScopeQwenConfig(config) || isMiMoChatConfig(config) || isKimiChatConfig(config) || config?.provider === "openai-compatible")) {
    payload.response_format = { type: "json_object" };
  }
  return payload;
}

export function applyRequestOptions(payload, config) {
  const options = config?.options || {};
  if (payload.max_tokens === undefined && Number.isInteger(options.max_tokens)) {
    payload.max_tokens = options.max_tokens;
  }
  if (isKimiChatConfig(config)) {
    applyKimiRequestOptions(payload, config);
  } else {
    if (payload.temperature === undefined && typeof config?.temperature === "number") {
      payload.temperature = config.temperature;
    }
    if (payload.top_p === undefined && typeof options.top_p === "number") {
      payload.top_p = options.top_p;
    }
  }
  return payload;
}

export function applyKimiRequestOptions(payload, config) {
  if (isKimiFixedTemperatureConfig(config)) {
    delete payload.temperature;
  } else if (payload.temperature === undefined && typeof config?.temperature === "number") {
    payload.temperature = Math.min(1, Math.max(0, config.temperature));
  }
  delete payload.top_p;
  delete payload.n;
  delete payload.presence_penalty;
  delete payload.frequency_penalty;
  if (payload.tool_choice && !["auto", "none"].includes(payload.tool_choice)) {
    payload.tool_choice = "auto";
  }
  return payload;
}

export function isKimiFixedTemperatureConfig(config) {
  const model = String(config?.model || "").toLowerCase();
  return model.includes("kimi-k2.6") || model.includes("kimi-k2.5") || model.includes("kimi-k2-thinking");
}
