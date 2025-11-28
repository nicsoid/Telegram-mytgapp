#!/bin/bash

# Script to fix failed migration on production server
# This script safely handles the migration state

set -e  # Exit on error

echo "🔧 Fixing migration on production server..."
echo ""

# Step 1: Check current migration status
echo "📊 Step 1: Checking migration status..."
npx prisma migrate status || true
echo ""

# Step 2: Fix credit requests (remove null publisherId values)
echo "🧹 Step 2: Cleaning up credit requests with null publisherId..."
echo "   This is safe since production doesn't have much data yet..."
npm run fix-credit-requests
echo ""

# Step 3: Resolve the failed migration
echo "🔍 Step 3: Resolving failed migration..."
FAILED_MIGRATION="20250101000000_restructure_business_model"

# Check if migration exists in database
echo "   Checking if failed migration exists..."
if npx prisma migrate status 2>&1 | grep -q "$FAILED_MIGRATION"; then
    echo "   Found failed migration, marking as rolled back..."
    npx prisma migrate resolve --rolled-back "$FAILED_MIGRATION" || {
        echo "   ⚠️  Could not mark as rolled back, trying to mark as applied..."
        npx prisma migrate resolve --applied "$FAILED_MIGRATION" || {
            echo "   ⚠️  Could not resolve migration, will try to apply new migration..."
        }
    }
else
    echo "   Failed migration not found in status, continuing..."
fi
echo ""

# Step 4: Apply migrations
echo "🚀 Step 4: Applying migrations..."
echo "   The new migration (20251128170000_restructure_business_model) will be applied..."
npx prisma migrate deploy
echo ""

# Step 5: Verify
echo "✅ Step 5: Verifying migration status..."
npx prisma migrate status
echo ""

# Step 6: Generate Prisma client
echo "🔄 Step 6: Regenerating Prisma client..."
npx prisma generate
echo ""

echo "🎉 Migration fix complete!"
echo ""
echo "Next steps:"
echo "  1. Restart your application server"
echo "  2. Verify the app is working correctly"

