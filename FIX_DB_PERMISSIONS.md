# Fix PostgreSQL Database Permissions

## Problem
You're getting this error:
```
Error: ERROR: permission denied for schema public
```

This happens when the database user doesn't have the necessary permissions on the `public` schema.

## Solution

### Option 1: Run the Fix Script (Easiest)

```bash
./scripts/fix-db-permissions.sh
```

### Option 2: Manual SQL Fix

Connect to PostgreSQL as a superuser (usually `postgres` user):

```bash
# If you have psql installed
psql -U postgres -d mytgapp

# Or if using Docker
docker exec -it <postgres-container> psql -U postgres -d mytgapp
```

Then run these SQL commands:

```sql
-- Grant usage on schema public
GRANT USAGE ON SCHEMA public TO postgres;

-- Grant all privileges on schema public
GRANT ALL ON SCHEMA public TO postgres;

-- Grant all privileges on all tables in public schema
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;

-- Grant all privileges on all sequences in public schema
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Grant all privileges on all functions in public schema
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;

-- Make sure the user can create objects
ALTER USER postgres CREATEDB;
```

### Option 3: Recreate Database (If you can lose data)

If this is a development database and you can lose the data:

```bash
# Drop and recreate the database
psql -U postgres -c "DROP DATABASE IF EXISTS mytgapp;"
psql -U postgres -c "CREATE DATABASE mytgapp OWNER postgres;"

# Then run migrations
npx prisma migrate deploy
```

## Port Mismatch Issue

The error shows port `5434` but your `.env` has `5432`. Check your actual database port:

1. Check if PostgreSQL is running on a different port
2. Update your `.env` file if needed:
   ```env
   DATABASE_URL="postgresql://postgres:p933kLDsURjUL7@127.0.0.1:5434/mytgapp?schema=public"
   ```

## After Fixing Permissions

Once permissions are fixed, run:

```bash
npx prisma migrate deploy
```

Or if you want to create a fresh migration:

```bash
npx prisma migrate dev
```

## Verify Permissions

To verify the permissions were set correctly:

```sql
\dn+ public
```

This should show the schema with all privileges granted to your user.

