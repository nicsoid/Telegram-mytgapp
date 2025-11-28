-- SQL script to check if migration changes were applied
-- Run this to see what state the database is in

-- Check Publisher table for new columns
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'Publisher' 
  AND column_name IN ('freePostsUsed', 'freePostsLimit', 'pricePerCredit')
ORDER BY column_name;

-- Check if SubscriptionTierConfig table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'SubscriptionTierConfig'
) as subscription_tier_config_exists;

-- Check CreditRequest.publisherId constraint
SELECT 
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns
WHERE table_name = 'CreditRequest' 
  AND column_name = 'publisherId';

-- Check CreditTransactionType enum values
SELECT 
    unnest(enum_range(NULL::"CreditTransactionType"))::text as enum_value
ORDER BY enum_value;

-- Count credit requests with null publisherId (should be 0 if migration succeeded)
SELECT COUNT(*) as null_publisher_count
FROM "CreditRequest" 
WHERE "publisherId" IS NULL;

