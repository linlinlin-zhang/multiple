-- AlterTable
ALTER TABLE "Settings" ALTER COLUMN "endpoint" SET DEFAULT '',
ALTER COLUMN "model" SET DEFAULT '',
ALTER COLUMN "apiKey" SET DEFAULT '';

-- CreateTable
CREATE TABLE "MaterialItem" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "hash" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaterialItem_hash_idx" ON "MaterialItem"("hash");

-- CreateIndex
CREATE INDEX "MaterialItem_fileName_idx" ON "MaterialItem"("fileName");

-- CreateIndex
CREATE INDEX "MaterialItem_addedAt_idx" ON "MaterialItem"("addedAt");
