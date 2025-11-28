#!/bin/bash

# Script to manually fix the migration enum issue
# This script drops the default, fixes the enum, and sets a new default

set -e

echo "🔧 Fixing UserRole enum migration..."

# Load database URL from .env
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not found in environment"
  exit 1
fi

# Run the SQL fix
psql "$DATABASE_URL" <<EOF
-- Drop the default constraint first
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;

-- Check if PUBLISHER exists and create new enum
DO \$\$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'PUBLISHER' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')
    ) THEN
        -- Create new enum
        CREATE TYPE "UserRole_new" AS ENUM ('USER', 'ADMIN');
        
        -- Update User table (convert PUBLISHER to USER)
        ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" 
        USING (
            CASE 
                WHEN "role"::text = 'PUBLISHER' THEN 'USER'::"UserRole_new"
                ELSE "role"::text::"UserRole_new"
            END
        );
        
        -- Set new default
        ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER'::"UserRole_new";
        
        -- Drop old enum
        DROP TYPE "UserRole";
        
        -- Rename new enum
        ALTER TYPE "UserRole_new" RENAME TO "UserRole";
    END IF;
END \$\$;

-- Mark migration as applied (if it failed)
UPDATE "_prisma_migrations" 
SET finished_at = NOW(), rolled_back_at = NULL
WHERE migration_name = '20251128180000_remove_publisher_role' 
  AND finished_at IS NULL;

EOF

echo "✅ Migration fix applied!"
echo "🚀 You can now run: npx prisma migrate deploy"

