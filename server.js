import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleCreateSession, handleGetSession, handleUpdateSession, handleExportSession } from "./src/api/sessions.js";
import { handleListHistory } from "./src/api/history.js";
import { handleStoreAsset, handleGetAsset } from "./src/api/assets.js";
import { handleCreateShare, handleGetShare, handleCreateImageShare, handleGetImageShare } from "./src/api/share.js";
import { handleImportSession } from "./src/api/import.js";
import { handleGetSettings, handleUpdateSettings } from "./src/api/settings.js";
import { handleListMaterials, handleCreateMaterial, handleDeleteMaterial, handleGetMaterialFile } from "./src/api/materials.js";
import { ensureStorageDirs, storeDataUrl, storeFile } from "./src/lib/storage.js";
import { extractTextFromBuffer } from "./src/lib/textExtract.js";
import { PrismaClient } from "@prisma/client";
import WebSocket from "ws";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");

loadDotEnv(path.join(__dirname, ".env"));

const PORT = Number(process.env.PORT || 3000);
const DEMO_MODE = process.env.DEMO_MODE === "true";

const prisma = new PrismaClient();

let runtimeConfigs = {
  chat: buildModelConfig("CHAT", {
    provider: "dashscope-qwen",
    model: "qwen3.6-plus",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKeyEnv: ["DASHSCOPE_API_KEY", "CHAT_API_KEY"]
  }),
  analysis: buildModelConfig("ANALYSIS", {
    provider: "kimi",
    model: "kimi-k2.6",
    baseUrl: "https://api.moonshot.cn/v1",
    apiKeyEnv: ["KIMI_API_KEY", "MOONSHOT_API_KEY"]
  }),
  image: buildModelConfig("IMAGE", {
    provider: "tencent-tokenhub-image",
    model: "hy-image-v3.0",
    baseUrl: "https://tokenhub.tencentmaas.com/v1/api/image",
    apiKeyEnv: ["TENCENT_TOKENHUB_API_KEY", "TOKENHUB_API_KEY"]
  }),
  asr: buildModelConfig("ASR", {
    provider: "dashscope-livetranslate",
    model: "qwen3-livetranslate-flash-2025-12-01",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKeyEnv: ["DASHSCOPE_API_KEY", "ASR_API_KEY"]
  }),
  realtime: buildModelConfig("REALTIME", {
    provider: "dashscope-realtime",
    model: "qwen3.5-omni-plus-realtime",
    baseUrl: "wss://dashscope.aliyuncs.com/api-ws/v1/realtime",
    apiKeyEnv: ["DASHSCOPE_API_KEY", "REALTIME_API_KEY"]
  }),
  deepthink: buildModelConfig("DEEPTHINK", {
    provider: "dashscope-qwen",
    model: "qwen3.6-plus",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKeyEnv: ["DASHSCOPE_API_KEY", "DEEPTHINK_API_KEY"]
  })
};

const IMAGE_POLL_INTERVAL_MS = Number(process.env.IMAGE_POLL_INTERVAL_MS || 2000);
const IMAGE_POLL_ATTEMPTS = Number(process.env.IMAGE_POLL_ATTEMPTS || 30);
const IMAGE_INCLUDE_DATA_URL = process.env.IMAGE_INCLUDE_DATA_URL === "true";
const MAX_BODY_BYTES = 22 * 1024 * 1024;
const CHAT_COMPLETION_TIMEOUT_MS = Number(process.env.CHAT_COMPLETION_TIMEOUT_MS || 120000);
const EXPLORE_THINKING_TIMEOUT_MS = Number(process.env.EXPLORE_THINKING_TIMEOUT_MS || 120000);
const EXPLORE_FALLBACK_TIMEOUT_MS = Number(process.env.EXPLORE_FALLBACK_TIMEOUT_MS || 60000);

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/api/health") {
      return sendJson(res, 200, {
        ok: true,
        mode: appMode(),
        chat: roleHealth(runtimeConfigs.chat),
        analysis: roleHealth(runtimeConfigs.analysis),
        image: roleHealth(runtimeConfigs.image),
        asr: roleHealth(runtimeConfigs.asr),
        realtime: roleHealth(runtimeConfigs.realtime),
        deepthink: roleHealth(runtimeConfigs.deepthink)
      });
    }

    if (req.method === "GET" && url.pathname === "/api/settings") {
      return await handleGetSettings(res);
    }

    if (req.method === "PUT" && url.pathname === "/api/settings") {
      const body = await readJson(req);
      const result = await handleUpdateSettings(body, res);
      await refreshConfigs();
      return result;
    }

    if (req.method === "POST" && url.pathname === "/api/chat") {
      const body = await readJson(req);
      return await handleChat(body, res);
    }

    if (req.method === "POST" && url.pathname === "/api/asr") {
      const body = await readJson(req);
      return await handleAsr(body, res);
    }

    if (req.method === "POST" && url.pathname === "/api/realtime-voice") {
      const body = await readJson(req);
      return await handleRealtimeVoice(body, res);
    }

    if (req.method === "POST" && url.pathname === "/api/deep-think") {
      const body = await readJson(req);
      return await handleDeepThink(body, res);
    }

    if (req.method === "POST" && url.pathname === "/api/analyze") {
      const body = await readJson(req);
      return await handleAnalyze(body, res);
    }

    if (req.method === "POST" && url.pathname === "/api/analyze-text") {
      const body = await readJson(req);
      return await handleAnalyzeText(body, res);
    }

    if (req.method === "POST" && url.pathname === "/api/analyze-url") {
      const body = await readJson(req);
      return await handleAnalyzeUrl(body, res);
    }

    if (req.method === "POST" && url.pathname === "/api/analyze-explore") {
      const body = await readJson(req);
      return await handleAnalyzeExplore(body, res);
    }

    if (req.method === "POST" && url.pathname === "/api/generate") {
      const body = await readJson(req);
      return await handleGenerate(body, res);
    }

    if (req.method === "POST" && url.pathname === "/api/explain") {
      const body = await readJson(req);
      return await handleExplain(body, res);
    }

    // Asset routes
    if (req.method === "POST" && url.pathname === "/api/assets") {
      const body = await readJson(req);
      return await handleStoreAsset(body, res);
    }
    if (req.method === "GET" && url.pathname.startsWith("/api/assets/")) {
      return await handleGetAsset(req, res);
    }

    // Session routes
    if (req.method === "POST" && url.pathname === "/api/sessions") {
      const body = await readJson(req);
      return await handleCreateSession(body, res);
    }
    if (req.method === "GET" && url.pathname.startsWith("/api/sessions/") && url.pathname.endsWith("/export")) {
      const id = url.pathname.split("/")[3];
      return await handleExportSession(id, res);
    }
    if (req.method === "GET" && /^\/api\/sessions\/[^/]+$/.test(url.pathname)) {
      const id = url.pathname.split("/")[3];
      return await handleGetSession(id, res);
    }
    if (req.method === "PUT" && /^\/api\/sessions\/[^/]+$/.test(url.pathname)) {
      const id = url.pathname.split("/")[3];
      const body = await readJson(req);
      return await handleUpdateSession(id, body, res);
    }

    // Import route
    if (req.method === "POST" && url.pathname === "/api/import") {
      const body = await readJson(req);
      return await handleImportSession(body, res);
    }

    // Share routes
    if (req.method === "POST" && url.pathname.startsWith("/api/sessions/") && url.pathname.endsWith("/share")) {
      const id = url.pathname.split("/")[3];
      return await handleCreateShare(id, res);
    }
    if (req.method === "GET" && url.pathname.startsWith("/api/share/")) {
      const token = url.pathname.split("/")[3];
      return await handleGetShare(token, res);
    }
    if (req.method === "POST" && url.pathname === "/api/share-image") {
      const body = await readJson(req);
      return await handleCreateImageShare(body, res);
    }
    if (req.method === "GET" && url.pathname.startsWith("/api/share-image/")) {
      const token = url.pathname.split("/")[3];
      return await handleGetImageShare(token, res);
    }

    // History route
    if (req.method === "GET" && url.pathname === "/api/history") {
      return await handleListHistory(Object.fromEntries(url.searchParams), res);
    }

    // Material library routes
    if (req.method === "GET" && url.pathname === "/api/materials") {
      return await handleListMaterials(Object.fromEntries(url.searchParams), res);
    }
    if (req.method === "POST" && url.pathname === "/api/materials") {
      const body = await readJson(req);
      return await handleCreateMaterial(body, res);
    }
    if (req.method === "DELETE" && /^\/api\/materials\/[^/]+$/.test(url.pathname)) {
      const id = url.pathname.split("/")[3];
      return await handleDeleteMaterial(id, res);
    }
    if (req.method === "GET" && /^\/api\/materials\/[^/]+\/file$/.test(url.pathname)) {
      const id = url.pathname.split("/")[3];
      return await handleGetMaterialFile(id, res);
    }

    if (req.method === "GET") {
      if (url.pathname === "/history" || url.pathname === "/history/") {
        return serveStatic("/history/index.html", res);
      }
      if (url.pathname.startsWith("/share/assets/")) {
        return serveStatic(url.pathname.replace(/^\/share/, ""), res);
      }
      if (/^\/share\/[^/]+\/?$/.test(url.pathname)) {
        return serveStatic("/share.html", res);
      }
      if (/^\/share-image\/[^/]+\/?$/.test(url.pathname)) {
        return serveStatic("/share-image.html", res);
      }
      return serveStatic(url.pathname, res);
    }

    return sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, {
      error: "Server error",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

server.listen(PORT, () => {
  console.log(`ORYZAE Image Board running at http://localhost:${PORT}`);
  console.log(`Model mode: ${appMode()}`);
});

ensureStorageDirs().catch(console.error);
refreshConfigs().catch(console.error);

async function refreshConfigs() {
  try {
    const rows = await prisma.settings.findMany();
    const dbMap = Object.fromEntries(
      rows.map((r) => [
        r.role,
        { endpoint: r.endpoint, model: r.model, apiKey: r.apiKey, temperature: r.temperature }
      ])
    );

    runtimeConfigs.chat = buildModelConfig("CHAT", {
      provider: "dashscope-qwen",
      model: "qwen3.6-plus",
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      apiKeyEnv: ["DASHSCOPE_API_KEY", "CHAT_API_KEY"]
    }, dbMap.chat);

    runtimeConfigs.analysis = buildModelConfig("ANALYSIS", {
      provider: "kimi",
      model: "kimi-k2.6",
      baseUrl: "https://api.moonshot.cn/v1",
      apiKeyEnv: ["KIMI_API_KEY", "MOONSHOT_API_KEY"]
    }, dbMap.analysis);

    runtimeConfigs.image = buildModelConfig("IMAGE", {
      provider: "tencent-tokenhub-image",
      model: "hy-image-v3.0",
      baseUrl: "https://tokenhub.tencentmaas.com/v1/api/image",
      apiKeyEnv: ["TENCENT_TOKENHUB_API_KEY", "TOKENHUB_API_KEY"]
    }, dbMap.image);

    runtimeConfigs.asr = buildModelConfig("ASR", {
      provider: "dashscope-livetranslate",
      model: "qwen3-livetranslate-flash-2025-12-01",
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      apiKeyEnv: ["DASHSCOPE_API_KEY", "ASR_API_KEY"]
    }, dbMap.asr);

    runtimeConfigs.realtime = buildModelConfig("REALTIME", {
      provider: "dashscope-realtime",
      model: "qwen3.5-omni-plus-realtime",
      baseUrl: "wss://dashscope.aliyuncs.com/api-ws/v1/realtime",
      apiKeyEnv: ["DASHSCOPE_API_KEY", "REALTIME_API_KEY"]
    }, dbMap.realtime);

    runtimeConfigs.deepthink = buildModelConfig("DEEPTHINK", {
      provider: "dashscope-qwen",
      model: "qwen3.6-plus",
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      apiKeyEnv: ["DASHSCOPE_API_KEY", "DEEPTHINK_API_KEY"]
    }, dbMap.deepthink);
  } catch (err) {
    console.warn("[refreshConfigs] Database unavailable, using env defaults:", err.message);
  }
}

function buildModelConfig(role, defaults, dbSettings = null) {
  const effectiveDbSettings = isLegacyVoiceDefault(role, dbSettings) ? null : dbSettings;
  const envProvider = process.env[`${role}_PROVIDER`] || "";
  const envBaseUrl = process.env[`${role}_API_BASE_URL`] || "";
  const envModel = process.env[`${role}_MODEL`] || "";
  const ignoreLegacyEnv = isLegacyEnvDefault(role, { provider: envProvider, endpoint: envBaseUrl, model: envModel });
  const apiKey =
    (effectiveDbSettings?.apiKey ?? "") ||
    firstEnv(defaults.apiKeyEnv || []) ||
    process.env[`${role}_API_KEY`] ||
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

  return { role: role.toLowerCase(), provider: roleProvider, apiKey, baseUrl, model, temperature };
}

function inferProviderFromEndpoint(endpoint, fallback) {
  const normalized = String(endpoint || "").toLowerCase();
  if (normalized.includes("dashscope.aliyuncs.com")) return "dashscope-qwen";
  if (normalized.includes("api.moonshot.cn")) return "kimi";
  return fallback;
}

function isLegacyEnvDefault(role, envSettings) {
  if (!envSettings) return false;
  const endpoint = String(envSettings.endpoint || "").replace(/\/+$/, "");
  const model = String(envSettings.model || "");
  const provider = String(envSettings.provider || "").toLowerCase();
  return (
    role === "CHAT" &&
    (provider === "kimi" || endpoint === "https://api.moonshot.cn/v1" || model === "kimi-k2.6")
  ) || (
    role === "DEEPTHINK" &&
    model === "qwen3.6-max-preview"
  );
}

function isLegacyVoiceDefault(role, dbSettings) {
  if (!dbSettings) return false;
  const endpoint = String(dbSettings.endpoint || "").replace(/\/+$/, "");
  const model = String(dbSettings.model || "");
  if (
    role === "CHAT" &&
    endpoint === "https://api.moonshot.cn/v1" &&
    model === "kimi-k2.6"
  ) {
    return true;
  }
  if (
    role === "DEEPTHINK" &&
    endpoint === "https://dashscope.aliyuncs.com/compatible-mode/v1" &&
    model === "qwen3.6-max-preview"
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

function firstEnv(keys) {
  for (const key of keys) {
    if (process.env[key]) return process.env[key];
  }
  return "";
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
  return DEMO_MODE || !config.apiKey;
}

function applyReasoningMode(payload, config, thinkingMode) {
  if (config.provider === "kimi" && /^kimi-k2\./.test(config.model)) {
    payload.thinking = { type: thinkingMode === "thinking" ? "enabled" : "disabled" };
  } else if (config.provider === "openrouter") {
    payload.reasoning = { effort: thinkingMode === "thinking" ? "high" : "none", exclude: thinkingMode !== "thinking" };
  } else if (isDashScopeQwenConfig(config)) {
    payload.enable_thinking = thinkingMode === "thinking";
  }
  return payload;
}

function isDashScopeQwenConfig(config) {
  return config?.provider === "dashscope-qwen" || /dashscope\.aliyuncs\.com/i.test(config?.baseUrl || "");
}

function applyWebSearchMode(payload, config, enabled = true) {
  if (enabled && isDashScopeQwenConfig(config)) {
    payload.enable_search = true;
  }
  return payload;
}

function shouldUseWebSearch(message, canvas = {}, selectedContext = null) {
  const text = String(message || "");
  if (/(联网|搜索|检索|查找|网页|网站|链接|url|最新|资料|reference|web|search|browse|lookup|internet)/i.test(text)) {
    return true;
  }
  if (selectedContext?.type === "url" || selectedContext?.url) return true;
  const nodes = Array.isArray(canvas?.nodes) ? canvas.nodes : [];
  return nodes.some((node) => node?.type === "url" || node?.url || node?.sourceType === "url");
}

function shouldUseAgentMode(message) {
  return /(agent|代理|自主|自动|连续任务|一系列|多步|分步骤|规划并执行|完成整个|帮我做完|long task|multi[-\s]?step)/i.test(String(message || ""));
}

function isTimeoutError(error) {
  return error?.name === "AbortError" || /timeout|aborted/i.test(String(error?.message || ""));
}

function shouldRetryExploreWithoutThinking(error) {
  return isTimeoutError(error) || /json|empty text|returned empty|parse/i.test(String(error?.message || ""));
}

function appMode() {
  const modes = [runtimeConfigs.chat, runtimeConfigs.analysis, runtimeConfigs.image, runtimeConfigs.asr, runtimeConfigs.realtime, runtimeConfigs.deepthink].map((config) => roleHealth(config).mode);
  if (modes.every((mode) => mode === "demo")) return "demo";
  if (modes.some((mode) => mode === "demo")) return "mixed";
  return "api";
}

async function handleAsr(body, res) {
  const audioDataUrl = typeof body?.audioDataUrl === "string" ? body.audioDataUrl : "";
  if (!isAudioDataUrl(audioDataUrl)) {
    return sendJson(res, 400, { error: "audioDataUrl is required" });
  }

  if (isDemoRole(runtimeConfigs.asr)) {
    return sendJson(res, 200, {
      provider: "demo",
      model: runtimeConfigs.asr.model,
      text: ""
    });
  }

  const language = body?.language === "en" ? "en" : "zh";
  const text = await transcribeAudio(runtimeConfigs.asr, audioDataUrl, language);
  return sendJson(res, 200, {
    provider: "api",
    model: runtimeConfigs.asr.model,
    text
  });
}

async function handleRealtimeVoice(body, res) {
  const audioDataUrl = typeof body?.audioDataUrl === "string" ? body.audioDataUrl : "";
  const pcmBase64 = typeof body?.pcmBase64 === "string" ? body.pcmBase64 : "";
  if (!isAudioDataUrl(audioDataUrl) && !isBase64Payload(pcmBase64)) {
    return sendJson(res, 400, { error: "audioDataUrl or pcmBase64 is required" });
  }

  if (isDemoRole(runtimeConfigs.realtime)) {
    return sendJson(res, 200, {
      provider: "demo",
      model: runtimeConfigs.realtime.model,
      transcript: "",
      reply: "",
      actions: []
    });
  }

  const result = await realtimeVoiceCompletion(runtimeConfigs.realtime, {
    audioDataUrl,
    pcmBase64,
    sampleRate: Number(body?.sampleRate) || 16000,
    language: body?.language === "en" ? "en" : "zh",
    selectedContext: body?.selectedContext || null,
    analysis: normalizeChatAnalysis(body?.analysis),
    messages: normalizeChatMessages(body?.messages),
    canvas: body?.canvas && typeof body.canvas === "object" ? body.canvas : {}
  });

  return sendJson(res, 200, {
    provider: "api",
    model: runtimeConfigs.realtime.model,
    ...result
  });
}

async function handleDeepThink(body, res) {
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 2400) : "";
  const analysis = normalizeChatAnalysis(body?.analysis);
  const messages = normalizeChatMessages(body?.messages);
  const lang = body?.language === "en" ? "en" : "zh";
  const selectedContext = body?.selectedContext && typeof body.selectedContext === "object" ? body.selectedContext : null;
  const canvas = body?.canvas && typeof body.canvas === "object" ? body.canvas : {};
  const prompt = message || analysis.summary || analysis.title || (lang === "en" ? "Expand this canvas." : "扩展当前画布。");

  if (isDemoRole(runtimeConfigs.deepthink)) {
    return sendJson(res, 200, buildDemoDeepThinkPlan(prompt, lang, runtimeConfigs.deepthink.model));
  }

  const payload = {
    temperature: typeof runtimeConfigs.deepthink.temperature === "number" ? runtimeConfigs.deepthink.temperature : 0.7,
    response_format: { type: "json_object" },
    enable_thinking: true,
    messages: [
      {
        role: "system",
        content: buildDeepThinkSystemPrompt(lang)
      },
      {
        role: "user",
        content: buildDeepThinkUserPrompt({
          prompt,
          analysis,
          selectedContext,
          canvas,
          messages: messages.slice(-8),
          lang
        })
      }
    ]
  };
  applyWebSearchMode(payload, runtimeConfigs.deepthink, true);

  let response;
  try {
    response = await chatCompletions(runtimeConfigs.deepthink, payload);
  } catch (error) {
    if (!/response_format|enable_thinking|unsupported|invalid/i.test(String(error?.message || ""))) {
      throw error;
    }
    const fallbackPayload = { ...payload };
    delete fallbackPayload.response_format;
    delete fallbackPayload.enable_thinking;
    response = await chatCompletions(runtimeConfigs.deepthink, fallbackPayload);
  }

  const text = collectChatContent(response).trim();
  const parsed = parseJsonFromText(text);
  const plan = normalizeDeepThinkPlan(parsed, prompt, lang);
  return sendJson(res, 200, {
    provider: "api",
    model: response?.model || runtimeConfigs.deepthink.model,
    ...plan
  });
}

async function handleChat(body, res) {
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 2000) : "";
  const imageDataUrl = normalizeDataUrl(body?.imageDataUrl);
  const analysis = normalizeChatAnalysis(body?.analysis);
  const messages = normalizeChatMessages(body?.messages);
  const thinkingMode = body?.thinkingMode === "thinking" ? "thinking" : "no-thinking";

  if (!message) {
    return sendJson(res, 400, { error: "message is required" });
  }

  if (isDemoRole(runtimeConfigs.chat)) {
    const actions = inferDemoChatActions(message);
    return sendJson(res, 200, {
      provider: "demo",
      model: runtimeConfigs.chat.model,
      reply: buildDemoChatReply(message, analysis),
      actions,
      thinkingContent: "",
      thinkingTrace: []
    });
  }

  const lang = body?.language === "en" ? "en" : "zh";
  const selectedContext = body?.selectedContext && typeof body.selectedContext === "object" ? body.selectedContext : null;
  const canvas = body?.canvas && typeof body.canvas === "object" ? body.canvas : {};
  const systemContext = typeof body?.systemContext === "string" ? body.systemContext.slice(0, 4000) : "";
  const webSearchEnabled = shouldUseWebSearch(message, canvas, selectedContext);
  const agentMode = shouldUseAgentMode(message);
  const context = lang === "en"
    ? [
        "You are the creative dialogue assistant in this canvas-based image generation app. Your task is to help users understand the current image, compare branch directions, propose new generation ideas, or organize user thoughts into executable visual directions. Answer in English, keep it concise, usually 1-3 sentences. Do not pretend to have generated a new image; if the user wants to generate, suggest clicking a direction node or explain how you would modify the prompt.",
        "",
        "Current image analysis:",
        JSON.stringify(analysis, null, 2),
        "",
        "Recent chat:",
        messages.map((item) => `${item.role}: ${item.content}`).join("\n") || "None"
      ].join("\n")
    : [
        "你是这个画布式图片生成应用里的创意对话助手。你的任务是帮助用户理解当前图片、比较分支方向、提出新的生成建议，或把用户的想法整理成可执行的视觉方向。回答用中文，保持简洁，通常 1-3 句。不要假装已经生成了新图片；如果用户想生成，请建议他点击方向节点或说明你会如何改提示词。",
        "",
        "当前图片分析：",
        JSON.stringify(analysis, null, 2),
        "",
        "最近对话：",
        messages.map((item) => `${item.role}: ${item.content}`).join("\n") || "暂无"
      ].join("\n");

  const content = [
    { type: "text", text: `${context}\n\n用户最新消息：${message}` }
  ];
  if (content[0]) {
    content[0].text = buildChatUserPrompt({
      message,
      analysis,
      selectedContext,
      canvas,
      messages,
      systemContext,
      thinkingMode,
      webSearchEnabled,
      agentMode,
      lang
    });
  }
  if (imageDataUrl) {
    content.push({ type: "image_url", image_url: { url: imageDataUrl } });
  }

  const chatPayload = {
    messages: [
      {
        role: "system",
        content: lang === "en"
          ? "You are the Kimi K2.6 no-thinking creative dialogue assistant. Answers are concise, direct, and actionable."
          : "你是 Kimi K2.6 no thinking 模式下的创意对话助手。回答简洁、直接、可执行。"
      },
      {
        role: "user",
        content
      }
    ]
  };
  chatPayload.messages[0].content = buildChatActionSystemPrompt(lang, thinkingMode);

  applyReasoningMode(chatPayload, runtimeConfigs.chat, thinkingMode);
  applyWebSearchMode(chatPayload, runtimeConfigs.chat, webSearchEnabled);

  const response = await chatCompletions(runtimeConfigs.chat, chatPayload);

  const rawReply = collectChatContent(response).trim();
  let parsed = null;
  try {
    parsed = parseJsonFromText(rawReply);
  } catch {
    parsed = null;
  }
  const reply = stringOr(parsed?.reply, rawReply);
  const actions = ensureChatFallbackActions(
    message,
    normalizeVoiceActions(parsed?.actions || parsed?.action),
    reply
  );
  const thinkingContent = thinkingMode === "thinking" ? collectReasoningContent(response) : "";
  return sendJson(res, 200, {
    provider: "api",
    model: runtimeConfigs.chat.model,
    reply: reply || (lang === "en" ? "Got it. We can keep exploring from here." : "我读到了，我们可以继续从这里展开。"),
    actions,
    thinkingContent,
    thinkingTrace: []
  });
}

async function handleAnalyze(body, res) {
  const imageDataUrl = normalizeDataUrl(body?.imageDataUrl);
  const thinkingMode = body?.thinkingMode === "thinking" ? "thinking" : "no-thinking";
  if (!imageDataUrl) {
    return sendJson(res, 400, { error: "imageDataUrl is required" });
  }

  if (isDemoRole(runtimeConfigs.analysis)) {
    return sendJson(res, 200, buildDemoAnalysis(body?.fileName));
  }

  const lang = body?.language === "en" ? "en" : "zh";
  const prompt = lang === "en"
    ? [
        "You are a visual creative director analyzing user-uploaded images for a canvas-based image generation app. Quickly understand the image content, subjects, atmosphere, and extensible narrative directions, then provide 5 different image generation directions. These directions will be displayed as branch nodes on the canvas; users click them to invoke the image generation model. Return strict JSON only, no Markdown, no code blocks.",
        "",
        "JSON structure:",
        "{",
        '  "title": "Short title under 10 words summarizing the core visual theme",',
        '  "summary": "One-sentence English summary",',
        '  "detectedSubjects": ["subject1", "subject2"],',
        '  "moodKeywords": ["keyword1", "keyword2"],',
        '  "options": [',
        "    {",
        '      "id": "short-lowercase-id",',
        '      "title": "Direction title under 10 words",',
        '      "description": "40-70 word English description of what the generated image will look like",',
        '      "prompt": "Detailed English prompt for the image generation model, specifying style, composition, lighting, materials, and key elements to preserve from the original image",',
        '      "tone": "one of cinematic/editorial/documentary/surreal/minimal/graphic",',
        '      "layoutHint": "one of portrait/landscape/square/board"',
        "    }",
        "  ]",
        "}",
        "",
        "Requirements: directions must be clearly different from each other; do not generate violent, sexual, hateful, or privacy-violating content; if the image contains people, do not identify real individuals."
      ].join("\n")
    : [
        "你是一个视觉创意导演，正在为一个画布式图片生成应用分析用户上传的图片。",
        "请快速理解图片内容、主体、氛围、可延展的叙事方向，并给出 5 个不同的成图方向。",
        "这些方向会作为画布上的分支节点展示，用户点击后会调用成图模型。",
        "请只返回严格 JSON，不要 Markdown，不要代码块。",
        "",
        "JSON 结构：",
        "{",
        '  "title": "不超过10个字的简短标题，概括图片核心视觉主题",',
        '  "summary": "一句话中文摘要",',
        '  "detectedSubjects": ["主体1", "主体2"],',
        '  "moodKeywords": ["关键词1", "关键词2"],',
        '  "options": [',
        "    {",
        '      "id": "short-lowercase-id",',
        '      "title": "不超过10个字的方向标题",',
        '      "description": "40-70字中文说明，说明生成后会是什么画面",',
        '      "prompt": "给图像生成模型的详细中文提示词，明确风格、构图、光影、材质、保留原图关键元素",',
        '      "tone": "cinematic/editorial/documentary/surreal/minimal/graphic 中的一个",',
        '      "layoutHint": "portrait/landscape/square/board 中的一个"',
        "    }",
        "  ]",
        "}",
        "",
        "要求：方向之间要明显不同；不要生成暴力、色情、仇恨或侵犯隐私的内容；如果图片包含人物，不要识别真实身份。"
      ].join("\n");

  const analysisPayload = {
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageDataUrl } }
        ]
      }
    ]
  };

  applyReasoningMode(analysisPayload, runtimeConfigs.analysis, thinkingMode);

  const response = await chatCompletions(runtimeConfigs.analysis, analysisPayload);
  const text = collectChatContent(response);
  const parsed = parseJsonFromText(text);
  const normalized = normalizeAnalysis(parsed, body?.fileName);
  normalized.provider = "api";
  normalized.model = response?.model || runtimeConfigs.analysis.model;
  return sendJson(res, 200, normalized);
}

function isValidPublicUrl(urlString) {
  if (typeof urlString !== "string" || !urlString.trim()) return false;
  if (urlString.length > 2048) return false;

  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    return false;
  }

  // Reject non-http(s) protocols
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();

  // Reject localhost and loopback
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "0.0.0.0") {
    return false;
  }

  // Reject private IP ranges
  if (/^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|127\.)/.test(hostname)) {
    return false;
  }

  return true;
}

async function fetchPublicPageText(urlString) {
  if (!isValidPublicUrl(urlString)) return "";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(urlString, {
      headers: {
        "User-Agent": "ORYZAE/0.1 link-analyzer",
        Accept: "text/html, text/plain, application/xhtml+xml"
      },
      signal: controller.signal
    });
    if (!response.ok || !isValidPublicUrl(response.url || urlString)) return "";
    const contentType = response.headers.get("content-type") || "";
    if (!/text\/html|text\/plain|application\/xhtml\+xml/i.test(contentType)) return "";
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > 800000) return "";
    const raw = (await response.text()).slice(0, 220000);
    return htmlToReadableText(raw).slice(0, 12000);
  } finally {
    clearTimeout(timer);
  }
}

function htmlToReadableText(raw) {
  return String(raw || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|section|article|header|footer|li|h[1-6]|br)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

async function handleAnalyzeExplore(body, res) {
  const imageDataUrl = normalizeDataUrl(body?.imageDataUrl);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const dataUrl = typeof body?.dataUrl === "string" ? body.dataUrl.trim() : "";
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  const fileName = typeof body?.fileName === "string" ? body.fileName.trim() : "";
  const thinkingMode = body?.thinkingMode === "thinking" ? "thinking" : "no-thinking";

  const hasContent = imageDataUrl || text || dataUrl || url;
  if (!hasContent) {
    return sendJson(res, 400, { error: "imageDataUrl, text, dataUrl, or url is required" });
  }

  if (isDemoRole(runtimeConfigs.analysis)) {
    return sendJson(res, 200, buildDemoExplore(fileName));
  }

  const lang = body?.language === "en" ? "en" : "zh";
  const prompt = lang === "en"
    ? [
        "You are a visual creative director with deep research capabilities, analyzing content for a canvas-based image generation app.",
        "Use thinking mode to deeply understand the content, subjects, atmosphere, and extensible narrative directions.",
        "Then provide 5 different image generation directions AND gather 2-4 relevant reference materials.",
        "These directions will be displayed as branch nodes on the canvas; users click them to invoke the image generation model.",
        "Return strict JSON only, no Markdown, no code blocks.",
        "",
        "JSON structure:",
        "{",
        '  "title": "Short title under 10 words summarizing the core visual theme",',
        '  "summary": "One-sentence English summary",',
        '  "detectedSubjects": ["subject1", "subject2"],',
        '  "moodKeywords": ["keyword1", "keyword2"],',
        '  "options": [',
        "    {",
        '      "id": "short-lowercase-id",',
        '      "title": "Direction title under 10 words",',
        '      "description": "40-70 word English description of what the generated image will look like",',
        '      "prompt": "Detailed English prompt for the image generation model, specifying style, composition, lighting, materials, and key elements to preserve from the original image",',
        '      "tone": "one of cinematic/editorial/documentary/surreal/minimal/graphic",',
        '      "layoutHint": "one of portrait/landscape/square/board"',
        "    }",
        "  ],",
        '  "references": [',
        "    {",
        '      "title": "Reference title",',
        '      "url": "https://example.com/reference",',
        '      "description": "Brief description of why this reference is relevant",',
        '      "type": "web"',
        "    }",
        "  ]",
        "}",
        "",
        'Reference type must be one of: "web" (website/article), "doc" (document/paper), "image" (image gallery/portfolio).',
        "Requirements: directions must be clearly different from each other; references should be real, relevant, and helpful for the creative direction; do not generate violent, sexual, hateful, or privacy-violating content."
      ].join("\n")
    : [
        "你是一个具备深度研究能力的视觉创意导演，正在为画布式图片生成应用分析内容。",
        "请使用思考模式深入理解内容、主体、氛围、可延展的叙事方向。",
        "然后给出 5 个不同的成图方向，并搜集 2-4 条相关的参考资料。",
        "这些方向会作为画布上的分支节点展示，用户点击后会调用成图模型。",
        "请只返回严格 JSON，不要 Markdown，不要代码块。",
        "",
        "JSON 结构：",
        "{",
        '  "title": "不超过10个字的简短标题，概括核心视觉主题",',
        '  "summary": "一句话中文摘要",',
        '  "detectedSubjects": ["主体1", "主体2"],',
        '  "moodKeywords": ["关键词1", "关键词2"],',
        '  "options": [',
        "    {",
        '      "id": "short-lowercase-id",',
        '      "title": "不超过10个字的方向标题",',
        '      "description": "40-70字中文说明，说明生成后会是什么画面",',
        '      "prompt": "给图像生成模型的详细中文提示词，明确风格、构图、光影、材质、保留原图关键元素",',
        '      "tone": "cinematic/editorial/documentary/surreal/minimal/graphic 中的一个",',
        '      "layoutHint": "portrait/landscape/square/board 中的一个"',
        "    }",
        "  ],",
        '  "references": [',
        "    {",
        '      "title": "参考资料标题",',
        '      "url": "https://example.com/reference",',
        '      "description": "简要说明这条参考为什么相关",',
        '      "type": "web"',
        "    }",
        "  ]",
        "}",
        "",
        '参考资料 type 必须是以下之一："web"（网站/文章）、"doc"（文档/论文）、"image"（图片集/作品集）。',
        "要求：方向之间要明显不同；参考资料应当真实、相关、对创意方向有帮助；不要生成暴力、色情、仇恨或侵犯隐私的内容。"
      ].join("\n");

  const content = [];
  if (imageDataUrl) {
    content.push({ type: "text", text: prompt });
    content.push({ type: "image_url", image_url: { url: imageDataUrl } });
  } else if (url) {
    const pageText = await fetchPublicPageText(url).catch(() => "");
    content.push({
      type: "text",
      text: [
        prompt,
        "",
        `URL: ${url}`,
        pageText
          ? `Fetched page text excerpt:\n${pageText.slice(0, 6000)}`
          : "Server-side page fetch failed. If web search is available, use it to ground references and directions."
      ].join("\n")
    });
  } else if (text) {
    content.push({ type: "text", text: `${prompt}\n\n文档内容：\n${text.slice(0, 6000)}` });
  } else if (dataUrl) {
    try {
      const parsed = parseDataUrl(dataUrl);
      const ext = extensionFromFileName(fileName) || parsed.ext || "txt";
      const result = extractTextFromBuffer(parsed.buffer, ext);
      content.push({ type: "text", text: `${prompt}\n\n文档内容：\n${result.text.slice(0, 6000)}` });
    } catch (parseErr) {
      return sendJson(res, 400, { error: parseErr.message || "Failed to parse uploaded file." });
    }
  }

  const analysisPayload = {
    messages: [{ role: "user", content }]
  };

  applyReasoningMode(analysisPayload, runtimeConfigs.analysis, thinkingMode);
  applyWebSearchMode(analysisPayload, runtimeConfigs.analysis, Boolean(url));

  try {
    const response = await chatCompletions(runtimeConfigs.analysis, analysisPayload, {
      timeoutMs: thinkingMode === "thinking" ? EXPLORE_THINKING_TIMEOUT_MS : CHAT_COMPLETION_TIMEOUT_MS
    });
    const text = collectChatContent(response);
    const parsed = parseJsonFromText(text);
    const normalized = normalizeExplore(parsed, fileName);
    normalized.provider = "api";
    normalized.model = response?.model || runtimeConfigs.analysis.model;
    return sendJson(res, 200, normalized);
  } catch (error) {
    if (thinkingMode === "thinking" && shouldRetryExploreWithoutThinking(error)) {
      console.info("[handleAnalyzeExplore] thinking path failed, retrying without thinking:", error.message);
      try {
        const fallbackPayload = applyWebSearchMode(
          applyReasoningMode({ messages: analysisPayload.messages }, runtimeConfigs.analysis, "no-thinking"),
          runtimeConfigs.analysis,
          Boolean(url)
        );
        const response = await chatCompletions(runtimeConfigs.analysis, fallbackPayload, {
          timeoutMs: EXPLORE_FALLBACK_TIMEOUT_MS
        });
        const text = collectChatContent(response);
        const parsed = parseJsonFromText(text);
        const normalized = normalizeExplore(parsed, fileName);
        normalized.provider = "api";
        normalized.model = response?.model || runtimeConfigs.analysis.model;
        normalized.warningCode = "explore_fallback";
        return sendJson(res, 200, normalized);
      } catch (fallbackError) {
        console.error("[handleAnalyzeExplore] fallback error:", fallbackError);
      }
    }
    console.error("[handleAnalyzeExplore] error:", error);
    return sendJson(res, 500, { error: "Explore analysis failed", message: error.message });
  }
}

async function handleAnalyzeUrl(body, res) {
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  const thinkingMode = body?.thinkingMode === "thinking" ? "thinking" : "no-thinking";

  if (!isValidPublicUrl(url)) {
    return sendJson(res, 400, { error: "Invalid URL. Only http:// and https:// links are supported." });
  }

  let domain;
  try {
    domain = new URL(url).hostname;
  } catch {
    return sendJson(res, 400, { error: "Invalid URL. Only http:// and https:// links are supported." });
  }

  if (isDemoRole(runtimeConfigs.analysis)) {
    const demo = buildDemoAnalysis(domain);
    demo.domain = domain;
    return sendJson(res, 200, demo);
  }

  const pageText = await fetchPublicPageText(url).catch(() => "");
  const prompt = [
    "你是一个网络内容创意导演，正在为一个画布式图片生成应用分析用户提供的网页链接。",
    "请基于你对该网页内容的理解和搜索能力，总结其核心主题、视觉氛围、可延展的叙事方向，并给出 5 个不同的成图方向。",
    "这些方向会作为画布上的分支节点展示，用户点击后会调用成图模型。",
    "请只返回严格 JSON，不要 Markdown，不要代码块。",
    "",
    "JSON 结构：{ title, summary, detectedSubjects, moodKeywords, options[...] }",
    "（与图像分析完全一致的结构）",
    "",
    "要求：方向之间要明显不同；不要生成暴力、色情、仇恨或侵犯隐私的内容。",
    "",
    `网页链接：${url}`,
    `网页域名：${domain}`,
    "",
    pageText
      ? `已抓取的网页正文节选：\n${pageText.slice(0, 6000)}`
      : "服务器未能直接抓取正文；如果模型支持联网搜索，请用联网搜索补充网页主题。",
    "",
    "请尽可能基于该网页的内容主题生成视觉方向。如果无法访问该链接，请基于域名和常见内容类型给出合理的创意推测。"
  ].join("\n");

  const analysisPayload = {
    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  };

  applyReasoningMode(analysisPayload, runtimeConfigs.analysis, thinkingMode);
  applyWebSearchMode(analysisPayload, runtimeConfigs.analysis, true);

  try {
    const response = await chatCompletions(runtimeConfigs.analysis, analysisPayload);
    const text = collectChatContent(response);
    const parsed = parseJsonFromText(text);
    const normalized = normalizeAnalysis(parsed, domain);
    normalized.provider = "api";
    normalized.model = response?.model || runtimeConfigs.analysis.model;
    normalized.domain = domain;
    return sendJson(res, 200, normalized);
  } catch (error) {
    console.error("[handleAnalyzeUrl] error:", error);
    return sendJson(res, 500, { error: "URL analysis failed", message: error.message });
  }
}

async function handleAnalyzeText(body, res) {
  const fileName = typeof body?.fileName === "string" ? body.fileName.trim() : "";
  const safeFileName = fileName || "document";
  const thinkingMode = body?.thinkingMode === "thinking" ? "thinking" : "no-thinking";

  let extractedText = "";
  let storedHash = null;

  if (typeof body?.text === "string" && body.text.trim().length >= 10) {
    extractedText = body.text.trim();
  } else if (typeof body?.dataUrl === "string" && body.dataUrl.startsWith("data:")) {
    try {
      const parsed = parseDataUrl(body.dataUrl);
      const ext = extensionFromFileName(safeFileName) || parsed.ext || "txt";
      const result = extractTextFromBuffer(parsed.buffer, ext);
      extractedText = result.text;

      // Store the original file for history browser
      try {
        const stored = await storeFile(parsed.buffer, { kind: "upload", ext });
        storedHash = stored.hash;
      } catch (storeErr) {
        console.error("[handleAnalyzeText] storeFile failed:", storeErr);
      }
    } catch (parseErr) {
      return sendJson(res, 400, { error: parseErr.message || "Failed to parse uploaded file." });
    }
  }

  if (!extractedText || extractedText.length < 10) {
    return sendJson(res, 400, { error: "File appears to be empty or unreadable." });
  }

  if (isDemoRole(runtimeConfigs.analysis)) {
    const demo = buildDemoAnalysis(safeFileName);
    if (storedHash) demo.sourceHash = storedHash;
    return sendJson(res, 200, demo);
  }

  const prompt = [
    "你是一个文本创意导演，正在为一个画布式图片生成应用分析用户上传的文档。",
    "请理解文档内容、主题、氛围、可延展的视觉叙事方向，并给出 5 个不同的成图方向。",
    "这些方向会作为画布上的分支节点展示，用户点击后会调用成图模型。",
    "请只返回严格 JSON，不要 Markdown，不要代码块。",
    "",
    "JSON 结构：",
    "{",
    '  "title": "不超过10个字的简短标题，概括文档核心主题",',
    '  "summary": "一句话中文摘要",',
    '  "detectedSubjects": ["主体1", "主体2"],',
    '  "moodKeywords": ["关键词1", "关键词2"],',
    '  "options": [',
    "    {",
    '      "id": "short-lowercase-id",',
    '      "title": "不超过10个字的方向标题",',
    '      "description": "40-70字中文说明，说明生成后会是什么画面",',
    '      "prompt": "给图像生成模型的详细中文提示词，明确风格、构图、光影、材质、保留文档关键意象",',
    '      "tone": "cinematic/editorial/documentary/surreal/minimal/graphic 中的一个",',
    '      "layoutHint": "portrait/landscape/square/board 中的一个"',
    "    }",
    "  ]",
    "}",
    "",
    "要求：方向之间要明显不同；不要生成暴力、色情、仇恨或侵犯隐私的内容。",
    "",
    "文档内容：",
    extractedText.slice(0, 6000)
  ].join("\n");

  const analysisPayload = {
    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  };

  applyReasoningMode(analysisPayload, runtimeConfigs.analysis, thinkingMode);

  const response = await chatCompletions(runtimeConfigs.analysis, analysisPayload);
  const text = collectChatContent(response);
  const parsed = parseJsonFromText(text);
  const normalized = normalizeAnalysis(parsed, safeFileName);
  normalized.provider = "api";
  normalized.model = response?.model || runtimeConfigs.analysis.model;
  if (storedHash) normalized.sourceHash = storedHash;
  return sendJson(res, 200, normalized);
}

function extensionFromFileName(fileName) {
  if (!fileName) return "";
  const ext = fileName.split(".").pop()?.toLowerCase();
  return ext || "";
}

async function handleGenerate(body, res) {
  const imageDataUrl = normalizeDataUrl(body?.imageDataUrl);
  const option = normalizeOption(body?.option);
  if (!imageDataUrl || !option) {
    return sendJson(res, 400, { error: "imageDataUrl and option are required" });
  }

  if (isDemoRole(runtimeConfigs.image)) {
    return sendJson(res, 200, {
      provider: "demo",
      model: runtimeConfigs.image.model,
      prompt: option.prompt,
      imageDataUrl: buildDemoImage(option)
    });
  }

  const lang = body?.language === "en" ? "en" : "zh";
  const prompt = lang === "en"
    ? [
        "Generate a new image based on the reference image, preserving the most important subjects, color relationships, or visual memory points, but do not simply copy.",
        "Direction:",
        option.title,
        "",
        "Description:",
        option.description,
        "",
        "Detailed prompt:",
        option.prompt,
        "",
        "Output should be a complete, standalone image; clear composition; no watermarks, UI screenshot borders, or explanatory text."
      ].join("\n")
    : [
        "请基于参考图生成一张新图，保留原图最重要的主体、颜色关系或视觉记忆点，但不要只是复制。",
        "成图方向：",
        option.title,
        "",
        "方向说明：",
        option.description,
        "",
        "详细提示词：",
        option.prompt,
        "",
        "输出应是一张完整、可独立展示的图片；构图清晰；不要添加水印、UI 截图边框或说明文字。"
      ].join("\n");

  // thinkingMode is accepted for consistency but image generation APIs don't support it directly
  const result = await generateTokenHubImage(prompt, body?.imageUrl || null, imageDataUrl);

  const generatedImage = result.imageDataUrl || result.imageUrl || "";
  let stored = null;
  if (generatedImage) {
    try {
      stored = await storeGeneratedImage(generatedImage);
    } catch (storeError) {
      console.error("[handleGenerate] failed to store generated image:", storeError);
    }
  }

  return sendJson(res, 200, {
    provider: "api",
    model: runtimeConfigs.image.model,
    prompt,
    imageDataUrl: stored ? `/api/assets/${stored.hash}?kind=generated` : generatedImage,
    hash: stored ? stored.hash : undefined,
    imageUrl: result.imageUrl,
    revisedPrompt: result.revisedPrompt
  });
}

async function storeGeneratedImage(imageReference) {
  if (typeof imageReference !== "string" || !imageReference) {
    return null;
  }

  if (imageReference.startsWith("data:")) {
    return storeDataUrl(imageReference, { kind: "generated" });
  }

  if (!/^https?:\/\//i.test(imageReference)) {
    return null;
  }

  const response = await fetch(imageReference);
  if (!response.ok) {
    throw new Error(`Failed to download generated image ${response.status}: ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") || "";
  const ext = extensionFromContentType(contentType) || extensionFromUrl(imageReference) || "jpg";
  const buffer = Buffer.from(await response.arrayBuffer());
  return storeFile(buffer, { kind: "generated", ext });
}

async function handleExplain(body, res) {
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  const optionTitle = typeof body?.optionTitle === "string" ? body.optionTitle.trim() : "";
  const summary = typeof body?.summary === "string" ? body.summary.trim() : "";
  const thinkingMode = body?.thinkingMode === "thinking" ? "thinking" : "no-thinking";

  if (!prompt) {
    return sendJson(res, 400, { error: "prompt is required" });
  }

  const lang = body?.language === "en" ? "en" : "zh";

  if (isDemoRole(runtimeConfigs.chat)) {
    const demoExplanation = lang === "en"
      ? `This image was created in the "${optionTitle || "generation direction"}" direction. It preserves the core visual memory of the original image while introducing new composition and lighting, presenting a visual effect that ${summary ? summary.slice(0, 20) : "echoes the original image"}.`
      : `这张图片基于「${optionTitle || "生成方向"}」方向创作。画面保留了原图的核心视觉记忆，同时引入了新的构图与光影处理，整体呈现出 ${summary ? summary.slice(0, 20) : "与原图呼应"} 的视觉效果。`;
    return sendJson(res, 200, {
      provider: "demo",
      model: runtimeConfigs.chat.model,
      explanation: demoExplanation
    });
  }

  const context = lang === "en"
    ? [
        "You are a visual creative commentary assistant writing short descriptions for each generated image in a canvas-based image generation app. The user sees: original image analysis summary, selected creative direction, and the actual prompt sent to the image generation model. Your task is to describe in 1-2 sentences (30-60 words) what this generated image did visually, what it preserved, and what it changed. Tone: professional, concise, evocative. Do not repeat the prompt verbatim; distill it into a description the viewer can perceive.",
        "",
        "Original analysis summary:",
        summary || "None",
        "",
        "Creative direction:",
        optionTitle || "Unnamed direction",
        "",
        "Generation prompt:",
        prompt
      ].join("\n")
    : [
        "你是一位视觉创意评论助手，正在为画布式图片生成应用中的每张生成图撰写简短的内容讲解。",
        "用户会看到：原图分析摘要、选中的创作方向、以及实际发给成图模型的提示词。",
        "你的任务是用 1-2 句话（30-60 字）描述这张生成图在视觉上做了什么、保留了什么、改变了什么。",
        "语气专业、简洁、有画面感。不要重复提示词原文，要提炼成观众能感知的视觉描述。",
        "",
        "原图分析摘要：",
        summary || "暂无",
        "",
        "创作方向：",
        optionTitle || "未命名方向",
        "",
        "成图提示词：",
        prompt
      ].join("\n");

  const explainPayload = {
    messages: [
      {
        role: "system",
        content: lang === "en"
          ? "You are the Kimi K2.6 no-thinking visual creative commentary assistant. Descriptions are short, evocative, and avoid technical details."
          : "你是 Kimi K2.6 no thinking 模式下的视觉创意评论助手。讲解要短、有画面感、不提技术细节。"
      },
      {
        role: "user",
        content: context
      }
    ]
  };

  applyReasoningMode(explainPayload, runtimeConfigs.chat, thinkingMode);

  const response = await chatCompletions(runtimeConfigs.chat, explainPayload);

  const explanation = collectChatContent(response)?.trim() || "";
  return sendJson(res, 200, {
    provider: "api",
    model: runtimeConfigs.chat.model,
    explanation
  });
}

async function transcribeAudio(config, audioDataUrl, language) {
  if (isDashScopeLiveTranslateConfig(config)) {
    return dashScopeLiveTranslateTranscription(config, audioDataUrl, language);
  }

  const parsed = parseDataUrl(audioDataUrl);
  const ext = extensionFromMimeType(parsed.mimeType) || "webm";
  const form = new FormData();
  form.append("model", config.model);
  form.append("file", new Blob([parsed.buffer], { type: parsed.mimeType }), `speech.${ext}`);
  if (language === "zh" || language === "en") {
    form.append("language", language);
  }
  if (typeof config.temperature === "number") {
    form.append("temperature", String(config.temperature));
  }

  const response = await fetch(`${config.baseUrl}/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`
    },
    body: form
  });

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { text };
  }

  if (!response.ok) {
    const detail = json?.error?.message || json?.message || text || response.statusText;
    throw new Error(`${config.role} API ${response.status}: ${detail}`);
  }

  return String(json?.text || json?.transcript || json?.data?.text || "").trim();
}

function isDashScopeLiveTranslateConfig(config) {
  return config.provider === "dashscope-livetranslate" || /^qwen3-livetranslate/i.test(config.model || "");
}

async function dashScopeLiveTranslateTranscription(config, audioDataUrl, language) {
  const audio = dashScopeInputAudioFromDataUrl(audioDataUrl);
  const targetLang = language === "en" ? "en" : "zh";
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "input_audio",
              input_audio: audio
            }
          ]
        }
      ],
      modalities: ["text"],
      stream: true,
      stream_options: { include_usage: false },
      translation_options: { target_lang: targetLang }
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`${config.role} API ${response.status}: ${detail || response.statusText}`);
  }

  const text = await collectStreamingChatText(response);
  return text.trim();
}

async function realtimeVoiceCompletion(config, context) {
  if (isDashScopeRealtimeConfig(config)) {
    return dashScopeRealtimeVoiceCompletion(config, context);
  }

  const audio = audioInputFromDataUrl(context.audioDataUrl);
  const instruction = buildRealtimeInstruction(context);

  const response = await chatCompletions(config, {
    temperature: typeof config.temperature === "number" ? config.temperature : 0.7,
    modalities: ["text"],
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: instruction },
          { type: "input_audio", input_audio: audio }
        ]
      }
    ]
  });

  const text = collectChatContent(response).trim();
  let parsed;
  try {
    parsed = parseJsonFromText(text);
  } catch {
    parsed = { transcript: "", reply: text, actions: [] };
  }

  return {
    transcript: stringOr(parsed?.transcript, ""),
    reply: stringOr(parsed?.reply, text),
    actions: normalizeVoiceActions(parsed?.actions || parsed?.action),
    audioDataUrl: extractVoiceAudioDataUrl(response)
  };
}

function isDashScopeRealtimeConfig(config) {
  return config.provider === "dashscope-realtime" || /^wss:\/\//i.test(config.baseUrl || "") || /omni.*realtime|realtime/i.test(config.model || "");
}

function buildRealtimeInstruction(context) {
  const lang = context.language === "en" ? "English" : "Chinese";
  const recentMessages = context.messages
    .map((item) => `${item.role}: ${item.content}`)
    .join("\n") || "None";
  const selected = context.selectedContext
    ? JSON.stringify(context.selectedContext).slice(0, 1200)
    : "None";
  const canvas = JSON.stringify(context.canvas || {}).slice(0, 3600);

  return [
    `You are the realtime voice action planner for ORYZAE, a canvas-based image exploration app. Understand the user's spoken command in ${lang}.`,
    "Return strict JSON only. Do not wrap it in Markdown.",
    "You may return a short spoken reply plus at most 3 app actions. Use actions only when the user clearly asks the app to do something.",
    "Prefer exact nodeId values copied from Canvas state. If the user names a card but the id is uncertain, provide nodeName/query instead; never invent node IDs.",
    "For destructive actions such as delete_node, only act when the spoken command explicitly asks to delete/remove a card.",
    "Position vocabulary: left, right, above, below, center, upper-left, upper-right, lower-left, lower-right, canvas-center, screen-center.",
    "Reusable action types:",
    "zoom_in, zoom_out, set_zoom, reset_view, pan_view, focus_node, arrange_canvas, deselect, select_source, select_analysis, select_node, move_node, create_direction, create_web_card, generate_image, analyze_source, explore_source, research_source, research_node, open_references, save_session, new_chat, open_chat_history, close_chat, open_chat, open_history, open_settings, set_thinking_mode, set_deep_think_mode, open_upload, delete_node.",
    "When web search is needed, include create_web_card actions with real URLs, concise titles, and descriptions so the canvas can preserve references.",
    "Schema:",
    '{"transcript":"recognized user speech","reply":"short spoken response","actions":[{"type":"action_type","nodeId":"exact optional id","nodeName":"optional spoken card name","parentNodeId":"optional exact parent id","parentNodeName":"optional parent name","anchorNodeId":"optional exact anchor id","anchorNodeName":"optional anchor name","position":"optional position","x":0,"y":0,"dx":0,"dy":0,"scale":1,"amount":180,"mode":"optional mode","title":"optional title","description":"optional description","prompt":"optional prompt","query":"optional research/search query","url":"optional url"}]}',
    "",
    "Current selected card:",
    selected,
    "",
    "Current analysis:",
    JSON.stringify(context.analysis || {}).slice(0, 1600),
    "",
    "Canvas state:",
    canvas,
    "",
    "Recent dialogue:",
    recentMessages
  ].join("\n");
}

function buildChatActionSystemPrompt(lang = "zh", thinkingMode = "no-thinking") {
  const actionSchema = '{"reply":"short user-facing answer","actions":[{"type":"action_type","nodeId":"optional exact node id","nodeName":"optional card name","parentNodeId":"optional exact parent id","parentNodeName":"optional parent name","anchorNodeId":"optional exact anchor id","anchorNodeName":"optional anchor name","position":"optional position","x":0,"y":0,"dx":0,"dy":0,"scale":1,"amount":180,"mode":"optional mode","title":"optional title","description":"optional description","prompt":"optional prompt","query":"optional research/search query","url":"optional url"}]}';
  const common = [
    "Return strict JSON only. Do not wrap it in Markdown.",
    "You are ORYZAE's canvas dialogue and action assistant. The user may chat freely, ask for analysis, or ask the app to manipulate the canvas.",
    "Use actions only when the user clearly asks the app to do something. If the user is just chatting, return an empty actions array.",
    "Prefer exact nodeId values copied from Canvas state. If a card is named but the exact id is uncertain, provide nodeName/query instead; never invent node IDs.",
    "For destructive actions such as delete_node, only act when the user explicitly asks to delete/remove a card.",
    "Reusable action types: zoom_in, zoom_out, set_zoom, reset_view, pan_view, focus_node, arrange_canvas, deselect, select_source, select_analysis, select_node, move_node, create_direction, create_web_card, generate_image, analyze_source, explore_source, research_source, research_node, open_references, save_session, new_chat, open_chat_history, close_chat, open_chat, open_history, open_settings, set_thinking_mode, set_deep_think_mode, open_upload, delete_node.",
    "When the user asks for web search or link research, web search may be enabled for this turn. Return create_web_card actions with url/title/description for concrete web references.",
    "When the user asks for an agent, autonomous work, or a multi-step task, act as the main controller: decompose the task, return the immediate reply, and include a sequence of safe canvas actions that can be executed now. Do not claim background work exists unless represented by actions.",
    "Position vocabulary: left, right, above, below, center, upper-left, upper-right, lower-left, lower-right, canvas-center, screen-center.",
    thinkingMode === "thinking"
      ? "Reasoning mode may be enabled by the API provider. Do not include a thinkingTrace field in your JSON; any provider-side reasoning will be read from the API response metadata."
      : "Do not include thinkingTrace, reasoning, or hidden analysis fields in your JSON.",
    "Schema:",
    actionSchema
  ];

  if (lang === "en") {
    return common.join("\n");
  }
  return [
    "请用中文回答用户。",
    ...common,
    "reply 字段要自然、简洁、有帮助；不要声称已经完成没有实际 action 的操作。"
  ].join("\n");
}

function buildChatUserPrompt({ message, analysis, selectedContext, canvas, messages, systemContext, thinkingMode, webSearchEnabled, agentMode, lang }) {
  const recentMessages = messages.map((item) => `${item.role}: ${item.content}`).join("\n") || (lang === "en" ? "None" : "暂无");
  return [
    lang === "en" ? "User message:" : "用户消息：",
    message,
    "",
    lang === "en" ? "App-level context:" : "应用上下文：",
    systemContext || (lang === "en" ? "None" : "暂无"),
    "",
    lang === "en" ? "Current selected card:" : "当前选中卡片：",
    JSON.stringify(selectedContext || null, null, 2),
    "",
    lang === "en" ? "Current image analysis:" : "当前图像分析：",
    JSON.stringify(analysis || {}, null, 2).slice(0, 2200),
    "",
    lang === "en" ? "Canvas state and reusable capabilities:" : "画布状态与可复用能力：",
    JSON.stringify(canvas || {}, null, 2).slice(0, 4200),
    "",
    lang === "en" ? "Recent dialogue:" : "最近对话：",
    recentMessages,
    "",
    lang === "en" ? "Current mode:" : "当前模式：",
    thinkingMode,
    "",
    "Execution hints:",
    `web_search_enabled=${webSearchEnabled ? "true" : "false"}`,
    `agent_controller_mode=${agentMode ? "true" : "false"}`
  ].join("\n");
}

function normalizeChatThinkingTrace(value) {
  const raw = Array.isArray(value) ? value : (typeof value === "string" ? value.split(/\n+/) : []);
  return raw
    .map((item) => String(item || "").replace(/^[-*\d.\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 6)
    .map((item) => item.slice(0, 220));
}

function ensureChatFallbackActions(message, actions, reply = "") {
  const normalized = Array.isArray(actions) ? [...actions] : [];
  if (normalized.some((action) => action.type === "create_web_card")) return normalized;
  const requestText = String(message || "").normalize("NFKC");
  const wantsCard = requestText.includes("卡片") || /\bcard\b/i.test(requestText);
  const wantsWeb = /(网页|网站|链接|参考|联网|搜索|检索|查找|web|reference|search|url|link)/i.test(requestText);
  if (wantsCard && wantsWeb) {
    const query = deriveSearchQuery(message);
    normalized.push({
      type: "create_web_card",
      title: query.slice(0, 48) || "Web reference",
      description: String(reply || query).slice(0, 220),
      query,
      url: `https://www.google.com/search?q=${encodeURIComponent(query || message)}`
    });
  }
  return normalized;
}

function deriveSearchQuery(message) {
  return String(message || "")
    .replace(/请|帮我|给我|联网搜索|搜索|检索|查找|并|给出|创建|新建|生成|一个|一张|网页|网站|链接|参考|卡片|web|reference|card/gi, " ")
    .replace(/[，。,.!?！？:：；;]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 120);
}

function inferDemoChatActions(message) {
  const text = String(message || "").toLowerCase();
  const actions = [];
  if (/一键整理|整理画布|自动整理|arrange|layout/.test(text)) {
    actions.push({ type: "arrange_canvas" });
  }
  if (/保存|save/.test(text)) {
    actions.push({ type: "save_session" });
  }
  if (/新建对话|新的对话|new chat/.test(text)) {
    actions.push({ type: "new_chat" });
  }
  if (/历史对话|chat history/.test(text)) {
    actions.push({ type: "open_chat_history" });
  }
  if (/关闭对话|收起对话|close chat/.test(text)) {
    actions.push({ type: "close_chat" });
  }
  if (/打开对话|展开对话|open chat/.test(text)) {
    actions.push({ type: "open_chat" });
  }
  if (/深度思考|deep think|deep research/.test(text)) {
    actions.push({ type: "set_deep_think_mode", mode: "on" });
  }
  if (/上传|添加文件|open upload/.test(text)) {
    actions.push({ type: "open_upload" });
  }
  return normalizeVoiceActions(actions).slice(0, 3);
}

async function dashScopeRealtimeVoiceCompletion(config, context) {
  const pcmBase64 = context.pcmBase64 || pcmBase64FromAudioDataUrl(context.audioDataUrl);
  const instruction = buildRealtimeInstruction(context);
  const events = await runDashScopeRealtimeTurn(config, pcmBase64, instruction);
  const transcript = events.inputTranscript.trim();
  const responseText = (events.text || events.audioTranscript).trim();
  let parsed;
  try {
    parsed = parseJsonFromText(responseText);
  } catch {
    parsed = { transcript, reply: responseText, actions: [] };
  }

  return {
    transcript: stringOr(parsed?.transcript, transcript),
    reply: stringOr(parsed?.reply, responseText),
    actions: normalizeVoiceActions(parsed?.actions || parsed?.action),
    audioDataUrl: ""
  };
}

function runDashScopeRealtimeTurn(config, pcmBase64, instruction) {
  return new Promise((resolve, reject) => {
    const url = `${config.baseUrl.replace(/\/+$/, "")}?model=${encodeURIComponent(config.model)}`;
    const ws = new WebSocket(url, {
      headers: { Authorization: `Bearer ${config.apiKey}` }
    });
    const chunks = splitBuffer(Buffer.from(pcmBase64, "base64"), 3200);
    const result = { inputTranscript: "", text: "", audioTranscript: "" };
    let settled = false;
    let audioSent = false;

    const timer = setTimeout(() => {
      finish(new Error(`${config.role} API timeout waiting for realtime response.`));
    }, 45000);

    function finish(error) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws.close();
      } catch {
        // Ignore close errors.
      }
      if (error) reject(error);
      else resolve(result);
    }

    function send(event) {
      ws.send(JSON.stringify({
        event_id: `event_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        ...event
      }));
    }

    function sendAudioTurn() {
      if (audioSent) return;
      audioSent = true;
      for (const chunk of chunks) {
        send({ type: "input_audio_buffer.append", audio: chunk.toString("base64") });
      }
      send({ type: "input_audio_buffer.commit" });
      send({ type: "response.create" });
    }

    ws.on("open", () => {
      send({
        type: "session.update",
        session: {
          modalities: ["text"],
          instructions: instruction,
          input_audio_format: "pcm",
          output_audio_format: "pcm",
          input_audio_transcription: { model: "qwen3-asr-flash-realtime" },
          turn_detection: null
        }
      });
    });

    ws.on("message", (data) => {
      let event;
      try {
        event = JSON.parse(data.toString());
      } catch {
        return;
      }

      switch (event.type) {
        case "error":
          finish(new Error(event.error?.message || JSON.stringify(event.error || event)));
          break;
        case "session.updated":
          sendAudioTurn();
          break;
        case "conversation.item.input_audio_transcription.completed":
          result.inputTranscript = event.transcript || result.inputTranscript;
          break;
        case "response.text.delta":
          result.text += event.delta || "";
          break;
        case "response.audio_transcript.delta":
          result.audioTranscript += event.delta || "";
          break;
        case "response.audio_transcript.done":
          if (event.transcript && !result.audioTranscript) result.audioTranscript = event.transcript;
          break;
        case "response.done":
          finish();
          break;
        default:
          break;
      }
    });

    ws.on("error", (error) => finish(error));
    ws.on("close", () => {
      if (!settled && audioSent) finish();
    });
  });
}

function splitBuffer(buffer, size) {
  const chunks = [];
  for (let i = 0; i < buffer.length; i += size) {
    chunks.push(buffer.subarray(i, i + size));
  }
  return chunks;
}

function pcmBase64FromAudioDataUrl(audioDataUrl) {
  const parsed = parseDataUrl(audioDataUrl);
  if (audioFormatFromMimeType(parsed.mimeType) !== "pcm") {
    throw new Error("DashScope realtime requires 16kHz 16-bit mono PCM audio.");
  }
  return parsed.buffer.toString("base64");
}

function audioInputFromDataUrl(audioDataUrl) {
  const match = /^data:([^;,]+)(?:;[^,]*)?;base64,([a-zA-Z0-9+/=]+)$/i.exec(audioDataUrl);
  if (!match) {
    throw new Error("Invalid audio data URL.");
  }
  return {
    data: match[2],
    format: audioFormatFromMimeType(match[1])
  };
}

function dashScopeInputAudioFromDataUrl(audioDataUrl) {
  const match = /^data:([^;,]+)(?:;[^,]*)?;base64,[a-zA-Z0-9+/=]+$/i.exec(audioDataUrl);
  if (!match) {
    throw new Error("Invalid audio data URL.");
  }
  return {
    data: audioDataUrl,
    format: audioFormatFromMimeType(match[1])
  };
}

function audioFormatFromMimeType(mimeType) {
  const normalized = String(mimeType || "").split(";")[0].trim().toLowerCase();
  return {
    "audio/wav": "wav",
    "audio/wave": "wav",
    "audio/x-wav": "wav",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/mp4": "mp4",
    "audio/m4a": "m4a",
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/pcm": "pcm",
    "audio/l16": "pcm"
  }[normalized] || "webm";
}

const VOICE_ACTION_TYPES = new Set([
  "zoom_in",
  "zoom_out",
  "set_zoom",
  "reset_view",
  "pan_view",
  "focus_node",
  "arrange_canvas",
  "deselect",
  "select_source",
  "select_analysis",
  "select_node",
  "move_node",
  "create_direction",
  "create_web_card",
  "generate_image",
  "analyze_source",
  "explore_source",
  "research_source",
  "research_node",
  "open_references",
  "save_session",
  "new_chat",
  "open_chat_history",
  "close_chat",
  "open_chat",
  "open_history",
  "open_settings",
  "set_thinking_mode",
  "set_deep_think_mode",
  "open_upload",
  "delete_node"
]);

function normalizedActionString(value, maxLength = 160) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function normalizedActionNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function normalizeVoiceActions(value) {
  const raw = Array.isArray(value) ? value : (value ? [value] : []);
  return raw
    .map((action) => {
      if (typeof action === "string") return { type: action };
      if (!action || typeof action !== "object") return null;
      const normalized = {
        type: String(action.type || action.name || "").trim(),
        nodeId: normalizedActionString(action.nodeId, 120),
        parentNodeId: normalizedActionString(action.parentNodeId, 120),
        anchorNodeId: normalizedActionString(action.anchorNodeId, 120),
        nodeName: normalizedActionString(action.nodeName || action.nameText, 160),
        parentNodeName: normalizedActionString(action.parentNodeName, 160),
        anchorNodeName: normalizedActionString(action.anchorNodeName, 160),
        target: normalizedActionString(action.target, 160),
        title: normalizedActionString(action.title, 120),
        description: normalizedActionString(action.description, 700),
        prompt: normalizedActionString(action.prompt, 1600),
        query: normalizedActionString(action.query, 360),
        url: normalizedActionString(action.url, 512),
        position: normalizedActionString(action.position, 60),
        direction: normalizedActionString(action.direction, 60),
        mode: normalizedActionString(action.mode, 80),
        x: normalizedActionNumber(action.x),
        y: normalizedActionNumber(action.y),
        dx: normalizedActionNumber(action.dx),
        dy: normalizedActionNumber(action.dy),
        scale: normalizedActionNumber(action.scale),
        amount: normalizedActionNumber(action.amount)
      };
      Object.keys(normalized).forEach((key) => {
        if (normalized[key] === undefined) delete normalized[key];
      });
      return normalized;
    })
    .filter((action) => action && VOICE_ACTION_TYPES.has(action.type));
}

function normalizeDeepThinkActions(value) {
  return normalizeVoiceActions(value).slice(0, 6);
}

function extractVoiceAudioDataUrl(response) {
  const audio =
    response?.choices?.[0]?.message?.audio ||
    response?.audio ||
    response?.output_audio ||
    null;
  const data = audio?.data || audio?.b64_json || audio?.content;
  if (typeof data !== "string" || !data) return "";
  const format = audio?.format || "wav";
  const mime = {
    mp3: "audio/mpeg",
    mpeg: "audio/mpeg",
    wav: "audio/wav",
    webm: "audio/webm",
    ogg: "audio/ogg",
    mp4: "audio/mp4"
  }[String(format).toLowerCase()] || "audio/wav";
  return `data:${mime};base64,${data}`;
}

async function chatCompletions(config, payload, options = {}) {
  const requestPayload = {
    model: config.model,
    ...payload
  };
  const timeoutMs = Number(options.timeoutMs || CHAT_COMPLETION_TIMEOUT_MS);
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  let response;
  let text;
  try {
    response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json"
      },
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

async function collectStreamingChatText(response) {
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
        text += extractStreamingTextDelta(chunk);
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
        text += extractStreamingTextDelta(JSON.parse(data));
      } catch {
        // Ignore trailing non-JSON stream fragments.
      }
    }
  }

  return text;
}

function extractStreamingTextDelta(chunk) {
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

function collectChatContent(response) {
  const content = response?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => part?.text || part?.content || "")
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

function collectReasoningContent(response) {
  const message = response?.choices?.[0]?.message || {};
  const candidates = [
    message.reasoning_content,
    message.reasoningContent,
    message.reasoning,
    message.thinking,
    message.thinking_content,
    message.thoughts,
    response?.reasoning_content,
    response?.reasoning
  ];

  const normalizePart = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value.trim();
    if (Array.isArray(value)) {
      return value
        .map((part) => normalizePart(part?.text || part?.content || part?.reasoning || part))
        .filter(Boolean)
        .join("\n");
    }
    if (typeof value === "object") {
      const text = value.text || value.content || value.reasoning || value.reasoning_content || value.summary;
      if (typeof text === "string") return text.trim();
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return "";
      }
    }
    return "";
  };

  return candidates
    .map(normalizePart)
    .filter(Boolean)
    .join("\n\n");
}

async function generateTokenHubImage(prompt, imageUrl, imageDataUrl) {
  const images = [];
  if (typeof imageUrl === "string" && /^https?:\/\//i.test(imageUrl)) {
    images.push(imageUrl);
  } else if (IMAGE_INCLUDE_DATA_URL && imageDataUrl) {
    images.push(imageDataUrl);
  }

  const submitPayload = {
    model: runtimeConfigs.image.model,
    prompt
  };
  if (images.length) {
    submitPayload.images = images;
  }

  const submitted = await tokenHubImageRequest(`${runtimeConfigs.image.baseUrl}/submit`, submitPayload);
  const jobId = submitted?.id;
  if (!jobId) {
    throw new Error("TokenHub image submit did not return a job id.");
  }

  for (let attempt = 0; attempt < IMAGE_POLL_ATTEMPTS; attempt += 1) {
    await delay(IMAGE_POLL_INTERVAL_MS);
    const queried = await tokenHubImageRequest(`${runtimeConfigs.image.baseUrl}/query`, {
      model: runtimeConfigs.image.model,
      id: jobId
    });

    if (queried?.status === "completed") {
      const imageUrlResult = queried?.data?.[0]?.url;
      if (!imageUrlResult) {
        throw new Error("TokenHub image query completed without image url.");
      }
      return {
        imageUrl: imageUrlResult,
        imageDataUrl: imageUrlResult,
        revisedPrompt: queried?.data?.[0]?.revised_prompt || ""
      };
    }

    if (["failed", "error", "cancelled"].includes(String(queried?.status).toLowerCase())) {
      throw new Error(`TokenHub image job failed: ${queried?.status}`);
    }
  }

  throw new Error("TokenHub image job timed out before completion.");
}

async function tokenHubImageRequest(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${runtimeConfigs.image.apiKey}`,
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
    throw new Error(`TokenHub image API ${response.status}: ${detail}`);
  }

  return json;
}

function extensionFromContentType(contentType) {
  const normalized = String(contentType).split(";")[0].trim().toLowerCase();
  return {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg"
  }[normalized] || "";
}

function extensionFromUrl(url) {
  try {
    const ext = path.extname(new URL(url).pathname).replace(/^\./, "").toLowerCase();
    if (["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(ext)) {
      return ext;
    }
  } catch {}
  return "";
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseJsonFromText(text) {
  if (!text) {
    throw new Error("The analysis model returned empty text.");
  }

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Could not parse analysis JSON from model output.");
    }
    return JSON.parse(match[0]);
  }
}

function normalizeAnalysis(value, fileName = "source image") {
  const fallback = buildDemoAnalysis(fileName);
  const options = Array.isArray(value?.options) ? value.options : fallback.options;

  return {
    provider: "api",
    title: stringOr(value?.title, fallback.title),
    summary: stringOr(value?.summary, fallback.summary),
    detectedSubjects: arrayOfStrings(value?.detectedSubjects, fallback.detectedSubjects).slice(0, 6),
    moodKeywords: arrayOfStrings(value?.moodKeywords, fallback.moodKeywords).slice(0, 8),
    options: options.slice(0, 6).map((option, index) => ({
      id: slug(option?.id || option?.title || `option-${index + 1}`),
      title: stringOr(option?.title, fallback.options[index % fallback.options.length].title).slice(0, 20),
      description: stringOr(option?.description, fallback.options[index % fallback.options.length].description),
      prompt: stringOr(option?.prompt, fallback.options[index % fallback.options.length].prompt),
      tone: stringOr(option?.tone, fallback.options[index % fallback.options.length].tone),
      layoutHint: stringOr(option?.layoutHint, fallback.options[index % fallback.options.length].layoutHint)
    }))
  };
}

function normalizeExplore(value, fileName = "source image") {
  const fallback = buildDemoExplore(fileName);
  const options = Array.isArray(value?.options) ? value.options : fallback.options;
  const references = Array.isArray(value?.references) ? value.references : fallback.references;

  return {
    provider: "api",
    title: stringOr(value?.title, fallback.title),
    summary: stringOr(value?.summary, fallback.summary),
    detectedSubjects: arrayOfStrings(value?.detectedSubjects, fallback.detectedSubjects).slice(0, 6),
    moodKeywords: arrayOfStrings(value?.moodKeywords, fallback.moodKeywords).slice(0, 8),
    options: options.slice(0, 6).map((option, index) => ({
      id: slug(option?.id || option?.title || `option-${index + 1}`),
      title: stringOr(option?.title, fallback.options[index % fallback.options.length].title).slice(0, 20),
      description: stringOr(option?.description, fallback.options[index % fallback.options.length].description),
      prompt: stringOr(option?.prompt, fallback.options[index % fallback.options.length].prompt),
      tone: stringOr(option?.tone, fallback.options[index % fallback.options.length].tone),
      layoutHint: stringOr(option?.layoutHint, fallback.options[index % fallback.options.length].layoutHint)
    })),
    references: references.slice(0, 6).map((ref, index) => ({
      title: stringOr(ref?.title, fallback.references[index % fallback.references.length].title).slice(0, 80),
      url: stringOr(ref?.url, fallback.references[index % fallback.references.length].url).slice(0, 512),
      description: stringOr(ref?.description, fallback.references[index % fallback.references.length].description).slice(0, 200),
      type: ["web", "doc", "image"].includes(ref?.type) ? ref.type : "web"
    }))
  };
}

function buildDeepThinkSystemPrompt(lang) {
  const schema = [
    "{",
    '  "reply": "short user-facing summary",',
    '  "cards": [',
    "    {",
    '      "type": "direction|web|image|file|api|note",',
    '      "title": "short card title",',
    '      "summary": "what this card contributes to the canvas",',
    '      "prompt": "generation-ready visual prompt or research instruction",',
    '      "query": "optional search query or API action name",',
    '      "url": "optional external URL when already known"',
    "    }",
    "  ],",
    '  "links": [{"from": 0, "to": 1, "label": "optional relationship"}],',
    '  "actions": [{"type": "optional reusable canvas action", "nodeId": "optional exact node id", "nodeName": "optional card name", "position": "optional target position", "prompt": "optional prompt"}]',
    "}"
  ].join("\n");

  if (lang === "en") {
    return [
      "You are ORYZAE's deep-thinking canvas planner.",
      "Return strict JSON only, with no Markdown.",
      "Do not expose private chain-of-thought. Instead, create visible workspace traces: web cards, image-reference cards, file cards, API/action cards, notes, and generation directions.",
      "If you have not actually browsed or called a tool, describe the card as a search/action plan using query and prompt fields rather than claiming it is already collected.",
      "The frontend will turn every card into a canvas node. Make cards concrete, divergent, and useful for image exploration.",
      "You may optionally include reusable canvas actions, using the same action types as realtime voice, when they help arrange, focus, or generate from the created work.",
      "Provide 4-8 cards and 2-6 links.",
      "Schema:",
      schema
    ].join("\n");
  }

  return [
    "你是 ORYZAE 的深度思考画布规划器。",
    "只返回严格 JSON，不要 Markdown。",
    "不要暴露私有思维链。你需要把思考外化为可见的工作区痕迹：网页卡片、图片参考卡片、文件卡片、API/动作卡片、笔记卡片、成图方向卡片。",
    "如果你并没有真实浏览网页或调用工具，不要声称已经搜集完成；请把卡片写成可执行的搜索/动作计划，并使用 query 和 prompt 字段。",
    "前端会把每张卡变成画布节点。卡片要具体、发散，并且能服务于图片探索。",
    "输出 4-8 张卡片和 2-6 条关系。",
    "Schema:",
    schema
  ].join("\n");
}

function buildDeepThinkUserPrompt({ prompt, analysis, selectedContext, canvas, messages, lang }) {
  const label = lang === "en"
    ? {
        goal: "User goal",
        analysis: "Current image/file analysis",
        selected: "Selected canvas card",
        canvas: "Visible canvas state",
        dialogue: "Recent dialogue"
      }
    : {
        goal: "用户目标",
        analysis: "当前图片/文件分析",
        selected: "当前选中的画布卡片",
        canvas: "当前可见画布状态",
        dialogue: "最近对话"
      };

  return [
    `${label.goal}: ${prompt}`,
    "",
    `${label.analysis}:`,
    JSON.stringify(analysis, null, 2).slice(0, 2400),
    "",
    `${label.selected}:`,
    selectedContext ? JSON.stringify(selectedContext, null, 2).slice(0, 1200) : "None",
    "",
    `${label.canvas}:`,
    JSON.stringify(canvas || {}, null, 2).slice(0, 1800),
    "",
    `${label.dialogue}:`,
    JSON.stringify(messages || [], null, 2).slice(0, 1600)
  ].join("\n");
}

function normalizeDeepThinkPlan(value, prompt, lang) {
  const fallback = buildDemoDeepThinkPlan(prompt, lang, runtimeConfigs.deepthink.model);
  const cards = Array.isArray(value?.cards) ? value.cards : fallback.cards;
  const links = Array.isArray(value?.links) ? value.links : fallback.links;
  const allowedTypes = new Set(["direction", "web", "image", "file", "api", "note"]);

  return {
    reply: stringOr(value?.reply, fallback.reply),
    cards: cards.slice(0, 8).map((card, index) => {
      const type = allowedTypes.has(card?.type) ? card.type : "note";
      const title = stringOr(card?.title, fallback.cards[index % fallback.cards.length].title).slice(0, 48);
      const summary = stringOr(card?.summary || card?.description, fallback.cards[index % fallback.cards.length].summary).slice(0, 240);
      return {
        id: slug(card?.id || `${type}-${title}-${index + 1}`),
        type,
        title,
        summary,
        prompt: stringOr(card?.prompt, summary).slice(0, 1200),
        query: stringOr(card?.query, "").slice(0, 240),
        url: stringOr(card?.url, "").slice(0, 512)
      };
    }),
    links: links.slice(0, 6).map((link) => ({
      from: Number.isInteger(link?.from) ? link.from : 0,
      to: Number.isInteger(link?.to) ? link.to : 0,
      label: stringOr(link?.label, "").slice(0, 40)
    })).filter((link) => link.from !== link.to),
    actions: normalizeDeepThinkActions(value?.actions || value?.action)
  };
}

function buildDemoDeepThinkPlan(prompt, lang = "zh", model = "demo") {
  const zh = lang !== "en";
  return {
    provider: "demo",
    model,
    reply: zh
      ? "我先把深度思考外化为几张可执行卡片：搜索线索、参考图片、材料拆解和成图方向。"
      : "I mapped the deep-thinking pass into actionable cards: search leads, visual references, material breakdown, and generation directions.",
    cards: [
      {
        id: "search-context",
        type: "web",
        title: zh ? "搜索语境线索" : "Search context",
        summary: zh ? "围绕当前目标建立外部语境，找到可借鉴的视觉题材、场景和关键词。" : "Build external context around the current goal and identify useful visual themes, scenes, and keywords.",
        prompt,
        query: prompt
      },
      {
        id: "reference-image-board",
        type: "image",
        title: zh ? "参考图卡片" : "Reference image board",
        summary: zh ? "规划一组照片或视觉参考，用来校准光线、构图、材质和色彩。" : "Plan a set of visual references for lighting, composition, materials, and color.",
        prompt: zh ? `为「${prompt}」搜集或生成参考图片，突出光线、构图和材质。` : `Collect or generate references for "${prompt}", emphasizing lighting, composition, and material.`
      },
      {
        id: "material-breakdown",
        type: "file",
        title: zh ? "文件材料拆解" : "File material breakdown",
        summary: zh ? "把当前画布和上传文件拆成可复用素材：主体、局部、色卡、叙事线索。" : "Break the current canvas and uploaded files into reusable subject, detail, palette, and narrative assets.",
        prompt: zh ? "整理当前材料，提取主体、色彩、构图和叙事线索。" : "Extract subjects, color, composition, and narrative clues from the current materials."
      },
      {
        id: "image-generation-call",
        type: "api",
        title: zh ? "成图 API 动作" : "Image API action",
        summary: zh ? "准备调用成图接口前的提示词结构，并标记需要保留和需要发散的元素。" : "Prepare the image generation prompt structure and mark what to preserve versus diverge.",
        prompt: zh ? `基于当前图和「${prompt}」生成一张完整图像，保留核心视觉记忆，加入新的叙事形状。` : `Generate a complete image from the current canvas and "${prompt}", preserving core visual memory while adding a new narrative shape.`
      },
      {
        id: "final-direction",
        type: "direction",
        title: zh ? "综合发散方向" : "Synthesis direction",
        summary: zh ? "把搜索、参考和材料拆解合成一个可直接点击生成的方向。" : "Synthesize search, references, and material breakdown into a generation-ready direction.",
        prompt: zh ? `以「${prompt}」为核心，生成一张由多张卡片线索连接出的视觉探索图。` : `Create a visual exploration image centered on "${prompt}", shaped by linked clue cards.`
      }
    ],
    links: [
      { from: 0, to: 1, label: zh ? "启发" : "inspires" },
      { from: 1, to: 3, label: zh ? "转成提示词" : "prompt" },
      { from: 2, to: 4, label: zh ? "合成" : "synthesize" }
    ]
  };
}

function normalizeOption(option) {
  if (!option || typeof option !== "object") return null;
  return {
    id: slug(option.id || option.title || "option"),
    title: stringOr(option.title, "生成方向"),
    description: stringOr(option.description, "基于原图生成一个新的视觉方向。"),
    prompt: stringOr(option.prompt, option.description || option.title || "基于参考图生成新图。"),
    tone: stringOr(option.tone, "cinematic"),
    layoutHint: stringOr(option.layoutHint, "square")
  };
}

function normalizeChatAnalysis(value) {
  if (!value || typeof value !== "object") {
    return {
      summary: "尚未完成图片分析。",
      moodKeywords: [],
      options: []
    };
  }

  return {
    summary: stringOr(value.summary, "尚未完成图片分析。"),
    moodKeywords: arrayOfStrings(value.moodKeywords, []).slice(0, 8),
    detectedSubjects: arrayOfStrings(value.detectedSubjects, []).slice(0, 6),
    options: Array.isArray(value.options)
      ? value.options.slice(0, 6).map((option) => ({
          title: stringOr(option?.title, "生成方向"),
          description: stringOr(option?.description, ""),
          tone: stringOr(option?.tone, ""),
          layoutHint: stringOr(option?.layoutHint, "")
        }))
      : []
  };
}

function normalizeChatMessages(value) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(-8)
    .map((item) => ({
      role: item?.role === "assistant" ? "assistant" : "user",
      content: typeof item?.content === "string" ? item.content.trim().slice(0, 1200) : ""
    }))
    .filter((item) => item.content);
}

function buildDemoChatReply(message, analysis) {
  const optionCount = analysis.options?.length || 0;
  if (/提示词|prompt/i.test(message)) {
    return "可以把方向写成：保留原图主体和色彩记忆，强化一个明确的场景、光线和材质目标，再限制不要出现水印或可读文字。";
  }
  if (/哪个|选择|方向/.test(message) && optionCount) {
    return `当前有 ${optionCount} 个方向。想要故事感就选电影剧照或线索板，想要设计提案就选杂志海报或视觉系统。`;
  }
  if (/重新|更多|新增/.test(message)) {
    return "下一步可以让分析模型再扩展一组分支，例如更商业、更叙事、更极简或更实验的方向。";
  }
  return `我会围绕“${analysis.summary || "当前图片"}”继续帮你收束想法。你可以告诉我想更像海报、电影剧照、线索板，还是概念板。`;
}

function buildDemoAnalysis(fileName = "source image") {
  return {
    provider: "demo",
    title: `${fileName ? fileName.split('.')[0] : "未知图片"} 的视觉探索`,
    summary: `已读取 ${fileName || "上传图片"}：可以从主体、氛围、叙事线索和视觉风格四个方向继续扩展。`,
    detectedSubjects: ["主视觉", "光影", "空间关系", "色彩线索"],
    moodKeywords: ["线索板", "电影感", "编辑感", "图像分叉", "叙事延展"],
    options: [
      {
        id: "evidence-board",
        title: "线索板重构",
        description: "把原图转化成侦探线索墙：照片、便签、纸张和红线围绕主体展开，像在追踪一个尚未揭开的故事。",
        prompt: "基于参考图的主体与色彩，生成一张真实摄影质感的调查线索板，包含纸张、照片、便签、图钉和红色连接线，构图有层次，光线温暖，细节丰富，电影道具摄影风格。",
        tone: "documentary",
        layoutHint: "board"
      },
      {
        id: "editorial-poster",
        title: "杂志海报",
        description: "保留原图最强的视觉记忆点，重组成一张留白克制的编辑海报，适合做封面或视觉提案。",
        prompt: "将参考图转化为高端杂志编辑海报，保留主要主体轮廓和关键色彩，使用克制排版、自然颗粒、柔和阴影和精致留白，不要出现可读文字。",
        tone: "editorial",
        layoutHint: "portrait"
      },
      {
        id: "cinematic-still",
        title: "电影剧照",
        description: "把当前图片延展为一帧电影镜头，强调空间、灯光和情绪，让画面像故事中的关键一秒。",
        prompt: "基于参考图生成电影剧照风格图像，保留主体和场景关系，加入自然镜头景深、环境光、微妙雾气和叙事张力，真实摄影，35mm film still。",
        tone: "cinematic",
        layoutHint: "landscape"
      },
      {
        id: "surreal-memory",
        title: "梦境记忆",
        description: "将原图中的物体和氛围抽离成梦境化场景，画面更诗性，像记忆被重新拼贴。",
        prompt: "把参考图转化为超现实梦境场景，保留核心主体但让背景、光影和比例产生诗性变化，细腻材质，柔和边缘，安静而神秘。",
        tone: "surreal",
        layoutHint: "square"
      },
      {
        id: "product-system",
        title: "视觉系统",
        description: "把原图拆成一套视觉资产：主图、色卡、材质片段和构图小样，适合继续做品牌或概念板。",
        prompt: "基于参考图生成一张视觉系统概念板，包含主视觉、局部材质切片、色彩样本、构图缩略图和整洁网格，现代设计工作室风格，不要出现真实文字。",
        tone: "graphic",
        layoutHint: "board"
      }
    ]
  };
}

function buildDemoExplore(fileName = "source image") {
  const base = buildDemoAnalysis(fileName);
  return {
    ...base,
    references: [
      {
        title: "Pinterest 视觉灵感板",
        url: "https://www.pinterest.com/search/pins/?q=creative+visual+moodboard",
        description: "大量视觉灵感与情绪板参考，适合快速浏览不同风格的视觉参考。",
        type: "web"
      },
      {
        title: "Behance 创意项目集",
        url: "https://www.behance.net/search/projects/creative%20direction",
        description: "全球创意人分享的高质量视觉项目，可作为风格与构图的参考。",
        type: "web"
      },
      {
        title: "电影色彩分析图集",
        url: "https://www.flickr.com/search/?q=cinematic+color+grading",
        description: "电影级调色与光影处理的图片参考，适合延展电影感方向。",
        type: "image"
      }
    ]
  };
}

function buildDemoImage(option) {
  const palette = paletteFor(option.id);
  const title = escapeXml(option.title);
  const description = escapeXml(option.description).slice(0, 95);
  const promptHint = escapeXml(option.tone || "visual branch");
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="${palette[0]}"/>
      <stop offset="0.52" stop-color="${palette[1]}"/>
      <stop offset="1" stop-color="${palette[2]}"/>
    </linearGradient>
    <filter id="paper" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="7"/>
      <feColorMatrix type="saturate" values="0"/>
      <feBlend in="SourceGraphic" mode="multiply"/>
    </filter>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <g opacity="0.22" stroke="#ffffff" stroke-width="1">
    ${Array.from({ length: 18 }, (_, i) => `<path d="M${i * 64} 0 L${1024 - i * 38} 1024"/>`).join("")}
  </g>
  <g transform="translate(132 128) rotate(-3)">
    <rect width="760" height="620" rx="18" fill="#fffdf4" opacity="0.88" filter="url(#paper)"/>
    <rect x="44" y="48" width="672" height="386" rx="10" fill="${palette[3]}" opacity="0.78"/>
    <circle cx="130" cy="132" r="64" fill="${palette[4]}" opacity="0.82"/>
    <rect x="232" y="102" width="398" height="36" rx="18" fill="#ffffff" opacity="0.52"/>
    <rect x="232" y="166" width="310" height="24" rx="12" fill="#ffffff" opacity="0.36"/>
    <path d="M92 480 C220 392 354 572 504 456 S672 432 716 520" fill="none" stroke="${palette[5]}" stroke-width="11" stroke-linecap="round"/>
    <circle cx="92" cy="480" r="18" fill="#f7f2df"/>
    <circle cx="504" cy="456" r="18" fill="#f7f2df"/>
    <circle cx="716" cy="520" r="18" fill="#f7f2df"/>
  </g>
  <g font-family="Arial, sans-serif" fill="#1f2733">
    <text x="104" y="824" font-size="54" font-weight="700" letter-spacing="0">${title}</text>
    <text x="108" y="872" font-size="24" opacity="0.72">${promptHint}</text>
    <foreignObject x="104" y="900" width="820" height="84">
      <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Arial,sans-serif;font-size:25px;line-height:1.45;color:#26313f;opacity:.78">${description}</div>
    </foreignObject>
  </g>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.trim())}`;
}

function paletteFor(seed) {
  const palettes = [
    ["#f3ead5", "#8ab2aa", "#2f5262", "#d9e5df", "#d77756", "#b64032"],
    ["#fbf2d0", "#d0a56f", "#344d5f", "#e9ddc7", "#446f68", "#a94f3f"],
    ["#e8eef0", "#8ca1ad", "#202939", "#d7e4de", "#c7a76c", "#742f2f"],
    ["#f7efe7", "#c6dad1", "#786f9d", "#eee6d7", "#4d8a8b", "#d15d4a"],
    ["#f4f1e7", "#aabf90", "#334c3f", "#ece0c4", "#6d87b0", "#a14335"]
  ];
  const index = Math.abs(String(seed).split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)) % palettes.length;
  return palettes[index];
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("Request body is too large. Please upload an image under 10MB."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Invalid JSON body."));
      }
    });
    req.on("error", reject);
  });
}

function serveStatic(requestPath, res) {
  const cleanPath = decodeURIComponent(requestPath.split("?")[0]);
  const relativePath = cleanPath === "/" ? "index.html" : cleanPath.replace(/^\/+/, "");
  const targetPath = path.normalize(path.join(publicDir, relativePath));

  if (!targetPath.startsWith(publicDir)) {
    return sendJson(res, 403, { error: "Forbidden" });
  }

  fs.readFile(targetPath, (error, data) => {
    if (error) {
      return sendJson(res, 404, { error: "Not found" });
    }
    res.writeHead(200, {
      "Content-Type": mimeType(targetPath),
      "Cache-Control": "no-cache"
    });
    res.end(data);
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-cache"
  });
  res.end(JSON.stringify(data));
}

function mimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp"
  }[ext] || "application/octet-stream";
}

function normalizeDataUrl(value) {
  if (typeof value !== "string") return null;
  if (!/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(value) && !/^data:image\/svg\+xml(?:;[^,]*)?,/i.test(value)) {
    return null;
  }
  return value;
}

function isAudioDataUrl(value) {
  return typeof value === "string" && /^data:audio\/[a-z0-9.+-]+(?:;[^,]*)?;base64,/i.test(value);
}

function isBase64Payload(value) {
  return typeof value === "string" && value.length > 0 && /^[a-zA-Z0-9+/=]+$/.test(value);
}

function parseDataUrl(value) {
  if (typeof value !== "string") {
    throw new Error("Invalid data URL format");
  }
  const rasterMatch = /^data:([a-z0-9+\/.-]+)(?:;[^,]*)?;base64,([a-zA-Z0-9+/=]+)$/i.exec(value);
  if (rasterMatch) {
    const mimeType = rasterMatch[1].toLowerCase();
    const ext = extensionFromMimeType(mimeType) || "bin";
    return {
      buffer: Buffer.from(rasterMatch[2], "base64"),
      mimeType,
      ext
    };
  }
  const plainMatch = /^data:([a-z0-9+\/-]+)(?:;[^,]*)?,(.*)$/is.exec(value);
  if (plainMatch) {
    const mimeType = plainMatch[1].toLowerCase();
    const payload = plainMatch[2] || "";
    const buffer = Buffer.from(decodeURIComponent(payload), "utf8");
    return {
      buffer,
      mimeType,
      ext: extensionFromMimeType(mimeType) || "txt"
    };
  }
  throw new Error("Invalid data URL format");
}

function extensionFromMimeType(mimeType) {
  const map = {
    "text/plain": "txt",
    "text/markdown": "md",
    "application/json": "json",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "application/pdf": "pdf",
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/mp4": "mp4",
    "audio/m4a": "m4a",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/wav": "wav",
    "audio/wave": "wav",
    "audio/x-wav": "wav",
    "audio/pcm": "pcm",
    "audio/l16": "pcm"
  };
  return map[mimeType] || "";
}

function arrayOfStrings(value, fallback) {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim());
  return cleaned.length ? cleaned : fallback;
}

function stringOr(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "option";
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function loadDotEnv(envPath) {
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
