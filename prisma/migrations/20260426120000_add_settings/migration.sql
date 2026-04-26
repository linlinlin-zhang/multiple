CREATE TABLE "Settings" (
  "id" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "apiKey" TEXT NOT NULL,
  "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Settings_role_key" ON "Settings"("role");
ALTER TABLE "Settings" ADD COLUMN "theme" TEXT NOT NULL DEFAULT 'light';
ALTER TABLE "Settings" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'zh';
