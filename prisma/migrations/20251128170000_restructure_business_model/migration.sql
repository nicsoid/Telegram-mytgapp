-- AlterTable: Add new fields to Publisher
ALTER TABLE "Publisher" ADD COLUMN IF NOT EXISTS "freePostsUsed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Publisher" ADD COLUMN IF NOT EXISTS "freePostsLimit" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "Publisher" ADD COLUMN IF NOT EXISTS "pricePerCredit" DOUBLE PRECISION;

-- AlterTable: Make publisherId required in CreditRequest
-- First, clean up any credit requests without publisherId
DELETE FROM "CreditRequest" WHERE "publisherId" IS NULL AND "status" = 'PENDING';

UPDATE "CreditRequest" 
SET 
  "status" = 'REJECTED',
  "notes" = COALESCE("notes", '') || ' [Auto-rejected: Admin credit granting removed]'
WHERE "publisherId" IS NULL;

-- Delete any remaining null values
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM "CreditRequest" WHERE "publisherId" IS NULL) THEN
    DELETE FROM "CreditRequest" WHERE "publisherId" IS NULL;
  END IF;
END $$;

-- Now make publisherId NOT NULL (only if not already)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'CreditRequest' 
      AND column_name = 'publisherId' 
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE "CreditRequest" ALTER COLUMN "publisherId" SET NOT NULL;
  END IF;
END $$;

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
-- Check if enum already has the new values
DO $$ 
DECLARE
    enum_exists boolean;
    has_publisher_grant boolean;
    has_free_post boolean;
    has_admin_grant boolean;
BEGIN
    -- Check if new enum values exist
    SELECT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'PUBLISHER_GRANT' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'CreditTransactionType')
    ) INTO has_publisher_grant;
    
    SELECT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'FREE_POST' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'CreditTransactionType')
    ) INTO has_free_post;
    
    SELECT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'ADMIN_GRANT' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'CreditTransactionType')
    ) INTO has_admin_grant;

    -- Only update if needed
    IF NOT has_publisher_grant OR NOT has_free_post OR has_admin_grant THEN
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
    END IF;
EXCEPTION
    WHEN duplicate_object THEN 
        -- If new type already exists, update data and switch
        UPDATE "CreditTransaction" SET "type" = 'PUBLISHER_GRANT'::"CreditTransactionType_new" WHERE "type"::text = 'ADMIN_GRANT';
        ALTER TABLE "CreditTransaction" ALTER COLUMN "type" TYPE "CreditTransactionType_new" USING ("type"::text::"CreditTransactionType_new");
        DROP TYPE IF EXISTS "CreditTransactionType";
        ALTER TYPE "CreditTransactionType_new" RENAME TO "CreditTransactionType";
END $$;

