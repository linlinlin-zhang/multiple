import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const DEFAULTS = {
  analysis: { endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen3.6-plus", apiKey: "", temperature: 0.7, options: { enableWebSearch: true, jsonObjectResponse: false } },
  chat: { endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen3.6-plus", apiKey: "", temperature: 0.7, options: { enableWebSearch: true, enableWebExtractor: true, enableCodeInterpreter: true, enableCanvasTools: true, enablePreviousResponse: true } },
  image: {
    endpoint: "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation",
    model: "qwen-image-2.0-pro",
    apiKey: "",
    temperature: 0.7,
    options: {
      size: "2048*2048",
      n: 1,
      prompt_extend: true,
      watermark: false,
      negative_prompt: "",
      useReferenceImage: true
    }
  },
  video: {
    endpoint: "https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis",
    model: "happyhorse-1.0-i2v",
    apiKey: "",
    temperature: 0.7,
    options: {
      resolution: "720P",
      ratio: "16:9",
      duration: 5,
      watermark: false,
      useReferenceImage: true,
      imageModel: "happyhorse-1.0-i2v",
      textModel: "happyhorse-1.0-t2v",
      pollIntervalMs: 15000,
      pollAttempts: 30
    }
  },
  asr: {
    endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "qwen3-livetranslate-flash-2025-12-01",
    apiKey: "",
    temperature: 0,
    options: { targetLanguage: "auto", chunkMs: 1800 }
  },
  realtime: {
    endpoint: "wss://dashscope.aliyuncs.com/api-ws/v1/realtime",
    model: "qwen3.5-omni-plus-realtime",
    apiKey: "",
    temperature: 0.7,
    options: {
      voice: "Ethan",
      outputAudio: false,
      enableSearch: false,
      smoothOutput: "auto",
      transcriptionModel: "qwen3-asr-flash-realtime",
      chunkMs: 3200,
      silenceThreshold: 0.012
    }
  },
  deepthink: {
    endpoint: "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
    model: "qwen-deep-research",
    apiKey: "",
    temperature: 0.7,
    options: {
      sourceCardMode: "cards",
      maxCanvasCards: 20,
      maxReferenceCards: 20,
      liveCanvasCards: 6,
      outputFormat: "model_summary_report",
      incrementalOutput: true
    }
  }
};

const ROLES = ["analysis", "chat", "image", "video", "asr", "realtime", "deepthink"];

export async function handleGetSettings(res) {
  const rows = await prisma.settings.findMany();
  const map = Object.fromEntries(rows.map(r => [r.role, rowToSettings(r)]));
  const result = {};
  for (const role of ROLES) {
    result[role] = isLegacyDefault(role, map[role]) ? defaultSettings(role) : (map[role] || defaultSettings(role));
    result[role] = publicSettings(result[role]);
  }
  const globalRow = rows.find(r => r.role === "global");
  result.theme = globalRow?.theme || "light";
  result.language = globalRow?.language || "zh";
  res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-cache" });
  res.end(JSON.stringify(result));
}

function rowToSettings(row) {
  return {
    endpoint: row.endpoint,
    model: row.model,
    apiKey: row.apiKey,
    temperature: row.temperature,
    options: normalizeOptions(row.role, row.options)
  };
}

function defaultSettings(role) {
  const base = DEFAULTS[role] || {};
  return {
    endpoint: base.endpoint || "",
    model: base.model || "",
    apiKey: base.apiKey || "",
    temperature: typeof base.temperature === "number" ? base.temperature : 0.7,
    options: normalizeOptions(role, base.options)
  };
}

function publicSettings(settings) {
  return {
    ...settings,
    apiKey: "",
    hasApiKey: Boolean(settings.apiKey)
  };
}

function isLegacyDefault(role, settings) {
  if (!settings) return false;
  const endpoint = String(settings.endpoint || "").replace(/\/+$/, "");
  const model = String(settings.model || "");
  if (
    role === "image" &&
    endpoint === "https://tokenhub.tencentmaas.com/v1/api/image" &&
    model === "hy-image-v3.0"
  ) {
    return true;
  }
  if (
    role === "chat" &&
    endpoint === "https://api.moonshot.cn/v1" &&
    model === "kimi-k2.6"
  ) {
    return true;
  }
  if (
    role === "analysis" &&
    endpoint === "https://api.moonshot.cn/v1" &&
    model === "kimi-k2.6"
  ) {
    return true;
  }
  if (
    role === "deepthink" &&
    endpoint === "https://dashscope.aliyuncs.com/compatible-mode/v1" &&
    (model === "qwen3.6-max-preview" || model === "qwen3.6-plus")
  ) {
    return true;
  }
  if (settings.apiKey) return false;
  return (
    role === "asr" &&
    endpoint === "https://api.openai.com/v1" &&
    model === "whisper-1"
  ) || (
    role === "realtime" &&
    endpoint === "https://api.openai.com/v1" &&
    model === "gpt-4o-audio-preview"
  );
}

function normalizeOptions(role, value) {
  const raw = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const base = DEFAULTS[role]?.options || {};
  const merged = { ...base, ...raw };

  if (role === "image") {
    return dropUndefined({
      size: cleanSize(merged.size) || "2048*2048",
      n: cleanInteger(merged.n, 1, 6, 1),
      prompt_extend: cleanBoolean(merged.prompt_extend, true),
      watermark: cleanBoolean(merged.watermark, false),
      negative_prompt: cleanString(merged.negative_prompt, 500),
      seed: cleanOptionalInteger(merged.seed, 0, 2147483647),
      useReferenceImage: cleanBoolean(merged.useReferenceImage, true)
    });
  }

  if (role === "video") {
    const resolution = String(merged.resolution || "720P").toUpperCase();
    const ratio = String(merged.ratio || "16:9");
    return dropUndefined({
      resolution: ["720P", "1080P"].includes(resolution) ? resolution : "720P",
      ratio: ["16:9", "9:16", "1:1", "4:3", "3:4"].includes(ratio) ? ratio : "16:9",
      duration: cleanInteger(merged.duration, 3, 15, 5),
      watermark: cleanBoolean(merged.watermark, false),
      seed: cleanOptionalInteger(merged.seed, 0, 2147483647),
      useReferenceImage: cleanBoolean(merged.useReferenceImage, true),
      imageModel: cleanString(merged.imageModel, 120) || "happyhorse-1.0-i2v",
      textModel: cleanString(merged.textModel, 120) || "happyhorse-1.0-t2v",
      pollIntervalMs: cleanInteger(merged.pollIntervalMs, 1000, 60000, 15000),
      pollAttempts: cleanInteger(merged.pollAttempts, 1, 120, 30)
    });
  }

  if (role === "analysis") {
    return dropUndefined({
      top_p: cleanOptionalNumber(merged.top_p, 0.01, 1),
      max_tokens: cleanOptionalInteger(merged.max_tokens, 1, 200000),
      enableWebSearch: cleanBoolean(merged.enableWebSearch, true),
      jsonObjectResponse: cleanBoolean(merged.jsonObjectResponse, false)
    });
  }

  if (role === "chat") {
    return dropUndefined({
      top_p: cleanOptionalNumber(merged.top_p, 0.01, 1),
      max_tokens: cleanOptionalInteger(merged.max_tokens, 1, 200000),
      enableWebSearch: cleanBoolean(merged.enableWebSearch, true),
      enableWebExtractor: cleanBoolean(merged.enableWebExtractor, true),
      enableCodeInterpreter: cleanBoolean(merged.enableCodeInterpreter, true),
      enableCanvasTools: cleanBoolean(merged.enableCanvasTools, true),
      enablePreviousResponse: cleanBoolean(merged.enablePreviousResponse, true)
    });
  }

  if (role === "asr") {
    const targetLanguage = ["auto", "zh", "en"].includes(merged.targetLanguage) ? merged.targetLanguage : "auto";
    return {
      targetLanguage,
      chunkMs: cleanInteger(merged.chunkMs, 600, 6000, 1800)
    };
  }

  if (role === "realtime") {
    const smoothOutput = merged.smoothOutput === true || merged.smoothOutput === false ? merged.smoothOutput : "auto";
    return dropUndefined({
      voice: cleanString(merged.voice, 64) || "Ethan",
      outputAudio: cleanBoolean(merged.outputAudio, false),
      enableSearch: cleanBoolean(merged.enableSearch, false),
      smoothOutput,
      transcriptionModel: cleanString(merged.transcriptionModel, 120) || "qwen3-asr-flash-realtime",
      chunkMs: cleanInteger(merged.chunkMs, 800, 8000, 3200),
      silenceThreshold: cleanOptionalNumber(merged.silenceThreshold, 0.001, 0.08) ?? 0.012,
      top_p: cleanOptionalNumber(merged.top_p, 0.01, 1)
    });
  }

  if (role === "deepthink") {
    const isPreviousDefault =
      raw.sourceCardMode === "list" &&
      Number(raw.maxCanvasCards) === 5 &&
      Number(raw.maxReferenceCards) === 8 &&
      Number(raw.liveCanvasCards) === 3;
    const source = isPreviousDefault ? { ...merged, sourceCardMode: "cards", maxCanvasCards: 20, maxReferenceCards: 20, liveCanvasCards: 6 } : merged;
    return dropUndefined({
      top_p: cleanOptionalNumber(source.top_p, 0.01, 1),
      max_tokens: cleanOptionalInteger(source.max_tokens, 1, 200000),
      sourceCardMode: ["list", "cards", "off"].includes(source.sourceCardMode) ? source.sourceCardMode : "cards",
      maxCanvasCards: cleanInteger(source.maxCanvasCards, 1, 20, 20),
      maxReferenceCards: cleanInteger(source.maxReferenceCards, 0, 20, 20),
      liveCanvasCards: cleanInteger(source.liveCanvasCards, 0, 20, 6),
      outputFormat: cleanString(source.outputFormat, 80) || "model_summary_report",
      incrementalOutput: cleanBoolean(source.incrementalOutput, true)
    });
  }

  return dropUndefined({
    top_p: cleanOptionalNumber(merged.top_p, 0.01, 1),
    max_tokens: cleanOptionalInteger(merged.max_tokens, 1, 200000)
  });
}

function cleanString(value, max = 256) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function cleanBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function cleanInteger(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function cleanOptionalInteger(value, min, max) {
  if (value === "" || value === null || value === undefined) return undefined;
  const number = Number(value);
  if (!Number.isFinite(number)) return undefined;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function cleanOptionalNumber(value, min, max) {
  if (value === "" || value === null || value === undefined) return undefined;
  const number = Number(value);
  if (!Number.isFinite(number)) return undefined;
  return Math.min(max, Math.max(min, number));
}

function cleanSize(value) {
  const size = cleanString(value, 32).replace(/[xX]/g, "*");
  return /^\d{3,4}\*\d{3,4}$/.test(size) ? size : "";
}

function dropUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

export async function handleUpdateSettings(body, res, req = null) {
  if (!body || typeof body !== "object") {
    res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Invalid body" }));
    return;
  }
  const result = {};
  const hasRoleSettings = ROLES.some((role) => body[role] && typeof body[role] === "object");
  if (hasRoleSettings && !isSettingsAdmin(req)) {
    res.writeHead(403, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-cache" });
    res.end(JSON.stringify({ error: "Settings updates are disabled for public visitors" }));
    return;
  }

  // Handle theme update (global row)
  if (typeof body.theme === "string") {
    const themeValue = body.theme === "dark" ? "dark" : "light";
    const globalUpserted = await prisma.settings.upsert({
      where: { role: "global" },
      update: { theme: themeValue },
      create: { role: "global", endpoint: "", model: "", apiKey: "", theme: themeValue }
    });
    result.theme = globalUpserted.theme;
  }

  // Handle language update (global row)
  if (typeof body.language === "string") {
    const langValue = body.language === "en" ? "en" : "zh";
    const globalUpserted = await prisma.settings.upsert({
      where: { role: "global" },
      update: { language: langValue },
      create: { role: "global", endpoint: "", model: "", apiKey: "", language: langValue }
    });
    result.language = globalUpserted.language;
  }

  for (const role of ROLES) {
    const cfg = body[role];
    if (!cfg || typeof cfg !== "object") continue;
    const endpoint = typeof cfg.endpoint === "string" ? cfg.endpoint.trim() : "";
    const model = typeof cfg.model === "string" ? cfg.model.trim() : "";
    const apiKey = typeof cfg.apiKey === "string" ? cfg.apiKey.trim() : "";
    let temperature = typeof cfg.temperature === "number" ? cfg.temperature : 0.7;
    temperature = Math.min(2, Math.max(0, temperature));
    const options = normalizeOptions(role, cfg.options);
    const upserted = await prisma.settings.upsert({
      where: { role },
      update: { endpoint, model, apiKey, temperature, options },
      create: { role, endpoint, model, apiKey, temperature, options }
    });
    result[role] = publicSettings(rowToSettings(upserted));
  }
  res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-cache" });
  res.end(JSON.stringify(result));
}

function isSettingsAdmin(req) {
  const token = process.env.SETTINGS_ADMIN_TOKEN || "";
  if (!token || !req) return false;
  const headerToken = req.headers["x-settings-token"];
  if (typeof headerToken === "string" && headerToken === token) return true;
  const auth = req.headers.authorization || "";
  return auth === `Bearer ${token}`;
}
