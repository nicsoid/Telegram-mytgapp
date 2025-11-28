#!/bin/bash

# Script to fix migration enum issue using Docker PostgreSQL container
# Usage: ./scripts/fix-migration-docker.sh [database_name]

set -e

CONTAINER_NAME="vps-postgres"
DB_NAME="${1:-mytgapp}"

echo "🔧 Fixing UserRole enum migration in Docker container..."

# Check if container is running
if ! docker ps | grep -q "$CONTAINER_NAME"; then
  echo "❌ Docker container '$CONTAINER_NAME' is not running"
  echo "Please start it with: docker start $CONTAINER_NAME"
  exit 1
fi

echo "📦 Using Docker container: $CONTAINER_NAME"
echo "📊 Database: $DB_NAME"

# Run the SQL fix via Docker
docker exec -i "$CONTAINER_NAME" psql -U postgres -d "$DB_NAME" <<'EOF'
-- Drop the default constraint first
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;

-- Check if PUBLISHER exists and create new enum
DO $$ 
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
        
        RAISE NOTICE 'UserRole enum updated successfully';
    ELSE
        RAISE NOTICE 'PUBLISHER role not found, enum may already be updated';
    END IF;
END $$;

-- Mark migration as applied (if it failed)
UPDATE "_prisma_migrations" 
SET finished_at = NOW(), rolled_back_at = NULL
WHERE migration_name = '20251128180000_remove_publisher_role' 
  AND finished_at IS NULL;

SELECT 'Migration fix completed!' as status;
EOF

echo ""
echo "✅ Migration fix applied!"
echo "🚀 You can now run: npx prisma migrate deploy"
echo ""
echo "To verify, check the migration status:"
echo "  npx prisma migrate status"

