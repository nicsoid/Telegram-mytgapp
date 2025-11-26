# Prisma Migrations Setup

## Issue
Migrations were in `.gitignore` and not being committed to git, so they weren't available on the server.

## Fix Applied

1. **Removed migrations from `.gitignore`** - Migrations should be tracked in git as they're part of your codebase
2. **Added migrations to git** - Run the commands below to commit them

## Steps to Commit Migrations

```bash
# Add migrations to git (force add since they were previously ignored)
git add -f prisma/migrations/

# Verify they're staged
git status prisma/migrations/

# Commit them
git commit -m "Add Prisma migrations to version control"

# Push to remote
git push
```

## Port Mismatch Issue

The error shows port `5434` but your `.env` has `5432`. 

**Check your actual database port:**

1. Check Docker container port mapping:
   ```bash
   docker ps | grep vps-postgres
   ```
   Look for the port mapping (e.g., `0.0.0.0:5434->5432/tcp`)

2. If the container is exposing port 5434, update your `.env`:
   ```env
   DATABASE_URL="postgresql://postgres:p933kLDsURjUL7@127.0.0.1:5434/mytgapp?schema=public"
   ```

3. Or if you want to use port 5432, check your Docker port mapping and adjust if needed.

## After Fixing

1. **Fix database permissions** (if not done already):
   ```bash
   ./scripts/fix-db-permissions.sh
   ```

2. **Run migrations**:
   ```bash
   npx prisma migrate deploy
   ```

## Why Migrations Should Be in Git

- Migrations are part of your application code
- They define your database schema
- They need to be version controlled
- They should be deployed with your application
- They ensure database consistency across environments

## What to Ignore (Optional)

If you want to ignore migration artifacts but keep migrations:

```gitignore
# Ignore migration lock file changes (optional)
# prisma/migrations/migration_lock.toml
```

But generally, even `migration_lock.toml` should be tracked to ensure everyone uses the same database provider.

