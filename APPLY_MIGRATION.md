# Apply Migration - Quick Guide

## The Problem
Your database doesn't have the new columns (`subscriptionTier`, `subscriptionStatus`, etc.) that were added to the `User` table. The migration needs to be applied.

## Quick Fix Steps

### Step 1: Apply the Migration

**Option A: Using Docker (Recommended)**
```bash
# Run the migration fix script first (fixes enum issue)
./scripts/fix-migration-docker.sh

# Then apply the full migration
npx prisma migrate deploy
```

**Option B: Manual SQL Execution**
```bash
# Connect to your Docker PostgreSQL
docker exec -it vps-postgres psql -U postgres -d mytgapp

# Then run the migration SQL file
\i /path/to/prisma/migrations/20251128180000_remove_publisher_role/migration.sql
```

Or copy-paste the SQL from `prisma/migrations/20251128180000_remove_publisher_role/migration.sql` into the psql prompt.

### Step 2: Regenerate Prisma Client
```bash
npx prisma generate
```

### Step 3: Restart Your Application
```bash
# If using Docker Compose
docker-compose restart mytgapp

# Or if running directly
npm run dev
```

## What the Migration Does

1. ✅ Removes `PUBLISHER` role from enum (converts to `USER`)
2. ✅ Adds subscription fields to `User` table:
   - `subscriptionTier` (default: 'FREE')
   - `subscriptionStatus` (default: 'ACTIVE')
   - `subscriptionExpiresAt`
   - `revenueSharePercent`
   - `totalEarnings`
   - `totalSpent`
   - `freePostsUsed` (default: 0)
   - `freePostsLimit` (default: 3)
   - `pricePerCredit`
   - `telegramVerified` (default: false)
   - `isVerified` (default: false)
3. ✅ Updates `TelegramGroup.publisherId` → `TelegramGroup.userId`
4. ✅ Updates `TelegramPost.publisherId` → `TelegramPost.ownerId`
5. ✅ Updates `Subscription.publisherId` → `Subscription.userId`
6. ✅ Updates `CreditRequest.publisherId` → `CreditRequest.groupOwnerId`
7. ✅ Drops `Publisher` and `PublisherManagedUser` tables

## Verify Migration

After applying, verify:
```bash
npx prisma migrate status
```

Should show all migrations as applied.

## Troubleshooting

**If migration fails with enum error:**
```bash
./scripts/fix-migration-docker.sh
```

**If columns still don't exist:**
Check if migration was partially applied:
```bash
docker exec -it vps-postgres psql -U postgres -d mytgapp -c "\d \"User\""
```

Look for `subscriptionTier` column. If missing, the migration didn't complete.
