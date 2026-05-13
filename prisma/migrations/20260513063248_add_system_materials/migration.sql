-- DropIndex
DROP INDEX "ContextChunk_embedding_hnsw_idx";

-- AlterTable
ALTER TABLE "MaterialItem" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'user';

-- CreateTable
CREATE TABLE "MaterialHidden" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "hiddenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialHidden_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaterialHidden_visitorId_idx" ON "MaterialHidden"("visitorId");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialHidden_visitorId_materialId_key" ON "MaterialHidden"("visitorId", "materialId");

-- CreateIndex
CREATE INDEX "MaterialItem_source_idx" ON "MaterialItem"("source");

-- AddForeignKey
ALTER TABLE "MaterialHidden" ADD CONSTRAINT "MaterialHidden_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "MaterialItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
