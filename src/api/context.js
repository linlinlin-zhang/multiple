/**
 * HTTP wrappers for session-scoped RAG.
 *
 * Endpoints:
 *   POST   /api/context/ingest      — push text into the session pool
 *   POST   /api/context/retrieve    — debug helper, returns top-K rows
 *   GET    /api/context/stats?sessionId=...
 *   DELETE /api/context/:sessionId  — wipe all chunks for a session
 */

import {
  ingestText,
  ingestSnippet,
  retrieveContext,
  countChunks,
  deleteChunksFor,
  isEmbeddingConfigured,
  CONTEXT_KINDS
} from "../lib/rag/index.js";

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-cache"
  });
  res.end(JSON.stringify(data));
}

/**
 * POST /api/context/ingest
 * Body:
 *   {
 *     sessionId, kind, text,
 *     sourceId?, sourceMeta?, replace?, snippet? (true → no chunking)
 *   }
 */
export async function handleContextIngest(body, res) {
  try {
    if (!isEmbeddingConfigured()) {
      return sendJson(res, 503, { error: "Embedding API key not configured" });
    }
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId.trim() : "";
    const kind = typeof body?.kind === "string" ? body.kind.trim() : "";
    const text = typeof body?.text === "string" ? body.text : "";
    const sourceId = typeof body?.sourceId === "string" ? body.sourceId : null;
    const sourceMeta = body?.sourceMeta && typeof body.sourceMeta === "object" ? body.sourceMeta : null;
    const replace = body?.replace === true;
    const snippet = body?.snippet === true;

    if (!sessionId || !kind || !text.trim()) {
      return sendJson(res, 400, { error: "sessionId, kind, text are required" });
    }
    if (text.length > 200000) {
      return sendJson(res, 413, { error: "text too large (>200K chars)" });
    }

    const fn = snippet ? ingestSnippet : ingestText;
    const result = await fn({ sessionId, kind, text, sourceId, sourceMeta, replace });
    return sendJson(res, 200, result);
  } catch (error) {
    console.error("[handleContextIngest]", error);
    return sendJson(res, 500, { error: error.message || "ingest failed" });
  }
}

/**
 * POST /api/context/retrieve
 * Body: { sessionId, query, topK?, kinds?, minScore? }
 */
export async function handleContextRetrieve(body, res) {
  try {
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId.trim() : "";
    const query = typeof body?.query === "string" ? body.query : "";
    const topK = Math.max(1, Math.min(20, Number(body?.topK) || 6));
    const kinds = Array.isArray(body?.kinds) && body.kinds.length ? body.kinds : null;
    const minScore = Number.isFinite(Number(body?.minScore)) ? Number(body.minScore) : 0.18;

    if (!sessionId || !query.trim()) {
      return sendJson(res, 400, { error: "sessionId and query are required" });
    }

    const rows = await retrieveContext({ sessionId, query, topK, kinds, minScore });
    return sendJson(res, 200, {
      ok: true,
      count: rows.length,
      rows: rows.map((r) => ({
        kind: r.kind,
        sourceId: r.sourceId,
        sourceMeta: r.sourceMeta,
        chunkIndex: r.chunkIndex,
        score: r.score,
        content: r.content
      }))
    });
  } catch (error) {
    console.error("[handleContextRetrieve]", error);
    return sendJson(res, 500, { error: error.message || "retrieve failed" });
  }
}

/**
 * GET /api/context/stats?sessionId=...
 */
export async function handleContextStats(req, res) {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    const sessionId = url.searchParams.get("sessionId") || "";
    if (!sessionId) {
      return sendJson(res, 400, { error: "sessionId is required" });
    }
    const count = await countChunks(sessionId);
    return sendJson(res, 200, {
      ok: true,
      sessionId,
      chunks: count,
      embeddingConfigured: isEmbeddingConfigured(),
      kinds: Object.values(CONTEXT_KINDS)
    });
  } catch (error) {
    console.error("[handleContextStats]", error);
    return sendJson(res, 500, { error: error.message || "stats failed" });
  }
}

/**
 * DELETE /api/context/:sessionId
 */
export async function handleContextWipe(sessionId, res) {
  try {
    if (!sessionId) {
      return sendJson(res, 400, { error: "sessionId is required" });
    }
    await deleteChunksFor({ sessionId });
    return sendJson(res, 200, { ok: true, sessionId });
  } catch (error) {
    console.error("[handleContextWipe]", error);
    return sendJson(res, 500, { error: error.message || "wipe failed" });
  }
}
