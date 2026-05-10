import fs from "node:fs";

loadDotEnv(".env");

const key = process.env.CONTROLLER_MODEL_CANDIDATE_MIMO_API_KEY || "";
const configuredBase = (process.env.CONTROLLER_MODEL_CANDIDATE_MIMO_API_BASE_URL || "").replace(/\/+$/, "");
const configuredModel = process.env.CONTROLLER_MODEL_CANDIDATE_MIMO_MODEL || "";
const keyShape = key.startsWith("tp-s") ? "tp-s*" : key.startsWith("tp-") ? "tp-*" : key.startsWith("sk-") ? "sk-*" : key ? "other" : "empty";
const bases = Array.from(new Set([
  configuredBase,
  "https://token-plan-sgp.xiaomimimo.com/v1",
  "https://token-plan-cn.xiaomimimo.com/v1",
  "https://token-plan.xiaomimimo.com/v1",
  "https://api.xiaomimimo.com/v1"
].filter(Boolean)));
const authVariants = [
  { name: "bearer", headers: { Authorization: `Bearer ${key}` } },
  { name: "x-api-key", headers: { "X-API-Key": key } },
  { name: "api-key", headers: { "api-key": key } }
];

console.log(JSON.stringify({ configuredBase, configuredModel, keySet: Boolean(key), keyLength: key.length, keyShape }, null, 2));

for (const base of bases) {
  await request(`${base} GET /models bearer`, `${base}/models`, { headers: { Authorization: `Bearer ${key}` } });
}

for (const base of bases) {
  for (const auth of authVariants) {
    await request(`${base} POST chat ${auth.name}`, `${base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth.headers },
      body: JSON.stringify({
        model: configuredModel || "mimo-v2.5-pro",
        messages: [{ role: "user", content: "hello" }],
        max_tokens: 32
      })
    });
  }
}

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

async function request(label, url, init) {
  const startedAt = Date.now();
  try {
    const response = await fetch(url, init);
    const text = await response.text();
    let body = {};
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { raw: text };
    }
    const message = body?.error?.message || body?.message || body?.raw || "";
    console.log(JSON.stringify({
      label,
      status: response.status,
      ok: response.ok,
      ms: Date.now() - startedAt,
      message: String(message).slice(0, 220)
    }));
  } catch (error) {
    console.log(JSON.stringify({ label, error: error.message, ms: Date.now() - startedAt }));
  }
}
