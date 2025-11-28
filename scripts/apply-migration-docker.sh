#!/bin/bash

# Script to apply the migration via Docker PostgreSQL
# This will add all the new columns to the User table

set -e

CONTAINER_NAME="vps-postgres"
DB_NAME="${1:-mytgapp}"

echo "🚀 Applying migration to add subscription fields..."

# Check if container is running
if ! docker ps | grep -q "$CONTAINER_NAME"; then
  echo "❌ Docker container '$CONTAINER_NAME' is not running"
  echo "Please start it with: docker start $CONTAINER_NAME"
  exit 1
fi

echo "📦 Using Docker container: $CONTAINER_NAME"
echo "📊 Database: $DB_NAME"

# Read the migration SQL file
MIGRATION_FILE="prisma/migrations/20251128180000_remove_publisher_role/migration.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ Migration file not found: $MIGRATION_FILE"
  exit 1
fi

echo "📄 Applying migration from: $MIGRATION_FILE"
echo ""

# Apply the migration via Docker
docker exec -i "$CONTAINER_NAME" psql -U postgres -d "$DB_NAME" < "$MIGRATION_FILE"

echo ""
echo "✅ Migration applied successfully!"
echo ""
echo "Next steps:"
echo "  1. Regenerate Prisma client: npx prisma generate"
echo "  2. Restart your application"
echo "  3. Verify: npx prisma migrate status"

