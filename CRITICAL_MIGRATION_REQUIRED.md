# ⚠️ CRITICAL: Database Migration Required

## The Problem
Your application is **crashing** because the database doesn't have the required columns. The migration **MUST** be applied before the app will work.

## Error You're Seeing
```
The column `User.subscriptionTier` does not exist in the current database.
```

## Quick Fix - Run These Commands

### Step 1: Fix Enum Issue (if needed)
```bash
./scripts/fix-migration-docker.sh
```

### Step 2: Apply Migration
```bash
./scripts/apply-migration-docker.sh
```

### Step 3: Regenerate Prisma Client
```bash
npx prisma generate
```

### Step 4: Restart Application
```bash
pm2 restart mytgapp
# or
docker-compose restart mytgapp
```

## What the Migration Adds

The migration adds these columns to the `User` table:
- ✅ `subscriptionTier` (default: 'FREE')
- ✅ `subscriptionStatus` (default: 'ACTIVE')
- ✅ `subscriptionExpiresAt`
- ✅ `revenueSharePercent`
- ✅ `totalEarnings`, `totalSpent`
- ✅ `freePostsUsed` (default: 0), `freePostsLimit` (default: 3)
- ✅ `pricePerCredit`
- ✅ `telegramVerified`, `isVerified`

## Verify Migration

After applying, check:
```bash
# Check migration status
npx prisma migrate status

# Verify columns exist
docker exec -it vps-postgres psql -U postgres -d mytgapp -c "\d \"User\""
```

Look for `subscriptionTier` in the column list.

## Why This Is Critical

Without the migration:
- ❌ App crashes on every request that checks subscription status
- ❌ Users can't access dashboard
- ❌ Mini App won't work
- ❌ All subscription-related features are broken

**The defensive code I added will prevent crashes temporarily, but you MUST apply the migration for full functionality.**

## Troubleshooting

**If migration fails:**
1. Check Docker container is running: `docker ps | grep vps-postgres`
2. Check database connection: `docker exec -it vps-postgres psql -U postgres -d mytgapp -c "SELECT 1"`
3. Check migration file exists: `ls -la prisma/migrations/20251128180000_remove_publisher_role/migration.sql`

**If columns still don't exist after migration:**
- The migration might have failed silently
- Check migration logs
- Manually verify columns: `docker exec -it vps-postgres psql -U postgres -d mytgapp -c "\d \"User\""`

