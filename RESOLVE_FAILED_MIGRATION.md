# Resolve Failed Migration on Production

## Problem
The migration `20250101000000_restructure_business_model` failed and is blocking new migrations.

## Quick Fix Steps

### Step 1: Check Database State

Run this to see what was actually applied:

```bash
# Option A: Using the diagnostic script
./scripts/resolve-failed-migration.sh

# Option B: Check manually using Prisma Studio
npx prisma studio
# Then check:
# - Publisher table: look for freePostsUsed, freePostsLimit, pricePerCredit columns
# - SubscriptionTierConfig table: check if it exists
# - CreditRequest table: check if publisherId is NOT NULL
```

### Step 2: Resolve Based on State

#### If Migration Changes Were NOT Applied (columns don't exist):

```bash
# 1. Mark migration as rolled back
npx prisma migrate resolve --rolled-back 20250101000000_restructure_business_model

# 2. Fix credit requests (remove null publisherId values)
npm run fix-credit-requests

# 3. Apply migrations
npx prisma migrate deploy
```

#### If Migration Changes WERE Applied (columns exist):

```bash
# 1. Mark migration as applied (even though it's marked as failed)
npx prisma migrate resolve --applied 20250101000000_restructure_business_model

# 2. Continue with remaining migrations
npx prisma migrate deploy
```

### Step 3: Verify

After resolving, verify everything is correct:

```bash
npx prisma migrate status
# Should show: "Database schema is up to date!"
```

## Manual SQL Check (if needed)

If you have direct database access, you can check the state:

```sql
-- Check if new columns exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'Publisher' 
  AND column_name IN ('freePostsUsed', 'freePostsLimit', 'pricePerCredit');

-- Check if table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'SubscriptionTierConfig'
);

-- Check publisherId constraint
SELECT is_nullable 
FROM information_schema.columns
WHERE table_name = 'CreditRequest' 
  AND column_name = 'publisherId';
-- Should be 'NO' if migration succeeded
```

## Common Issues

1. **Migration partially applied**: Some changes succeeded, some failed
   - Solution: Manually complete the missing changes, then mark as applied

2. **Credit requests with null publisherId**: Blocking the NOT NULL constraint
   - Solution: Run `npm run fix-credit-requests` first

3. **Enum update failed**: CreditTransactionType enum update failed
   - Solution: Check if new enum values exist, manually fix if needed

## Recovery Script

If you're unsure, use the automated script:

```bash
./scripts/fix-failed-migration.sh
```

This will guide you through the resolution process.

