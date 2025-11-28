# Fix Production Migration

## Problem
The migration `20250101000000_restructure_business_model` failed on production, blocking new migrations.

## Solution

Since the production database doesn't have much data yet, we can safely fix this.

### Option 1: Automated Fix (Recommended)

Run the automated script on your production server:

```bash
cd /home/mytgapp.com/mytgapp
./scripts/fix-production-migration.sh
```

This script will:
1. Check migration status
2. Clean up credit requests with null `publisherId`
3. Resolve the failed migration
4. Apply all pending migrations
5. Verify everything is correct

### Option 2: Manual Steps

If you prefer to do it manually:

```bash
# 1. Fix credit requests (remove null publisherId values)
npm run fix-credit-requests

# 2. Mark the failed migration as rolled back
npx prisma migrate resolve --rolled-back 20250101000000_restructure_business_model

# 3. Apply migrations
npx prisma migrate deploy

# 4. Verify
npx prisma migrate status
```

### What the fix does:

1. **Cleans up credit requests**: Deletes pending requests with null `publisherId` and marks others as rejected
2. **Resolves failed migration**: Tells Prisma the migration was rolled back so it can be re-applied
3. **Applies migrations**: The new clean migration (`20251128170000_restructure_business_model`) will be applied

### Expected Output

After running the fix, you should see:
```
Database schema is up to date!
```

### If Issues Persist

If you still see errors:

1. **Check database state**:
   ```bash
   npm run check-db-state
   ```

2. **Manually check migration table**:
   ```sql
   SELECT * FROM "_prisma_migrations" WHERE migration_name LIKE '%restructure%';
   ```

3. **If migration is partially applied**, you may need to manually mark it:
   ```bash
   # If columns exist but migration is marked as failed
   npx prisma migrate resolve --applied 20250101000000_restructure_business_model
   ```

## Notes

- The fix script uses `IF NOT EXISTS` and conditional checks, so it's safe to run multiple times
- Since there's not much data, the cleanup is minimal and safe
- The new migration (`20251128170000_restructure_business_model`) handles all edge cases

