-- Script to fix credit requests before applying migration
-- Run this BEFORE applying the migration if you have existing credit requests with null publisherId

-- Option 1: Delete pending requests without publisherId
DELETE FROM "CreditRequest" WHERE "publisherId" IS NULL AND "status" = 'PENDING';

-- Option 2: Mark non-pending requests as rejected
UPDATE "CreditRequest" 
SET 
  "status" = 'REJECTED',
  "notes" = COALESCE("notes", '') || ' [Auto-rejected: Admin credit granting removed]'
WHERE "publisherId" IS NULL;

-- Option 3: Delete any remaining null values
DELETE FROM "CreditRequest" WHERE "publisherId" IS NULL;

-- Verify no null values remain
SELECT COUNT(*) as null_count FROM "CreditRequest" WHERE "publisherId" IS NULL;
-- Should return 0

