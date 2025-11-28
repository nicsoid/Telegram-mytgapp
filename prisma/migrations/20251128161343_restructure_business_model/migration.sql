-- AlterTable: Add new fields to Publisher
ALTER TABLE "Publisher" ADD COLUMN IF NOT EXISTS "freePostsUsed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Publisher" ADD COLUMN IF NOT EXISTS "freePostsLimit" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "Publisher" ADD COLUMN IF NOT EXISTS "pricePerCredit" DOUBLE PRECISION;

-- AlterTable: Make publisherId required in CreditRequest
-- First, delete any credit requests without publisherId (since admins no longer grant credits)
DELETE FROM "CreditRequest" WHERE "publisherId" IS NULL;
ALTER TABLE "CreditRequest" ALTER COLUMN "publisherId" SET NOT NULL;

-- CreateTable: SubscriptionTierConfig
CREATE TABLE IF NOT EXISTS "SubscriptionTierConfig" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "SubscriptionTierConfig_tier_key" ON "SubscriptionTierConfig"("tier");
CREATE INDEX IF NOT EXISTS "SubscriptionTierConfig_tier_idx" ON "SubscriptionTierConfig"("tier");
CREATE INDEX IF NOT EXISTS "SubscriptionTierConfig_isActive_idx" ON "SubscriptionTierConfig"("isActive");

-- AlterEnum: Update CreditTransactionType
-- First, update existing ADMIN_GRANT to PUBLISHER_GRANT
UPDATE "CreditTransaction" SET "type" = 'PUBLISHER_GRANT' WHERE "type" = 'ADMIN_GRANT';

-- Then alter the enum (PostgreSQL doesn't support direct enum modification, so we need to recreate it)
-- Create new enum
DO $$ BEGIN
    CREATE TYPE "CreditTransactionType_new" AS ENUM ('PURCHASE', 'EARNED', 'SPENT', 'WITHDRAWAL', 'PUBLISHER_GRANT', 'COMMISSION', 'FREE_POST');
    ALTER TABLE "CreditTransaction" ALTER COLUMN "type" TYPE "CreditTransactionType_new" USING ("type"::text::"CreditTransactionType_new");
    DROP TYPE "CreditTransactionType";
    ALTER TYPE "CreditTransactionType_new" RENAME TO "CreditTransactionType";
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

