import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const DEFAULTS = {
  analysis: { endpoint: "https://api.moonshot.cn/v1", model: "kimi-k2.6", apiKey: "", temperature: 0.7 },
  chat: { endpoint: "https://api.moonshot.cn/v1", model: "kimi-k2.6", apiKey: "", temperature: 0.7 },
  image: { endpoint: "https://tokenhub.tencentmaas.com/v1/api/image", model: "hy-image-v3.0", apiKey: "", temperature: 0.7 }
};

export async function handleGetSettings(res) {
  const rows = await prisma.settings.findMany();
  const map = Object.fromEntries(rows.map(r => [r.role, { endpoint: r.endpoint, model: r.model, apiKey: r.apiKey, temperature: r.temperature }]));
  const result = {};
  for (const role of ["analysis", "chat", "image"]) {
    result[role] = map[role] || DEFAULTS[role];
  }
  res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-cache" });
  res.end(JSON.stringify(result));
}

export async function handleUpdateSettings(body, res) {
  if (!body || typeof body !== "object") {
    res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Invalid body" }));
    return;
  }
  const allowed = ["analysis", "chat", "image"];
  const result = {};
  for (const role of allowed) {
    const cfg = body[role];
    if (!cfg || typeof cfg !== "object") continue;
    const endpoint = typeof cfg.endpoint === "string" ? cfg.endpoint.trim() : "";
    const model = typeof cfg.model === "string" ? cfg.model.trim() : "";
    const apiKey = typeof cfg.apiKey === "string" ? cfg.apiKey.trim() : "";
    const temperature = typeof cfg.temperature === "number" ? cfg.temperature : 0.7;
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
