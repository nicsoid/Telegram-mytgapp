-- AlterTable: Add recurring scheduling fields to TelegramPost
ALTER TABLE "TelegramPost" ADD COLUMN IF NOT EXISTS "isRecurring" BOOLEAN DEFAULT false;
ALTER TABLE "TelegramPost" ADD COLUMN IF NOT EXISTS "recurrencePattern" TEXT;
ALTER TABLE "TelegramPost" ADD COLUMN IF NOT EXISTS "recurrenceInterval" INTEGER;
ALTER TABLE "TelegramPost" ADD COLUMN IF NOT EXISTS "recurrenceEndDate" TIMESTAMP(3);
ALTER TABLE "TelegramPost" ADD COLUMN IF NOT EXISTS "recurrenceCount" INTEGER;
ALTER TABLE "TelegramPost" ADD COLUMN IF NOT EXISTS "parentPostId" TEXT;
ALTER TABLE "TelegramPost" ADD COLUMN IF NOT EXISTS "nextOccurrence" TIMESTAMP(3);

-- Add index for recurring posts
CREATE INDEX IF NOT EXISTS "TelegramPost_nextOccurrence_idx" ON "TelegramPost"("nextOccurrence");
CREATE INDEX IF NOT EXISTS "TelegramPost_parentPostId_idx" ON "TelegramPost"("parentPostId");

