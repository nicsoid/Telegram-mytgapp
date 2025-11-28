-- AlterTable
ALTER TABLE "Publisher" ADD COLUMN "freePostsUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "freePostsLimit" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN "pricePerCredit" DOUBLE PRECISION;

-- AlterTable: Make publisherId required in CreditRequest
-- First, delete pending requests without publisherId (these were likely admin requests)
DELETE FROM "CreditRequest" WHERE "publisherId" IS NULL AND "status" = 'PENDING';

-- For non-pending requests without publisherId, mark them as rejected
UPDATE "CreditRequest" 
SET 
  "status" = 'REJECTED',
  "notes" = COALESCE("notes", '') || ' [Auto-rejected: Admin credit granting removed]'
WHERE "publisherId" IS NULL;

-- Delete any remaining null values
DELETE FROM "CreditRequest" WHERE "publisherId" IS NULL;

-- Now we can safely make publisherId NOT NULL
ALTER TABLE "CreditRequest" ALTER COLUMN "publisherId" SET NOT NULL;

-- CreateTable
CREATE TABLE "SubscriptionTierConfig" (
    "id" TEXT NOT NULL,
    "tier" "SubscriptionTier" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "monthlyPrice" INTEGER,
    "revenueSharePercent" DOUBLE PRECISION,
    "creditsIncluded" INTEGER,
    "maxGroups" INTEGER,
    "features" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionTierConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionTierConfig_tier_key" ON "SubscriptionTierConfig"("tier");

-- CreateIndex
CREATE INDEX "SubscriptionTierConfig_tier_idx" ON "SubscriptionTierConfig"("tier");

-- CreateIndex
CREATE INDEX "SubscriptionTierConfig_isActive_idx" ON "SubscriptionTierConfig"("isActive");

-- AlterEnum: Remove ADMIN_GRANT, Add PUBLISHER_GRANT and FREE_POST
-- Note: This requires manual handling if there are existing ADMIN_GRANT transactions
-- First, update existing ADMIN_GRANT to PUBLISHER_GRANT (or handle as needed)
UPDATE "CreditTransaction" SET "type" = 'PUBLISHER_GRANT' WHERE "type" = 'ADMIN_GRANT';

-- Then alter the enum
ALTER TYPE "CreditTransactionType" RENAME TO "CreditTransactionType_old";
CREATE TYPE "CreditTransactionType" AS ENUM ('PURCHASE', 'EARNED', 'SPENT', 'WITHDRAWAL', 'PUBLISHER_GRANT', 'COMMISSION', 'FREE_POST');
ALTER TABLE "CreditTransaction" ALTER COLUMN "type" TYPE "CreditTransactionType" USING "type"::text::"CreditTransactionType";
DROP TYPE "CreditTransactionType_old";

