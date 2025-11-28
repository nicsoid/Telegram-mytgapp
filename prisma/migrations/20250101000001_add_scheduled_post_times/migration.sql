-- CreateTable
CREATE TABLE IF NOT EXISTS "ScheduledPostTime" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "postedAt" TIMESTAMP(3),
    "status" "PostStatus" NOT NULL DEFAULT 'SCHEDULED',
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledPostTime_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ScheduledPostTime_postId_idx" ON "ScheduledPostTime"("postId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ScheduledPostTime_scheduledAt_idx" ON "ScheduledPostTime"("scheduledAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ScheduledPostTime_status_idx" ON "ScheduledPostTime"("status");

-- AddForeignKey
ALTER TABLE "ScheduledPostTime" ADD CONSTRAINT "ScheduledPostTime_postId_fkey" FOREIGN KEY ("postId") REFERENCES "TelegramPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

