#!/bin/bash

# Script to manually fix the migration enum issue
# This script drops the default, fixes the enum, and sets a new default
# Supports both direct DATABASE_URL and Docker PostgreSQL container

set -e

echo "🔧 Fixing UserRole enum migration..."

# Check if running in Docker or using DATABASE_URL
if docker ps | grep -q "vps-postgres"; then
  echo "📦 Using Docker container: vps-postgres"
  
  # Get database name from DATABASE_URL or use default
  DB_NAME="${DATABASE_NAME:-mytgapp}"
  if [ -f .env ]; then
    DB_NAME=$(grep DATABASE_URL .env | sed -E 's/.*\/([^?]+).*/\1/' || echo "mytgapp")
  fi
  
  echo "Using database: $DB_NAME"
  
  # Run the SQL fix via Docker
  docker exec -i vps-postgres psql -U postgres -d "$DB_NAME" <<EOF
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
else
  # Use DATABASE_URL directly
  if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
  fi

  if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not found in environment and Docker container not available"
    echo "Please either:"
    echo "  1. Start the vps-postgres Docker container, or"
    echo "  2. Set DATABASE_URL in .env file"
    exit 1
  fi

  echo "📡 Using DATABASE_URL"
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
fi

echo "✅ Migration fix applied!"
echo "🚀 You can now run: npx prisma migrate deploy"

