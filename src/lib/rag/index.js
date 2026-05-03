/**
 * Session-scoped RAG facade.
 *
 * API handlers and canvas/chat/research code should use this module instead
 * of calling chunking, embedding, or storage internals directly.
 */

import { chunkText, estimateTokens } from "./chunker.js";
import { embedTexts, embedText, isEmbeddingConfigured } from "./embedding.js";
import { insertChunks, searchSimilar, deleteChunksFor, countChunks } from "./store.js";

export const CONTEXT_KINDS = Object.freeze({
  FILE: "file",
  WEB: "web",
  CARD: "card",
  CHAT: "chat",
  GENERATED: "generated",
  ANALYSIS: "analysis",
  NOTE: "note"
});

function normalizeKind(kind) {
  const allowed = Object.values(CONTEXT_KINDS);
  return allowed.includes(kind) ? kind : CONTEXT_KINDS.NOTE;
}

export async function ingestText({
  sessionId,
  kind,
  text,
  sourceId = null,
  sourceMeta = null,
  replace = false
}) {
  if (!sessionId || typeof sessionId !== "string") {
    throw new Error("ingestText: sessionId is required");
  }
  if (typeof text !== "string" || !text.trim()) return { ok: false, reason: "empty", inserted: 0 };
  if (!isEmbeddingConfigured()) return { ok: false, reason: "embedding_disabled", inserted: 0 };

  const normKind = normalizeKind(kind);
  const chunks = chunkText(text);
  if (!chunks.length) return { ok: false, reason: "no_chunks", inserted: 0 };

  if (replace && sourceId) {
    await deleteChunksFor({ sessionId, kind: normKind, sourceId });
  }

  const vectors = await embedTexts(chunks);
  const rows = chunks.map((content, idx) => ({
    sessionId,
    kind: normKind,
    sourceId,
    sourceMeta,
    chunkIndex: idx,
    content,
    tokens: estimateTokens(content),
    embedding: vectors[idx]
  }));

  const ids = await insertChunks(rows);
  return { ok: true, inserted: ids.length, ids, chunks: chunks.length };
}

export async function ingestSnippet({
  sessionId,
  kind,
  text,
  sourceId = null,
  sourceMeta = null,
  chunkIndex = 0,
  replace = false
}) {
  if (!sessionId) throw new Error("ingestSnippet: sessionId is required");
  if (typeof text !== "string" || !text.trim()) return { ok: false, reason: "empty", inserted: 0 };
  if (!isEmbeddingConfigured()) return { ok: false, reason: "embedding_disabled", inserted: 0 };

  const normKind = normalizeKind(kind);
  const trimmed = text.trim().slice(0, 4000);

  if (replace && sourceId) {
    await deleteChunksFor({ sessionId, kind: normKind, sourceId });
  }

  const vector = await embedText(trimmed);
  const ids = await insertChunks([
    {
      sessionId,
      kind: normKind,
      sourceId,
      sourceMeta,
      chunkIndex,
      content: trimmed,
      tokens: estimateTokens(trimmed),
      embedding: vector
    }
  ]);
  return { ok: true, inserted: ids.length, ids };
}

export async function retrieveContext({
  sessionId,
  query,
  topK = 6,
  kinds = null,
  minScore = 0.18
}) {
  if (!sessionId) throw new Error("retrieveContext: sessionId is required");
  if (typeof query !== "string" || !query.trim()) return [];
  if (!isEmbeddingConfigured()) return [];

  const queryEmbedding = await embedText(query);
  return searchSimilar({ sessionId, queryEmbedding, topK, kinds, minScore });
}

export function formatContextForPrompt(rows, { maxChars = 3000, lang = "zh" } = {}) {
  if (!Array.isArray(rows) || rows.length === 0) return "";

  const header = lang === "en"
    ? "Relevant session context (highest similarity first):"
    : "本次会话相关上下文（按相关度排序）：";
  const lines = [header];
  let used = header.length;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const label = describeSource(row.kind, row?.sourceMeta || {}, lang);
    const score = Number.isFinite(row.score) ? `(score=${row.score.toFixed(2)})` : "";
    const body = String(row.content || "").trim().replace(/\s+/g, " ").slice(0, 600);
    const block = `[${i + 1}] ${label} ${score}\n${body}`;
    if (used + block.length + 2 > maxChars) break;
    lines.push(block);
    used += block.length + 2;
  }

  return lines.join("\n\n");
}

function describeSource(kind, meta, lang) {
  const labelMap = lang === "en"
    ? { file: "File", web: "Web", card: "Card", chat: "Chat", generated: "Generated", analysis: "Analysis", note: "Note" }
    : { file: "文件", web: "网页", card: "卡片", chat: "对话", generated: "生成图", analysis: "分析", note: "笔记" };
  const label = labelMap[kind] || kind;
  const hint = meta.fileName || meta.url || meta.title || meta.nodeId || meta.role || meta.hash || "";
  return hint ? `${label} - ${String(hint).slice(0, 80)}` : label;
}

export {
  isEmbeddingConfigured,
  countChunks,
  deleteChunksFor
};
