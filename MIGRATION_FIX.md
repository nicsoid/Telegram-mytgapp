# Migration Fix Guide

## Issue
The migration `20251128180000_remove_publisher_role` fails with:
```
ERROR: default for column "role" cannot be cast automatically to type "UserRole_new"
```

This happens because PostgreSQL cannot automatically cast the default value when changing enum types.

## Solution

### Option 1: Run the Docker Fix Script (Recommended for Docker PostgreSQL)
If you're using Docker PostgreSQL container named `vps-postgres`:
```bash
./scripts/fix-migration-docker.sh [database_name]
```

Default database name is `mytgapp`. If your database has a different name, specify it:
```bash
./scripts/fix-migration-docker.sh your_database_name
```

This script will:
1. Connect to the Docker PostgreSQL container
2. Drop the default constraint on the `role` column
3. Create a new enum without `PUBLISHER`
4. Convert existing `PUBLISHER` values to `USER`
5. Set a new default value
6. Mark the migration as applied

### Option 2: Run the General Fix Script
For non-Docker setups or if DATABASE_URL is set:
```bash
./scripts/fix-migration-manually.sh
```

This script automatically detects if Docker container is available and uses it, otherwise falls back to DATABASE_URL.

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

