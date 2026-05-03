-- Enable pgvector extension (PostgreSQL 18.3 + pgvector 0.8.x on Aliyun RDS)
CREATE EXTENSION IF NOT EXISTS vector;

-- Session-scoped retrieval chunks
CREATE TABLE IF NOT EXISTS "ContextChunk" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sourceId" TEXT,
    "sourceMeta" JSONB,
    "chunkIndex" INTEGER NOT NULL DEFAULT 0,
    "content" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL DEFAULT 0,
    "embedding" vector(1024),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContextChunk_pkey" PRIMARY KEY ("id")
);

-- Hot-path filters
CREATE INDEX IF NOT EXISTS "ContextChunk_sessionId_idx"           ON "ContextChunk" ("sessionId");
CREATE INDEX IF NOT EXISTS "ContextChunk_sessionId_kind_idx"      ON "ContextChunk" ("sessionId", "kind");
CREATE INDEX IF NOT EXISTS "ContextChunk_sourceId_idx"            ON "ContextChunk" ("sourceId");

-- ANN index for cosine similarity search.
-- HNSW gives better recall/QPS at our scale than IVFFlat and does not
-- require the table to be populated before index build.
CREATE INDEX IF NOT EXISTS "ContextChunk_embedding_hnsw_idx"
    ON "ContextChunk"
    USING hnsw ("embedding" vector_cosine_ops);
