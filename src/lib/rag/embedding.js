/**
 * Embedding client.
 *
 * Default: DashScope text-embedding-v3 (1024-dim) via the OpenAI-compatible
 * `/embeddings` endpoint. The 1024 dimension is locked into the database
 * schema (`vector(1024)`) — switching providers requires a new column.
 *
 * Configurable via env:
 *   EMBEDDING_API_KEY     — falls back to DASHSCOPE_API_KEY
 *   EMBEDDING_BASE_URL    — default https://dashscope.aliyuncs.com/compatible-mode/v1
 *   EMBEDDING_MODEL       — default text-embedding-v3
 *   EMBEDDING_DIMENSIONS  — default 1024
 *   EMBEDDING_BATCH_SIZE  — default 25 (DashScope cap = 25 inputs/request)
 */

const DEFAULT_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
const DEFAULT_MODEL = "text-embedding-v3";
const DEFAULT_DIM = 1024;
const DEFAULT_BATCH = 10;
const REQUEST_TIMEOUT_MS = 30000;

function readConfig() {
  const apiKey = process.env.EMBEDDING_API_KEY || process.env.DASHSCOPE_API_KEY || "";
  const baseUrl = (process.env.EMBEDDING_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const model = process.env.EMBEDDING_MODEL || DEFAULT_MODEL;
  const dim = Number(process.env.EMBEDDING_DIMENSIONS || DEFAULT_DIM);
  const batchSize = Math.min(25, Math.max(1, Number(process.env.EMBEDDING_BATCH_SIZE || DEFAULT_BATCH)));
  return { apiKey, baseUrl, model, dim, batchSize };
}

export function embeddingDimensions() {
  return readConfig().dim;
}

export function isEmbeddingConfigured() {
  return Boolean(readConfig().apiKey);
}

/**
 * Embed a list of strings. Returns `Float32Array[]` aligned with input order.
 * Empty / whitespace-only inputs receive a zero-vector and never hit the API.
 */
export async function embedTexts(inputs) {
  const list = Array.isArray(inputs) ? inputs : [inputs];
  const texts = list.map((s) => (typeof s === "string" ? s : ""));

  const cfg = readConfig();
  if (!cfg.apiKey) {
    throw new Error("Embedding API key missing. Set DASHSCOPE_API_KEY or EMBEDDING_API_KEY in .env.");
  }

  const out = new Array(texts.length);
  const liveIndex = [];
  const liveText = [];
  for (let i = 0; i < texts.length; i++) {
    const t = texts[i].trim();
    if (!t) {
      out[i] = new Float32Array(cfg.dim);
    } else {
      liveIndex.push(i);
      liveText.push(t.slice(0, 8000));
    }
  }

  for (let start = 0; start < liveText.length; start += cfg.batchSize) {
    const slice = liveText.slice(start, start + cfg.batchSize);
    const vectors = await callEmbeddingApi(slice, cfg);
    for (let j = 0; j < vectors.length; j++) {
      out[liveIndex[start + j]] = vectors[j];
    }
  }

  return out;
}

export async function embedText(input) {
  const [vec] = await embedTexts([input]);
  return vec;
}

async function callEmbeddingApi(slice, cfg) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(`${cfg.baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: cfg.model,
        input: slice,
        dimensions: cfg.dim,
        encoding_format: "float"
      }),
      signal: controller.signal
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`embedding API timeout after ${REQUEST_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`embedding API returned non-JSON: ${text.slice(0, 200)}`);
  }
  if (!response.ok) {
    throw new Error(`embedding API ${response.status}: ${json?.error?.message || text.slice(0, 200)}`);
  }

  const data = Array.isArray(json?.data) ? json.data : [];
  data.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  return data.map((row) => {
    const arr = row?.embedding || [];
    if (arr.length !== cfg.dim) {
      throw new Error(`embedding dim mismatch: got ${arr.length}, expected ${cfg.dim}`);
    }
    return Float32Array.from(arr);
  });
}

/**
 * Cosine similarity for two equal-length vectors.
 * Used by tests / debugging — runtime ranking is done in pgvector.
 */
export function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}
