# Quick Fix for Production Migration

## The Problem
Migration `20250101000000_restructure_business_model` failed on production, blocking new migrations.

## The Solution (3 Simple Steps)

Since your production database doesn't have much data, this is safe and quick:

### On Your Production Server:

```bash
cd /home/mytgapp.com/mytgapp

# Step 1: Fix credit requests (clean up null publisherId values)
npm run fix-credit-requests

# Step 2: Resolve the failed migration
npx prisma migrate resolve --rolled-back 20250101000000_restructure_business_model

# Step 3: Apply the new clean migration
npx prisma migrate deploy
```

### Or Use the Automated Script:

```bash
cd /home/mytgapp.com/mytgapp
./scripts/fix-production-migration.sh
```

## What This Does

1. **Fixes credit requests**: Removes any credit requests with null `publisherId` (safe since you don't have much data)
2. **Resolves failed migration**: Tells Prisma the old migration was rolled back
3. **Applies new migration**: The clean migration (`20251128170000_restructure_business_model`) will apply all changes safely

## Expected Result

After running, you should see:
```
Database schema is up to date!
```

## After Fixing

1. Regenerate Prisma client (if needed):
   ```bash
   npx prisma generate
   ```

2. Restart your application:
   ```bash
   # Depending on your setup
   pm2 restart mytgapp
   # or
   systemctl restart mytgapp
   ```

## Troubleshooting

If you get an error about the migration not being found:
```bash
# Check what migrations Prisma sees
npx prisma migrate status

# If the failed migration isn't listed, just run:
npx prisma migrate deploy
```

If you get an error about null values:
```bash
# Run the fix script again
npm run fix-credit-requests
npx prisma migrate deploy
```

## Notes

- The new migration uses `IF NOT EXISTS` and conditional checks, so it's safe to run multiple times
- All changes are idempotent (won't break if run twice)
- Since there's minimal data, the cleanup is very safe

