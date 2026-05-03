-- AlterTable
ALTER TABLE "MaterialItem" ADD COLUMN "favorited" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "MaterialItem_favorited_idx" ON "MaterialItem"("favorited");
