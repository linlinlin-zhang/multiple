/**
 * pgvector-backed store for ContextChunk rows.
 *
 * Reads/writes to the `vector(1024)` column go through raw SQL —
 * Prisma marks that column as `Unsupported(...)` so generated client
 * methods would silently drop it.
 */

import crypto from "node:crypto";
import { prisma } from "../prisma.js";
import { embeddingDimensions } from "./embedding.js";

const VECTOR_DIM = embeddingDimensions();

/**
 * Convert a Float32Array / number[] into the textual form pgvector expects.
 * Example: [0.1, -0.2, 0.3] → '[0.1,-0.2,0.3]'
 */
export function formatVectorLiteral(vector) {
  const arr = Array.isArray(vector) ? vector : Array.from(vector || []);
  if (arr.length !== VECTOR_DIM) {
    throw new Error(`vector length mismatch: got ${arr.length}, expected ${VECTOR_DIM}`);
  }
  return `[${arr.map((v) => Number(v).toFixed(7)).join(",")}]`;
}

/**
 * Upsert one chunk row by (sessionId, kind, sourceId, chunkIndex). If a row
 * with the same key already exists, the embedding/content/meta are replaced
 * — useful when the user re-uploads the same file or edits a card.
 */
export async function upsertChunk({
  sessionId,
  kind,
  sourceId = null,
  sourceMeta = null,
  chunkIndex = 0,
  content,
  tokens = 0,
  embedding
}) {
  if (!sessionId || !kind || !content) {
    throw new Error("upsertChunk requires sessionId, kind, content");
  }
  const id = crypto.randomUUID();
  const literal = formatVectorLiteral(embedding);
  const meta = sourceMeta == null ? null : JSON.stringify(sourceMeta);

  // emulate "ON CONFLICT" using a deterministic id derived from the natural key
  const naturalKey = `${sessionId}|${kind}|${sourceId || ""}|${chunkIndex}`;
  const stableId = crypto.createHash("sha1").update(naturalKey).digest("hex");
  const finalId = sourceId ? toUuidV4(stableId) : id;

  await prisma.$executeRawUnsafe(
    `INSERT INTO "ContextChunk"
       ("id","sessionId","kind","sourceId","sourceMeta","chunkIndex","content","tokens","embedding","createdAt")
     VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9::vector,NOW())
     ON CONFLICT ("id") DO UPDATE SET
       "sourceMeta" = EXCLUDED."sourceMeta",
       "content"    = EXCLUDED."content",
       "tokens"     = EXCLUDED."tokens",
       "embedding"  = EXCLUDED."embedding"`,
    finalId,
    sessionId,
    kind,
    sourceId,
    meta,
    chunkIndex,
    content,
    tokens,
    literal
  );

  return finalId;
}

/**
 * Bulk insert several chunks for the same source in one round-trip.
 * Returns the array of inserted ids.
 */
export async function insertChunks(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const ids = [];
  for (const row of rows) {
    const id = await upsertChunk(row);
    ids.push(id);
  }
  return ids;
}

/**
 * Top-K nearest chunks (cosine) for `queryEmbedding`, restricted to a session.
 * Returns rows ordered by similarity DESC. `score` is the cosine similarity
 * (1 = identical, 0 = orthogonal). Raw distance is also returned for debugging.
 */
export async function searchSimilar({ sessionId, queryEmbedding, topK = 6, kinds = null, minScore = 0 }) {
  if (!sessionId) throw new Error("searchSimilar: sessionId is required");
  const literal = formatVectorLiteral(queryEmbedding);
  const k = Math.max(1, Math.min(50, Number(topK) || 6));

  const params = [sessionId, literal];
  let where = `"sessionId" = $1`;
  if (Array.isArray(kinds) && kinds.length) {
    params.push(kinds);
    where += ` AND "kind" = ANY($${params.length})`;
  }
  params.push(k);

  const rows = await prisma.$queryRawUnsafe(
    `SELECT
        "id","sessionId","kind","sourceId","sourceMeta","chunkIndex","content","tokens","createdAt",
        ("embedding" <=> $2::vector) AS distance,
        1 - ("embedding" <=> $2::vector) AS score
      FROM "ContextChunk"
      WHERE ${where} AND "embedding" IS NOT NULL
      ORDER BY "embedding" <=> $2::vector ASC
      LIMIT $${params.length}`,
    ...params
  );

  return rows
    .map((r) => ({
      ...r,
      score: Number(r.score),
      distance: Number(r.distance)
    }))
    .filter((r) => r.score >= minScore);
}

/**
 * Replace all chunks for a (session, kind, sourceId) — typical when an asset
 * is re-ingested with fresh content.
 */
export async function deleteChunksFor({ sessionId, kind = null, sourceId = null }) {
  if (!sessionId) throw new Error("deleteChunksFor: sessionId is required");
  const where = [`"sessionId" = $1`];
  const params = [sessionId];
  if (kind) {
    params.push(kind);
    where.push(`"kind" = $${params.length}`);
  }
  if (sourceId) {
    params.push(sourceId);
    where.push(`"sourceId" = $${params.length}`);
  }
  return prisma.$executeRawUnsafe(
    `DELETE FROM "ContextChunk" WHERE ${where.join(" AND ")}`,
    ...params
  );
}

export async function countChunks(sessionId) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS count FROM "ContextChunk" WHERE "sessionId" = $1`,
    sessionId
  );
  return rows[0]?.count || 0;
}

/**
 * Convert any 16+ hex chars into a valid UUID-v4-shaped string. Used to make
 * the natural-key SHA-1 fit pgsql's UUID column. Collision domain is per
 * (session, kind, sourceId, chunkIndex) — collisions there are intentional.
 */
function toUuidV4(hex) {
  const h = hex.padEnd(32, "0").slice(0, 32);
  const variant = (8 + (Number.parseInt(h[16], 16) % 4)).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
