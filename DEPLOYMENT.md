# Deployment Guide - CyberPanel VPS

This guide will help you deploy MyTgApp on a VPS server running CyberPanel.

## Prerequisites

- VPS with CyberPanel installed
- Root or sudo access
- Domain name pointed to your VPS IP
- PostgreSQL database (can be installed on the same server or remote)

## Step 1: Server Setup

### 1.1 Install Node.js (if not already installed)

```bash
# Check if Node.js is installed
node --version

# If not installed, install Node.js 18+ using NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### 1.2 Install PostgreSQL (if not already installed)

```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib -y

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql

# In PostgreSQL prompt:
CREATE DATABASE mytgapp;
CREATE USER mytgapp_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE mytgapp TO mytgapp_user;
\q
```

### 1.3 Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

## Step 2: Application Setup

### 2.1 Upload Your Application

**Option A: Using Git (Recommended)**

```bash
# Navigate to your website directory (usually /home/username/public_html or /home/username/domains/yourdomain.com/public_html)
cd /home/your_username/domains/yourdomain.com/public_html

# Clone your repository
git clone https://github.com/yourusername/Telegram-mytgapp.git .

# Or if you have SSH access, you can use rsync from your local machine:
# rsync -avz --exclude 'node_modules' --exclude '.next' /path/to/local/project/ user@your-server:/home/username/domains/yourdomain.com/public_html/
```

**Option B: Using File Manager**

1. Use CyberPanel's File Manager or SFTP to upload your project files
2. Upload to: `/home/your_username/domains/yourdomain.com/public_html/`

### 2.2 Install Dependencies

```bash
cd /home/your_username/domains/yourdomain.com/public_html
# Install all dependencies (including build-time deps like Tailwind)
npm install
# Note: We moved Tailwind CSS packages to dependencies for production builds
```

### 2.3 Set Up Environment Variables

Create a `.env` file in the project root:

```bash
nano .env
```

Add your production environment variables:

```env
# Database (use your PostgreSQL credentials)
DATABASE_URL="postgresql://mytgapp_user:your_secure_password@localhost:5432/mytgapp?schema=public"

# NextAuth
NEXTAUTH_SECRET="generate_a_secure_random_string_here"
NEXTAUTH_URL="https://yourdomain.com"
AUTH_URL="https://yourdomain.com"  # Required for NextAuth v5
AUTH_TRUST_HOST="true"  # Alternative: set this instead of trustHost in code

# Telegram
TELEGRAM_BOT_TOKEN="your-production-bot-token"
TELEGRAM_BOT_USERNAME="your-bot-username"

# Stripe (Production keys)
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# App Configuration
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
CREDIT_PRICE_EUR=2.0
CREDIT_STRIPE_PRICE_ID="price_..."

# Subscription Configuration
SUBSCRIPTION_PRICE_EUR=9.99
SUBSCRIPTION_STRIPE_PRICE_ID="price_..."

# Platform Commission
PLATFORM_COMMISSION_PERCENT=20

# Cron Secret (for securing cron endpoint)
CRON_SECRET="generate_a_secure_random_string_here"
```

**Generate secure secrets:**

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate CRON_SECRET
openssl rand -base64 32
```

### 2.4 Set Up Database

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npx prisma migrate deploy
```

## Step 3: Build the Application

```bash
# Build Next.js application
npm run build
```

## Step 4: Configure CyberPanel/OpenLiteSpeed

### 4.1 Create a Node.js Application in CyberPanel

1. Log in to CyberPanel
2. Go to **Websites** → **Create Website**
3. Create your website with your domain
4. After creation, go to **Websites** → **List Websites**
5. Find your website and click **Manage**
6. Go to **Node.js** tab
7. Enable Node.js and configure:
   - **Node.js Version**: Select Node.js 18 or 20
   - **Application Root**: `/home/your_username/domains/yourdomain.com/public_html`
   - **Application Startup File**: `server.js` (we'll create this)
   - **Application Port**: `3000` (or any available port)

### 4.2 Create Node.js Entry Point

Create a `server.js` file in your project root:

```bash
nano server.js
```

Add this content:

```javascript
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
```

### 4.3 Alternative: Use PM2 (Recommended for Production)

Instead of using CyberPanel's Node.js feature, you can use PM2 for better process management:

```bash
# Create PM2 ecosystem file
nano ecosystem.config.js
```

Add this content:

```javascript
module.exports = {
  apps: [
    {
      name: 'mytgapp',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: '/home/your_username/domains/yourdomain.com/public_html',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/home/your_username/logs/mytgapp-error.log',
      out_file: '/home/your_username/logs/mytgapp-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
    {
      name: 'telegram-bot',
      script: 'tsx',
      args: 'scripts/telegram-bot.ts',
      cwd: '/home/your_username/domains/yourdomain.com/public_html',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/home/your_username/logs/telegram-bot-error.log',
      out_file: '/home/your_username/logs/telegram-bot-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
```

**Start applications with PM2:**

```bash
# Start both applications
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Set PM2 to start on boot
pm2 startup
# Follow the instructions it provides
```

## Step 5: Configure Reverse Proxy in CyberPanel

### 5.1 Set Up Reverse Proxy

**IMPORTANT**: Your app runs on port 3002 (as configured in ecosystem.config.js). Make sure to use the correct port!

1. In CyberPanel, go to **Websites** → **List Websites** → **Manage**
2. Go to **Reverse Proxy** tab (recommended) or **Rewrite Rules**

**Option A: Using Reverse Proxy Feature (Recommended)**

1. Enable **Reverse Proxy**
2. **Proxy URL**: `http://127.0.0.1:3002` (or `http://localhost:3002`)
3. **Proxy Preserve Host**: Yes
4. **Additional Headers**: (optional, usually not needed)
5. Click **Save**
6. Restart OpenLiteSpeed if needed

**Option B: Using Rewrite Rules**

Go to **Rewrite Rules** tab and add:

```
RewriteEngine On
RewriteCond %{REQUEST_URI} !^/\.well-known
RewriteRule ^(.*)$ http://127.0.0.1:3002$1 [P,L]
```

**Note**: Replace `3002` with your actual port if different.

### 5.1.1 Troubleshooting 403 Errors

If you get 403 Forbidden in browser but curl works:

1. **Check Access Control**: Go to **Access Control** tab and ensure no IP restrictions
2. **Verify Port**: Make sure reverse proxy points to the correct port (3002)
3. **Check PM2 Status**: `pm2 status` - ensure app is running
4. **Check Logs**: `pm2 logs mytgapp-web` and OpenLiteSpeed error logs
5. **Test Direct Access**: `curl http://127.0.0.1:3002` should work
6. See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for more details

### 5.2 Configure SSL/HTTPS

1. In CyberPanel, go to **SSL** → **Issue SSL**
2. Select your domain
3. Choose **Let's Encrypt** (free SSL)
4. Issue SSL certificate
5. Enable **Force HTTPS**

## Step 6: Set Up Cron Job

### 6.1 Create Cron Script

Create a script to call your cron endpoint:

```bash
nano /home/your_username/cron-mytgapp.sh
```

Add this content (replace with your actual domain and CRON_SECRET):

```bash
#!/bin/bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://yourdomain.com/api/telegram/cron
```

Make it executable:

```bash
chmod +x /home/your_username/cron-mytgapp.sh
```

### 6.2 Add to Crontab

```bash
crontab -e
```

Add this line to run every minute:

```
* * * * * /home/your_username/cron-mytgapp.sh >> /home/your_username/logs/cron.log 2>&1
```

Or use CyberPanel's **Cron Jobs** feature:
1. Go to **Cron Jobs** → **Create Cron Job**
2. Set schedule: `* * * * *` (every minute)
3. Command: `/home/your_username/cron-mytgapp.sh`

## Step 7: Firewall Configuration

Ensure your server allows necessary ports:

```bash
# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# If using custom port for Node.js, allow it (though it should only be accessible via reverse proxy)
sudo ufw allow 3000/tcp
```

## Step 8: Verify Deployment

### 8.1 Check Application Status

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs mytgapp
pm2 logs telegram-bot

# Check if Node.js is running
ps aux | grep node
```

### 8.2 Test Your Application

1. Visit `https://yourdomain.com` in your browser
2. Check if the application loads correctly
3. Test API endpoints
4. Verify database connection

## Step 9: Maintenance Commands

### Update Application

```bash
cd /home/your_username/domains/yourdomain.com/public_html

# Pull latest changes (if using Git)
git pull

# Install new dependencies
npm install --production

# Run migrations if needed
npx prisma migrate deploy

# Rebuild application
npm run build

# Restart PM2
pm2 restart all
```

### View Logs

```bash
# PM2 logs
pm2 logs

# Application logs
tail -f /home/your_username/logs/mytgapp-out.log
tail -f /home/your_username/logs/mytgapp-error.log

# Telegram bot logs
tail -f /home/your_username/logs/telegram-bot-out.log
tail -f /home/your_username/logs/telegram-bot-error.log
```

### Restart Services

```bash
# Restart PM2 applications
pm2 restart all

# Restart specific app
pm2 restart mytgapp
pm2 restart telegram-bot

# Restart PostgreSQL
sudo systemctl restart postgresql
```

## Troubleshooting

### Application Not Starting

1. Check PM2 logs: `pm2 logs mytgapp`
2. Verify environment variables are set correctly
3. Check database connection
4. Verify Node.js version: `node --version`

### Database Connection Issues

1. Verify PostgreSQL is running: `sudo systemctl status postgresql`
2. Check database credentials in `.env`
3. Test connection: `psql -U mytgapp_user -d mytgapp -h localhost`

### Port Already in Use

```bash
# Find process using port 3000
sudo lsof -i :3000

# Kill the process if needed
kill -9 <PID>
```

### SSL Certificate Issues

1. Check certificate in CyberPanel SSL section
2. Verify domain DNS is pointing correctly
3. Wait a few minutes after issuing certificate

## Security Recommendations

1. **Keep dependencies updated**: `npm audit` and `npm update`
2. **Use strong passwords**: For database, secrets, etc.
3. **Enable firewall**: Only allow necessary ports
4. **Regular backups**: Database and application files
5. **Monitor logs**: Regularly check for errors or suspicious activity
6. **Keep Node.js updated**: Use latest LTS version
7. **Use environment variables**: Never commit `.env` to Git

## Backup Strategy

### Database Backup

```bash
# Create backup script
nano /home/your_username/backup-db.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/your_username/backups"
mkdir -p $BACKUP_DIR
pg_dump -U mytgapp_user mytgapp > $BACKUP_DIR/mytgapp_$DATE.sql
# Keep only last 7 days
find $BACKUP_DIR -name "mytgapp_*.sql" -mtime +7 -delete
```

Make executable and add to crontab (daily at 2 AM):

```bash
chmod +x /home/your_username/backup-db.sh
# Add to crontab: 0 2 * * * /home/your_username/backup-db.sh
```

## Performance Optimization

1. **Enable Next.js caching**: Already configured in production mode
2. **Use CDN**: For static assets (optional)
3. **Database indexing**: Prisma handles this, but monitor slow queries
4. **PM2 clustering**: For high traffic, increase instances in `ecosystem.config.js`
5. **Monitor resources**: Use `htop` or `pm2 monit`

## Support

For issues specific to:
- **CyberPanel**: Check [CyberPanel Documentation](https://cyberpanel.net/docs/)
- **Next.js**: Check [Next.js Documentation](https://nextjs.org/docs)
- **Prisma**: Check [Prisma Documentation](https://www.prisma.io/docs)

