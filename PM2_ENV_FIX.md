# PM2 Environment Variables Fix

## Problem
PM2 caches environment variables when it starts. If you update your `.env` file, PM2 won't automatically pick up the changes. You need to restart PM2.

## Solution

### Option 1: Restart PM2 (Recommended)

```bash
# Stop PM2 process
pm2 stop 6

# Or stop all processes
pm2 stop all

# Delete the process (this clears cached env)
pm2 delete 6

# Start again (PM2 will read .env from your project directory)
cd /path/to/your/project
pm2 start npm --name "mytgapp" -- start

# Or if you have a specific start script
pm2 start npm --name "mytgapp" -- run start

# Save PM2 configuration
pm2 save
```

### Option 2: Use PM2 Ecosystem File (Better for Production)

Create `ecosystem.config.js` in your project root:

```javascript
module.exports = {
  apps: [{
    name: 'mytgapp',
    script: 'npm',
    args: 'start',
    cwd: '/path/to/your/project',
    env: {
      NODE_ENV: 'production',
      // Add your environment variables here
      STRIPE_SECRET_KEY: 'sk_test_...',
      STRIPE_PUBLISHABLE_KEY: 'pk_test_...',
      STRIPE_WEBHOOK_SECRET: 'whsec_...',
      STRIPE_MONTHLY_PRICE_ID: 'price_...',
      STRIPE_REVENUE_SHARE_PRICE_ID: 'price_...',
      // ... other env vars
    },
    // Or load from .env file
    env_file: '.env',
  }]
}
```

Then use:
```bash
pm2 start ecosystem.config.js
pm2 save
```

### Option 3: Reload Environment Variables

```bash
# Reload the process (graceful restart)
pm2 reload 6

# Or restart (hard restart)
pm2 restart 6
```

**Note:** `reload` and `restart` might not pick up new env vars. Use `delete` and `start` to be sure.

## Verify Environment Variables

After restarting, check if PM2 has the correct values:

```bash
# Check environment variables for process 6
pm2 env 6

# Or check all processes
pm2 env

# Check specific variable
pm2 env 6 | grep STRIPE_SECRET_KEY
```

## Update .env File

Make sure your `.env` file has the correct values:

```env
STRIPE_SECRET_KEY=sk_test_51...your_complete_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_51...your_complete_key_here
STRIPE_WEBHOOK_SECRET=whsec_...your_webhook_secret_here
STRIPE_MONTHLY_PRICE_ID=price_1...your_price_id_here
STRIPE_REVENUE_SHARE_PRICE_ID=price_1...your_price_id_here
```

**Important:**
- No quotes around values
- No spaces before/after
- Complete keys from Stripe Dashboard

## Quick Fix Command

```bash
# Stop, delete, and restart
pm2 delete 6
cd /path/to/your/project
pm2 start npm --name "mytgapp" -- start
pm2 save

# Verify
pm2 env 6 | grep STRIPE
```

## After Restart

1. Check server logs: `pm2 logs 6`
2. Look for: `✅ Stripe initialized with key: sk_test_...`
3. Test the API: `curl https://mytgapp.com/api/debug/stripe`
4. Try subscribing again

