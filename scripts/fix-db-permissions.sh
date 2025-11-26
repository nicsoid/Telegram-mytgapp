#!/bin/bash
# Fix PostgreSQL permissions for Prisma migrations

# Get database connection details from .env
DB_URL=$(grep DATABASE_URL .env | grep -v "^#" | cut -d '=' -f2 | tr -d '"')

# Extract connection details
# Format: postgresql://user:password@host:port/database
DB_USER=$(echo $DB_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DB_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DB_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DB_URL | sed -n 's/.*@[^:]*:\([^/]*\)\/.*/\1/p')
DB_NAME=$(echo $DB_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "Connecting to database: $DB_NAME on $DB_HOST:$DB_PORT as $DB_USER"

# Run SQL commands to fix permissions
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME <<EOF
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

-- Verify
SELECT 'Permissions fixed successfully!' as status;
EOF

if [ $? -eq 0 ]; then
    echo "✅ Database permissions fixed successfully!"
    echo "You can now run: npx prisma migrate deploy"
else
    echo "❌ Failed to fix permissions. You may need to run this as a superuser."
    echo "Try connecting as postgres superuser and run the SQL commands manually."
fi

