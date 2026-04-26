import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleCreateSession, handleGetSession, handleUpdateSession, handleExportSession } from "./src/api/sessions.js";
import { handleListHistory } from "./src/api/history.js";
import { handleStoreAsset, handleGetAsset } from "./src/api/assets.js";
import { handleCreateShare, handleGetShare } from "./src/api/share.js";
import { handleImportSession } from "./src/api/import.js";
import { handleGetSettings, handleUpdateSettings } from "./src/api/settings.js";
import { ensureStorageDirs, storeDataUrl, storeFile } from "./src/lib/storage.js";
import { extractTextFromBuffer } from "./src/lib/textExtract.js";
import { PrismaClient } from "@prisma/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");

loadDotEnv(path.join(__dirname, ".env"));

const PORT = Number(process.env.PORT || 3000);
const DEMO_MODE = process.env.DEMO_MODE === "true";

const prisma = new PrismaClient();

let runtimeConfigs = { chat: null, analysis: null, image: null };

const IMAGE_POLL_INTERVAL_MS = Number(process.env.IMAGE_POLL_INTERVAL_MS || 2000);
const IMAGE_POLL_ATTEMPTS = Number(process.env.IMAGE_POLL_ATTEMPTS || 30);
const IMAGE_INCLUDE_DATA_URL = process.env.IMAGE_INCLUDE_DATA_URL === "true";
const MAX_BODY_BYTES = 22 * 1024 * 1024;

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/api/health") {
      return sendJson(res, 200, {
        ok: true,
        mode: appMode(),
        chat: roleHealth(runtimeConfigs.chat),
        analysis: roleHealth(runtimeConfigs.analysis),
        image: roleHealth(runtimeConfigs.image)
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

    // History route
    if (req.method === "GET" && url.pathname === "/api/history") {
      return await handleListHistory(Object.fromEntries(url.searchParams), res);
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
  const rows = await prisma.settings.findMany();
  const dbMap = Object.fromEntries(
    rows.map((r) => [
      r.role,
      { endpoint: r.endpoint, model: r.model, apiKey: r.apiKey, temperature: r.temperature }
    ])
  );

  runtimeConfigs.chat = buildModelConfig("CHAT", {
    provider: "kimi",
    model: "kimi-k2.6",
    baseUrl: "https://api.moonshot.cn/v1",
    apiKeyEnv: ["KIMI_API_KEY", "MOONSHOT_API_KEY"]
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
}

function buildModelConfig(role, defaults, dbSettings = null) {
  const roleProvider = (dbSettings?.provider) || process.env[`${role}_PROVIDER`] || defaults.provider;
  const apiKey =
    (dbSettings?.apiKey ?? "") ||
    firstEnv(defaults.apiKeyEnv || []) ||
    process.env[`${role}_API_KEY`] ||
    "";
  const baseUrl = (
    (dbSettings?.endpoint || "").replace(/\/+$/, "") ||
    process.env[`${role}_API_BASE_URL`] ||
    defaults.baseUrl
  ).replace(/\/+$/, "");
  const model =
    (dbSettings?.model) ||
    process.env[`${role}_MODEL`] ||
    defaults.model;
  const temperature =
    typeof dbSettings?.temperature === "number"
      ? dbSettings.temperature
      : (parseFloat(process.env[`${role}_TEMPERATURE`]) || defaults.temperature || 0.7);

  return { role: role.toLowerCase(), provider: roleProvider, apiKey, baseUrl, model, temperature };
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

function appMode() {
  const modes = [runtimeConfigs.chat, runtimeConfigs.analysis, runtimeConfigs.image].map((config) => roleHealth(config).mode);
  if (modes.every((mode) => mode === "demo")) return "demo";
  if (modes.some((mode) => mode === "demo")) return "mixed";
  return "api";
}

async function handleChat(body, res) {
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 2000) : "";
  const imageDataUrl = normalizeDataUrl(body?.imageDataUrl);
  const analysis = normalizeChatAnalysis(body?.analysis);
  const messages = normalizeChatMessages(body?.messages);

  if (!message) {
    return sendJson(res, 400, { error: "message is required" });
  }

  if (isDemoRole(runtimeConfigs.chat)) {
    return sendJson(res, 200, {
      provider: "demo",
      model: runtimeConfigs.chat.model,
      reply: buildDemoChatReply(message, analysis)
    });
  }

  const lang = body?.language === "en" ? "en" : "zh";
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
  if (imageDataUrl) {
    content.push({ type: "image_url", image_url: { url: imageDataUrl } });
  }

  const response = await chatCompletions(runtimeConfigs.chat, {
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
    ],
    thinking: { type: "disabled" }
  });

  const reply = collectChatContent(response);
  return sendJson(res, 200, {
    provider: "api",
    model: runtimeConfigs.chat.model,
    reply: reply || "我读到了，我们可以继续把这个方向压成一个更明确的生成分支。"
  });
}

async function handleAnalyze(body, res) {
  const imageDataUrl = normalizeDataUrl(body?.imageDataUrl);
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

  if (runtimeConfigs.analysis.provider === "kimi" && /^kimi-k2\./.test(runtimeConfigs.analysis.model)) {
    analysisPayload.thinking = { type: "disabled" };
  } else if (runtimeConfigs.analysis.provider === "openrouter") {
    analysisPayload.reasoning = { effort: "none", exclude: true };
  }

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

async function handleAnalyzeUrl(body, res) {
  const url = typeof body?.url === "string" ? body.url.trim() : "";

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

  if (runtimeConfigs.analysis.provider === "kimi" && /^kimi-k2\./.test(runtimeConfigs.analysis.model)) {
    analysisPayload.thinking = { type: "disabled" };
  } else if (runtimeConfigs.analysis.provider === "openrouter") {
    analysisPayload.reasoning = { effort: "none", exclude: true };
  }

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

  if (runtimeConfigs.analysis.provider === "kimi" && /^kimi-k2\./.test(runtimeConfigs.analysis.model)) {
    analysisPayload.thinking = { type: "disabled" };
  } else if (runtimeConfigs.analysis.provider === "openrouter") {
    analysisPayload.reasoning = { effort: "none", exclude: true };
  }

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

  const response = await chatCompletions(runtimeConfigs.chat, {
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
    ],
    thinking: { type: "disabled" }
  });

  const explanation = collectChatContent(response)?.trim() || "";
  return sendJson(res, 200, {
    provider: "api",
    model: runtimeConfigs.chat.model,
    explanation
  });
}

async function chatCompletions(config, payload) {
  const requestPayload = {
    model: config.model,
    ...payload
  };

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestPayload)
  });

  const text = await response.text();
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

function parseDataUrl(value) {
  if (typeof value !== "string") {
    throw new Error("Invalid data URL format");
  }
  const rasterMatch = /^data:([a-z0-9+\/-]+);base64,([a-zA-Z0-9+/=]+)$/i.exec(value);
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
    "application/pdf": "pdf"
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
