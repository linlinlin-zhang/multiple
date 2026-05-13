-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'user';

-- CreateTable
CREATE TABLE "SessionHidden" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "hiddenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionHidden_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SessionHidden_visitorId_idx" ON "SessionHidden"("visitorId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionHidden_visitorId_sessionId_key" ON "SessionHidden"("visitorId", "sessionId");

-- CreateIndex
CREATE INDEX "Session_source_idx" ON "Session"("source");

-- AddForeignKey
ALTER TABLE "SessionHidden" ADD CONSTRAINT "SessionHidden_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
