# Fix Migration Error

## Problem
The migration fails because there are existing `CreditRequest` records with `null` values in the `publisherId` column. The migration tries to make this column `NOT NULL`, but PostgreSQL won't allow it if there are null values.

## Solution

### Option 1: Use the Fix Script (Recommended)
```bash
# Run the fix script to clean up null values
./scripts/fix-migration.sh

# Then apply the migration
npx prisma migrate deploy
```

### Option 2: Manual Database Fix

If you have direct database access, run this SQL:

```sql
-- Delete pending requests without publisherId
DELETE FROM "CreditRequest" WHERE "publisherId" IS NULL AND "status" = 'PENDING';

-- Mark non-pending requests as rejected
UPDATE "CreditRequest" 
SET 
  "status" = 'REJECTED',
  "notes" = COALESCE("notes", '') || ' [Auto-rejected: Admin credit granting removed]'
WHERE "publisherId" IS NULL;

-- Delete any remaining null values
DELETE FROM "CreditRequest" WHERE "publisherId" IS NULL;
```

Then apply the migration:
```bash
npx prisma migrate deploy
```

### Option 3: Using Docker (if PostgreSQL is in Docker)

```bash
# If your PostgreSQL is in Docker container named 'vps-postgres'
docker exec -i vps-postgres psql -U your_user -d mytgapp < scripts/fix-credit-requests.sql

# Then apply migration
npx prisma migrate deploy
```

## Verify

After fixing, verify no null values remain:
```sql
SELECT COUNT(*) FROM "CreditRequest" WHERE "publisherId" IS NULL;
-- Should return 0
```

## What Happens to Existing Credit Requests?

- **Pending requests without publisherId**: Deleted (these were admin requests)
- **Non-pending requests without publisherId**: Marked as REJECTED with a note
- **All other requests**: Unchanged

This is safe because:
1. Admins no longer grant credits (new business model)
2. Users must request credits from publishers
3. Old admin requests are no longer valid

