# Fix PostgreSQL Database Permissions (Docker)

## Problem
You're getting this error:
```
Error: ERROR: permission denied for schema public
```

This happens when the database user doesn't have the necessary permissions on the `public` schema.

## Quick Fix (Recommended)

Run the automated script:

```bash
./scripts/fix-db-permissions.sh
```

## Manual Fix (Docker)

If the script doesn't work, run these commands manually:

### Step 1: Connect to PostgreSQL in Docker

```bash
docker exec -it vps-postgres psql -U postgres -d mytgapp
```

### Step 2: Run SQL Commands

Once connected, run these SQL commands:

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

-- Verify permissions
\dn+ public

-- Exit
\q
```

### One-Line Command (Alternative)

You can also run all commands in one line:

```bash
docker exec -i vps-postgres psql -U postgres -d mytgapp <<EOF
GRANT USAGE ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER USER postgres CREATEDB;
EOF
```

## Verify Container is Running

Check if the container is running:

```bash
docker ps | grep vps-postgres
```

If it's not running, start it:

```bash
docker start vps-postgres
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

## Troubleshooting

### Container Not Found

If you get "container not found", check the actual container name:

```bash
docker ps -a | grep postgres
```

Then update the script or use the correct container name.

### Database Doesn't Exist

If the database doesn't exist, create it:

```bash
docker exec -it vps-postgres psql -U postgres -c "CREATE DATABASE mytgapp;"
```

### Different Database User

If you're using a different database user (not `postgres`), update the script or replace `postgres` with your username in the SQL commands.

## Check Current Permissions

To check current permissions:

```bash
docker exec -it vps-postgres psql -U postgres -d mytgapp -c "\dn+ public"
```
