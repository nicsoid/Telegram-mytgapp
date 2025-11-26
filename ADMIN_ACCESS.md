# How to Access Admin Page

## Overview

The admin page is accessible at `/admin` but requires:
1. A user account with `role = "ADMIN"` in the database
2. Signing in via Telegram authentication

## Creating an Admin User

### Method 1: Using the Script (Recommended)

Use the provided script to create an admin user:

```bash
npm run create-admin <telegramId> <telegramUsername> [email] [name]
```

**Example:**
```bash
npm run create-admin 123456789 admin admin@example.com "Admin User"
```

**Parameters:**
- `telegramId`: Your Telegram user ID (you can get this from @userinfobot on Telegram)
- `telegramUsername`: Your Telegram username (without @)
- `email`: (Optional) Your email address
- `name`: (Optional) Your display name

### Method 2: Using Prisma Studio

1. Open Prisma Studio:
   ```bash
   npm run db:studio
   ```

2. Navigate to the `User` model
3. Create a new user with:
   - `telegramId`: Your Telegram user ID
   - `telegramUsername`: Your Telegram username
   - `role`: `ADMIN`
   - `telegramVerifiedAt`: Current date/time

### Method 3: Using SQL

Connect to your PostgreSQL database and run:

```sql
INSERT INTO "User" (
  id,
  "telegramId",
  "telegramUsername",
  email,
  name,
  role,
  "telegramVerifiedAt",
  "createdAt",
  "updatedAt"
)
VALUES (
  gen_random_uuid(),
  'YOUR_TELEGRAM_ID',
  'your_username',
  'your@email.com',
  'Admin User',
  'ADMIN',
  NOW(),
  NOW(),
  NOW()
);
```

## Getting Your Telegram ID

1. Open Telegram
2. Search for `@userinfobot`
3. Start a chat with the bot
4. Send `/start`
5. The bot will reply with your Telegram ID

## Signing In as Admin

1. Make sure you have created an admin user with your Telegram ID
2. Go to `http://localhost:3000/auth/signin`
3. **Important**: You need to sign in via Telegram Web App
   - The sign-in page requires Telegram Web App context
   - You can test this by:
     - Opening your bot in Telegram
     - Using a Telegram Mini App link
     - Or temporarily modifying the sign-in page for development

## Development Workaround

If you need to test admin features without Telegram authentication, you can temporarily:

1. Create a test admin user in the database
2. Modify `auth.ts` to add a development credentials provider
3. Or use Prisma Studio to manually set your user role to `ADMIN`

## Admin Routes

Once signed in as admin, you can access:
- `/admin` - Main admin dashboard
- `/admin/publishers` - Publishers management page

## Troubleshooting

### "Access Denied" or Redirect to Home

- Check that your user has `role = "ADMIN"` in the database
- Verify you're signed in with the correct Telegram account
- Check the session in browser DevTools to see your role

### Can't Sign In

- Make sure `TELEGRAM_BOT_TOKEN` is set in `.env`
- Verify the Telegram bot token is correct
- Check that the sign-in page can access Telegram Web App context

### User Not Found

- Verify the Telegram ID matches exactly
- Check for typos in the username
- Ensure the user was created successfully in the database

