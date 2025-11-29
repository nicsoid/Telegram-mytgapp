-- AlterTable
ALTER TABLE "ScheduledPostTime" ADD COLUMN "isFreePost" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "ScheduledPostTime_isFreePost_idx" ON "ScheduledPostTime"("isFreePost");

