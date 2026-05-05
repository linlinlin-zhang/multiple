ALTER TABLE "Session" ADD COLUMN "visitorId" TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE "MaterialItem" ADD COLUMN "visitorId" TEXT NOT NULL DEFAULT 'legacy';
CREATE INDEX "Session_visitorId_updatedAt_idx" ON "Session"("visitorId", "updatedAt");
CREATE INDEX "MaterialItem_visitorId_addedAt_idx" ON "MaterialItem"("visitorId", "addedAt");
CREATE INDEX "MaterialItem_visitorId_hash_idx" ON "MaterialItem"("visitorId", "hash");
