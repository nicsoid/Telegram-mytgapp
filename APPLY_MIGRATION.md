# Apply Database Migration

## Migration: Restructure Business Model

This migration adds:
- Free posts tracking for publishers (3 free posts on signup)
- Price per credit field for publishers
- Subscription tier configuration table
- Updates credit transaction types (removes ADMIN_GRANT, adds PUBLISHER_GRANT and FREE_POST)
- Makes publisherId required in credit requests

## Apply Migration

### Development
```bash
npx prisma migrate dev
```

### Production
```bash
npx prisma migrate deploy
```

## Important Notes

1. **Existing ADMIN_GRANT transactions**: The migration automatically converts existing `ADMIN_GRANT` transactions to `PUBLISHER_GRANT`. If you have existing credit requests without a publisherId, they will be deleted (since admins no longer grant credits).

2. **Free Posts**: All existing publishers will get `freePostsUsed = 0` and `freePostsLimit = 3` by default.

3. **Credit Requests**: Any existing credit requests without a publisherId will be deleted. Make sure to process or migrate them before applying this migration.

## Rollback

If you need to rollback, you'll need to manually:
1. Revert the enum changes
2. Make publisherId optional again
3. Restore ADMIN_GRANT transactions if needed

