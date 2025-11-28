#!/bin/bash

# Script to fix failed migration on production server
# This will check the database state and resolve the migration appropriately

echo "🔍 Checking database state..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL is not set in environment"
    exit 1
fi

echo "📊 Checking if migration changes were applied..."

# Use Prisma to check if columns exist
# We'll use a simple query to check
echo ""
echo "Checking Publisher table for new columns..."
echo "If you see freePostsUsed, freePostsLimit, pricePerCredit - migration partially applied"
echo ""

# Check if we can query the new columns (this will fail if they don't exist)
npx prisma db execute --stdin <<'EOF' 2>&1 | head -20 || echo "Could not check via Prisma"
SELECT 
    column_name
FROM information_schema.columns 
WHERE table_name = 'Publisher' 
  AND column_name IN ('freePostsUsed', 'freePostsLimit', 'pricePerCredit');
EOF

echo ""
echo "🔧 Resolving migration state..."
echo ""
echo "Based on the checks above:"
echo ""
echo "If columns DON'T exist:"
echo "  1. Mark migration as rolled back:"
echo "     npx prisma migrate resolve --rolled-back 20250101000000_restructure_business_model"
echo "  2. Fix credit requests:"
echo "     npm run fix-credit-requests"
echo "  3. Apply migration:"
echo "     npx prisma migrate deploy"
echo ""
echo "If columns DO exist:"
echo "  1. Mark migration as applied:"
echo "     npx prisma migrate resolve --applied 20250101000000_restructure_business_model"
echo "  2. Continue with next migration:"
echo "     npx prisma migrate deploy"
echo ""

