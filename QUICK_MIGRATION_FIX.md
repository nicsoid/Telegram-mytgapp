# Quick Migration Fix for Docker PostgreSQL

## Your Setup
- Container: `vps-postgres`
- User: `postgres`
- Database: `mytgapp` (or check your `.env` file)

## Quick Fix - Two Steps

### Step 1: Fix Enum Issue (if migration failed)
```bash
./scripts/fix-migration-docker.sh
```

If your database has a different name:
```bash
./scripts/fix-migration-docker.sh your_database_name
```

### Step 2: Apply Full Migration (Adds subscription columns)
```bash
./scripts/apply-migration-docker.sh
```

Or if your database has a different name:
```bash
./scripts/apply-migration-docker.sh your_database_name
```

### Step 3: Regenerate and Restart
```bash
# Regenerate Prisma client
npx prisma generate

# Restart your application
# (docker-compose restart mytgapp or npm run dev)

# Verify migration status
npx prisma migrate status
```

## What the Script Does

1. ✅ Connects to `vps-postgres` Docker container
2. ✅ Drops the default constraint on `User.role`
3. ✅ Creates new enum `UserRole_new` with only `USER` and `ADMIN`
4. ✅ Converts all `PUBLISHER` roles to `USER`
5. ✅ Sets new default to `USER`
6. ✅ Drops old enum and renames new one
7. ✅ Marks the failed migration as applied

## Troubleshooting

**Container not running?**
```bash
docker start vps-postgres
```

**Wrong database name?**
Check your `.env` file for `DATABASE_URL` and extract the database name, or list databases:
```bash
docker exec -it vps-postgres psql -U postgres -c "\l"
```

**Still having issues?**
Run the SQL manually:
```bash
docker exec -it vps-postgres psql -U postgres -d mytgapp -f /path/to/scripts/fix-enum-migration.sql
```

