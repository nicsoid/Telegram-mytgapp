-- AlterTable: Add new fields to Publisher
ALTER TABLE "Publisher" ADD COLUMN IF NOT EXISTS "freePostsUsed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Publisher" ADD COLUMN IF NOT EXISTS "freePostsLimit" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "Publisher" ADD COLUMN IF NOT EXISTS "pricePerCredit" DOUBLE PRECISION;

-- AlterTable: Make publisherId required in CreditRequest
-- First, check if there are any credit requests without publisherId
-- If there are, we need to either delete them or assign them to a publisher
-- Since admins no longer grant credits, we'll delete pending requests without publisherId
-- and mark others as rejected

-- Delete pending requests without publisherId (these were likely admin requests)
DELETE FROM "CreditRequest" WHERE "publisherId" IS NULL AND "status" = 'PENDING';

-- For non-pending requests without publisherId, mark them as rejected with a note
UPDATE "CreditRequest" 
SET 
  "status" = 'REJECTED',
  "notes" = COALESCE("notes", '') || ' [Auto-rejected: Admin credit granting removed]'
WHERE "publisherId" IS NULL;

-- Now we can safely make publisherId NOT NULL
-- But first, check if there are still any null values
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM "CreditRequest" WHERE "publisherId" IS NULL) THEN
    -- If there are still null values, delete them
    DELETE FROM "CreditRequest" WHERE "publisherId" IS NULL;
  END IF;
END $$;

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
-- PostgreSQL doesn't support direct enum modification, so we need to recreate it
-- Step 1: Create new enum with all values including PUBLISHER_GRANT and FREE_POST
DO $$ 
BEGIN
    -- Create new enum type
    CREATE TYPE "CreditTransactionType_new" AS ENUM ('PURCHASE', 'EARNED', 'SPENT', 'WITHDRAWAL', 'PUBLISHER_GRANT', 'COMMISSION', 'FREE_POST');
    
    -- Convert existing ADMIN_GRANT to PUBLISHER_GRANT during type conversion
    ALTER TABLE "CreditTransaction" ALTER COLUMN "type" TYPE "CreditTransactionType_new" 
    USING (
        CASE 
            WHEN "type"::text = 'ADMIN_GRANT' THEN 'PUBLISHER_GRANT'::"CreditTransactionType_new"
            ELSE "type"::text::"CreditTransactionType_new"
        END
    );
    
    -- Drop old enum
    DROP TYPE "CreditTransactionType";
    
    -- Rename new enum to original name
    ALTER TYPE "CreditTransactionType_new" RENAME TO "CreditTransactionType";
EXCEPTION
    WHEN duplicate_object THEN 
        -- If new type already exists, just update the data
        UPDATE "CreditTransaction" SET "type" = 'PUBLISHER_GRANT'::"CreditTransactionType_new" WHERE "type"::text = 'ADMIN_GRANT';
        ALTER TABLE "CreditTransaction" ALTER COLUMN "type" TYPE "CreditTransactionType_new" USING ("type"::text::"CreditTransactionType_new");
        DROP TYPE IF EXISTS "CreditTransactionType";
        ALTER TYPE "CreditTransactionType_new" RENAME TO "CreditTransactionType";
END $$;

