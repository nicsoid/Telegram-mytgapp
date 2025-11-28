# Migration Fix Guide

## Issue
The migration `20251128180000_remove_publisher_role` fails with:
```
ERROR: default for column "role" cannot be cast automatically to type "UserRole_new"
```

This happens because PostgreSQL cannot automatically cast the default value when changing enum types.

## Solution

### Option 1: Run the Fix Script (Recommended)
```bash
./scripts/fix-migration-manually.sh
```

This script will:
1. Drop the default constraint on the `role` column
2. Create a new enum without `PUBLISHER`
3. Convert existing `PUBLISHER` values to `USER`
4. Set a new default value
5. Mark the migration as applied

### Option 2: Manual SQL Fix
If you prefer to run SQL manually, use the SQL file:
```bash
psql $DATABASE_URL -f scripts/fix-enum-migration.sql
```

Then mark the migration as applied:
```bash
npx prisma migrate resolve --applied 20251128180000_remove_publisher_role
```

### Option 3: Reset Database (Development Only)
If you're in development and can lose data:
```bash
npx prisma migrate reset
npx prisma migrate deploy
```

## After Fixing
1. Run `npx prisma generate` to regenerate Prisma client
2. Restart your application server
3. Verify the migration status: `npx prisma migrate status`

## What Changed
- Removed `PUBLISHER` role from `UserRole` enum
- All users with `PUBLISHER` role converted to `USER`
- Default role is now `USER`
- Publisher model removed, all fields moved to User model

