-- AlterTable
ALTER TABLE "TelegramGroup" ADD COLUMN IF NOT EXISTS "stickyPostsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "stickyPostPrice" INTEGER,
ADD COLUMN IF NOT EXISTS "stickyPostPeriodDays" INTEGER;

-- AlterTable
ALTER TABLE "CreditTransaction" ADD COLUMN IF NOT EXISTS "grantedByUserId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CreditTransaction_grantedByUserId_idx" ON "CreditTransaction"("grantedByUserId");

-- CreateTable
CREATE TABLE IF NOT EXISTS "StickyPostRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "groupOwnerId" TEXT NOT NULL,
    "postId" TEXT,
    "content" TEXT,
    "mediaUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "periodDays" INTEGER NOT NULL,
    "creditsPaid" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "processedBy" TEXT,
    "processedAt" TIMESTAMP(3),
    "fulfilledAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StickyPostRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StickyPostRequest_userId_idx" ON "StickyPostRequest"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StickyPostRequest_groupId_idx" ON "StickyPostRequest"("groupId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StickyPostRequest_groupOwnerId_idx" ON "StickyPostRequest"("groupOwnerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StickyPostRequest_status_idx" ON "StickyPostRequest"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StickyPostRequest_createdAt_idx" ON "StickyPostRequest"("createdAt");

-- AddForeignKey
ALTER TABLE "StickyPostRequest" ADD CONSTRAINT "StickyPostRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StickyPostRequest" ADD CONSTRAINT "StickyPostRequest_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TelegramGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StickyPostRequest" ADD CONSTRAINT "StickyPostRequest_groupOwnerId_fkey" FOREIGN KEY ("groupOwnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

