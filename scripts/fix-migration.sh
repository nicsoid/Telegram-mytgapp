#!/bin/bash

# Script to fix migration issues
# This script handles the case where credit requests have null publisherId values

echo "🔧 Fixing credit requests before migration..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL is not set in environment"
    exit 1
fi

# Run the fix SQL script using Prisma
echo "📝 Cleaning up credit requests with null publisherId..."

# Use Prisma to execute SQL
npx prisma db execute --stdin <<EOF
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
EOF

if [ $? -eq 0 ]; then
    echo "✅ Credit requests cleaned up successfully"
    echo "🚀 Now you can run: npx prisma migrate deploy"
else
    echo "❌ Failed to clean up credit requests"
    echo "💡 You may need to manually fix the database"
    exit 1
fi

