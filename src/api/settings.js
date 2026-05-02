import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const DEFAULTS = {
  analysis: { endpoint: "https://api.moonshot.cn/v1", model: "kimi-k2.6", apiKey: "", temperature: 0.7 },
  chat: { endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen3.6-plus", apiKey: "", temperature: 0.7 },
  image: { endpoint: "https://tokenhub.tencentmaas.com/v1/api/image", model: "hy-image-v3.0", apiKey: "", temperature: 0.7 },
  asr: { endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen3-livetranslate-flash-2025-12-01", apiKey: "", temperature: 0 },
  realtime: { endpoint: "wss://dashscope.aliyuncs.com/api-ws/v1/realtime", model: "qwen3.5-omni-plus-realtime", apiKey: "", temperature: 0.7 },
  deepthink: { endpoint: "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation", model: "qwen-deep-research", apiKey: "", temperature: 0.7 }
};

export async function handleGetSettings(res) {
  const rows = await prisma.settings.findMany();
  const map = Object.fromEntries(rows.map(r => [r.role, { endpoint: r.endpoint, model: r.model, apiKey: r.apiKey, temperature: r.temperature }]));
  const result = {};
  for (const role of ["analysis", "chat", "image", "asr", "realtime", "deepthink"]) {
    result[role] = isLegacyVoiceDefault(role, map[role]) ? DEFAULTS[role] : (map[role] || DEFAULTS[role]);
  }
  const globalRow = rows.find(r => r.role === "global");
  result.theme = globalRow?.theme || "light";
  result.language = globalRow?.language || "zh";
  res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-cache" });
  res.end(JSON.stringify(result));
}

function isLegacyVoiceDefault(role, settings) {
  if (!settings) return false;
  const endpoint = String(settings.endpoint || "").replace(/\/+$/, "");
  const model = String(settings.model || "");
  if (
    role === "chat" &&
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

export async function handleUpdateSettings(body, res) {
  if (!body || typeof body !== "object") {
    res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Invalid body" }));
    return;
  }
  const result = {};

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

  const allowed = ["analysis", "chat", "image", "asr", "realtime", "deepthink"];
  for (const role of allowed) {
    const cfg = body[role];
    if (!cfg || typeof cfg !== "object") continue;
    const endpoint = typeof cfg.endpoint === "string" ? cfg.endpoint.trim() : "";
    const model = typeof cfg.model === "string" ? cfg.model.trim() : "";
    const apiKey = typeof cfg.apiKey === "string" ? cfg.apiKey.trim() : "";
    let temperature = typeof cfg.temperature === "number" ? cfg.temperature : 0.7;
    temperature = Math.min(2, Math.max(0, temperature));
    const upserted = await prisma.settings.upsert({
      where: { role },
      update: { endpoint, model, apiKey, temperature },
      create: { role, endpoint, model, apiKey, temperature }
    });
    result[role] = { endpoint: upserted.endpoint, model: upserted.model, apiKey: upserted.apiKey, temperature: upserted.temperature };
  }
  res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-cache" });
  res.end(JSON.stringify(result));
}
