# PM2 Environment Variables Explanation

## Why `pm2 env` doesn't show STRIPE variables (but Stripe still works)

### How It Works

1. **PM2 Environment Variables**: PM2 only shows variables that are explicitly listed in `ecosystem.config.js` under the `env` section.

2. **Next.js Auto-Loads `.env`**: Next.js automatically loads environment variables from `.env` files at runtime, regardless of what PM2 shows.

3. **Result**: Your Stripe variables are loaded from `.env` by Next.js, so Stripe works correctly, but they don't appear in `pm2 env` because they're not explicitly listed in `ecosystem.config.js`.

### Current Setup

Your `ecosystem.config.js` only lists these variables:
- `NODE_ENV`
- `PORT`
- `HOSTNAME`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_USERNAME`
- `NEXTAUTH_URL`
- `AUTH_URL`
- `DATABASE_URL`

But your `.env` file has many more variables (including Stripe), which Next.js loads automatically.

### Options

#### Option 1: Keep Current Setup (Recommended)
- **Pros**: Works perfectly, no changes needed
- **Cons**: `pm2 env` won't show all variables
- **When to use**: If everything is working and you don't need to see all vars in PM2

#### Option 2: Add Variables to ecosystem.config.js
- **Pros**: Variables appear in `pm2 env`
- **Cons**: Need to maintain variables in two places (`.env` and `ecosystem.config.js`)
- **When to use**: If you want to see all variables in PM2 for debugging

### Verify Variables Are Loaded

Even if `pm2 env` doesn't show them, you can verify they're loaded:

1. **Check application logs**: Look for Stripe initialization messages
2. **Use debug endpoint**: `curl https://mytgapp.com/api/debug/stripe`
3. **Test functionality**: If Stripe payments work, variables are loaded correctly

### Best Practice

For production, it's fine to:
- Keep sensitive variables (like Stripe keys) only in `.env`
- Let Next.js load them automatically
- Only add non-sensitive variables to `ecosystem.config.js` if you need to see them in PM2

### Summary

✅ **Your setup is correct!** Stripe works because Next.js loads `.env` automatically.
✅ `pm2 env` not showing them is normal - it only shows variables explicitly listed in `ecosystem.config.js`.
✅ No action needed unless you want to see them in `pm2 env` for debugging.

