#!/bin/bash
# Fix PostgreSQL permissions for Prisma migrations
# For Docker PostgreSQL container: vps-postgres

set -e

CONTAINER_NAME="vps-postgres"
DB_NAME="mytgapp"
DB_USER="postgres"

echo "🔧 Fixing PostgreSQL permissions for Prisma migrations..."
echo "Container: $CONTAINER_NAME"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "❌ Error: Docker container '$CONTAINER_NAME' is not running"
    echo "Start it with: docker start $CONTAINER_NAME"
    exit 1
fi

echo "✅ Container is running"
echo ""

# Run SQL commands to fix permissions
echo "Granting permissions..."
docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME <<EOF
-- Grant usage on schema public
GRANT USAGE ON SCHEMA public TO $DB_USER;

-- Grant all privileges on schema public
GRANT ALL ON SCHEMA public TO $DB_USER;

-- Grant all privileges on all tables in public schema
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;

-- Grant all privileges on all sequences in public schema
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;

-- Grant all privileges on all functions in public schema
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO $DB_USER;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO $DB_USER;

-- Make sure the user can create objects
ALTER USER $DB_USER CREATEDB;

-- Verify permissions
SELECT 'Permissions fixed successfully!' as status;
\dn+ public
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database permissions fixed successfully!"
    echo ""
    echo "You can now run:"
    echo "  npx prisma migrate deploy"
    echo ""
else
    echo ""
    echo "❌ Failed to fix permissions."
    echo "Try running the SQL commands manually:"
    echo "  docker exec -it $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME"
    exit 1
fi
