-- CreateTable
CREATE TABLE IF NOT EXISTS "FileUnderstanding" (
    "id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "abstract" TEXT NOT NULL DEFAULT '',
    "structure" JSONB,
    "keyMaterials" JSONB,
    "actionableDirections" JSONB,
    "isScanned" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FileUnderstanding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "FileUnderstanding_hash_key" ON "FileUnderstanding"("hash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FileUnderstanding_hash_idx" ON "FileUnderstanding"("hash");
