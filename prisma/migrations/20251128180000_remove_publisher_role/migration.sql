-- Migration: Remove Publisher Role
-- This migration removes the Publisher model and moves all functionality to User
-- Since there are no active users, we can safely drop and recreate tables

-- Step 1: Drop foreign key constraints that reference Publisher
ALTER TABLE "TelegramGroup" DROP CONSTRAINT IF EXISTS "TelegramGroup_publisherId_fkey";
ALTER TABLE "TelegramPost" DROP CONSTRAINT IF EXISTS "TelegramPost_publisherId_fkey";
ALTER TABLE "Subscription" DROP CONSTRAINT IF EXISTS "Subscription_publisherId_fkey";
ALTER TABLE "PublisherManagedUser" DROP CONSTRAINT IF EXISTS "PublisherManagedUser_publisherId_fkey";
ALTER TABLE "CreditRequest" DROP CONSTRAINT IF EXISTS "CreditRequest_publisherId_fkey";

-- Step 2: Drop Publisher-related tables (no data to preserve)
DROP TABLE IF EXISTS "PublisherManagedUser" CASCADE;
DROP TABLE IF EXISTS "Publisher" CASCADE;

-- Step 3: Update UserRole enum - remove PUBLISHER
-- Create new enum without PUBLISHER
DO $$ 
BEGIN
    -- Check if PUBLISHER exists in enum
    IF EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'PUBLISHER' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')
    ) THEN
        -- Create new enum
        CREATE TYPE "UserRole_new" AS ENUM ('USER', 'ADMIN');
        
        -- Update User table
        ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" 
        USING (
            CASE 
                WHEN "role"::text = 'PUBLISHER' THEN 'USER'::"UserRole_new"
                ELSE "role"::text::"UserRole_new"
            END
        );
        
        -- Drop old enum
        DROP TYPE "UserRole";
        
        -- Rename new enum
        ALTER TYPE "UserRole_new" RENAME TO "UserRole";
    END IF;
END $$;

-- Step 4: Add subscription fields to User (if they don't exist)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionTier" "SubscriptionTier" NOT NULL DEFAULT 'FREE';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionExpiresAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "revenueSharePercent" DOUBLE PRECISION;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totalEarnings" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totalSpent" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "freePostsUsed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "freePostsLimit" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pricePerCredit" DOUBLE PRECISION;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "telegramVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN NOT NULL DEFAULT false;

-- Step 5: Update TelegramGroup - change publisherId to userId
ALTER TABLE "TelegramGroup" RENAME COLUMN "publisherId" TO "userId";
CREATE INDEX IF NOT EXISTS "TelegramGroup_userId_idx" ON "TelegramGroup"("userId");

-- Step 6: Update TelegramPost - change publisherId to ownerId
ALTER TABLE "TelegramPost" RENAME COLUMN "publisherId" TO "ownerId";
CREATE INDEX IF NOT EXISTS "TelegramPost_ownerId_idx" ON "TelegramPost"("ownerId");

-- Step 7: Update Subscription - change publisherId to userId
ALTER TABLE "Subscription" RENAME COLUMN "publisherId" TO "userId";
DROP INDEX IF EXISTS "Subscription_publisherId_idx";
CREATE INDEX IF NOT EXISTS "Subscription_userId_idx" ON "Subscription"("userId");
DROP INDEX IF EXISTS "Subscription_publisherId_tier_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_userId_tier_key" ON "Subscription"("userId", "tier");

-- Step 8: Update CreditRequest - change publisherId to groupOwnerId, add groupId
ALTER TABLE "CreditRequest" RENAME COLUMN "publisherId" TO "groupOwnerId";
ALTER TABLE "CreditRequest" ADD COLUMN IF NOT EXISTS "groupId" TEXT;
CREATE INDEX IF NOT EXISTS "CreditRequest_groupOwnerId_idx" ON "CreditRequest"("groupOwnerId");
CREATE INDEX IF NOT EXISTS "CreditRequest_groupId_idx" ON "CreditRequest"("groupId");

-- Step 9: Add foreign key constraints
ALTER TABLE "TelegramGroup" ADD CONSTRAINT "TelegramGroup_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

ALTER TABLE "TelegramPost" ADD CONSTRAINT "TelegramPost_ownerId_fkey" 
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE;

ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

ALTER TABLE "CreditRequest" ADD CONSTRAINT "CreditRequest_groupOwnerId_fkey" 
    FOREIGN KEY ("groupOwnerId") REFERENCES "User"("id") ON DELETE CASCADE;

-- Step 10: Add indexes to User for new fields
CREATE INDEX IF NOT EXISTS "User_subscriptionStatus_idx" ON "User"("subscriptionStatus");
CREATE INDEX IF NOT EXISTS "User_isVerified_idx" ON "User"("isVerified");

