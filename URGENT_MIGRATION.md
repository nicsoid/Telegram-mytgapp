# ⚠️ URGENT: Apply Database Migration

## The Problem
Your application is trying to access database columns (`subscriptionTier`, `subscriptionStatus`, etc.) that don't exist yet because the migration hasn't been applied.

**Error you're seeing:**
```
The column `User.subscriptionTier` does not exist in the current database.
```

## Quick Fix (Choose One)

### Option 1: Apply Migration via Docker Script (Recommended)
```bash
# Step 1: Fix enum issue (if needed)
./scripts/fix-migration-docker.sh

# Step 2: Apply the full migration
./scripts/apply-migration-docker.sh

# Step 3: Regenerate Prisma client
npx prisma generate

# Step 4: Restart your application
pm2 restart mytgapp
# or
docker-compose restart mytgapp
```

### Option 2: Manual Migration via Docker
```bash
# Connect to your PostgreSQL container
docker exec -it vps-postgres psql -U postgres -d mytgapp

# Then copy-paste the entire migration SQL from:
# prisma/migrations/20251128180000_remove_publisher_role/migration.sql
```

### Option 3: Use Prisma Migrate Deploy
```bash
# First fix enum issue if migration failed before
./scripts/fix-migration-docker.sh

# Then deploy
npx prisma migrate deploy

# Regenerate
npx prisma generate

# Restart
pm2 restart mytgapp
```

## What Gets Added
The migration adds these columns to the `User` table:
- `subscriptionTier` (default: 'FREE')
- `subscriptionStatus` (default: 'ACTIVE')
- `subscriptionExpiresAt`
- `revenueSharePercent`
- `totalEarnings`, `totalSpent`
- `freePostsUsed` (default: 0), `freePostsLimit` (default: 3)
- `pricePerCredit`
- `telegramVerified`, `isVerified`

## Verify After Migration
```bash
# Check migration status
npx prisma migrate status

# Verify columns exist
docker exec -it vps-postgres psql -U postgres -d mytgapp -c "\d \"User\""
```

Look for `subscriptionTier` in the column list.

## Temporary Workaround
I've made the code defensive so it won't crash, but you **must apply the migration** for full functionality. The defensive code will:
- Use default values for subscription fields
- Log warnings when columns are missing
- Continue working but with limited functionality

**This is only a temporary measure - apply the migration ASAP!**

