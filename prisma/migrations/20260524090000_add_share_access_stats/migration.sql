ALTER TABLE "ShareToken" ADD COLUMN IF NOT EXISTS "accessCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ShareToken" ADD COLUMN IF NOT EXISTS "lastAccessedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "ShareToken_sessionId_createdAt_idx" ON "ShareToken"("sessionId", "createdAt");
