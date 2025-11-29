# Cron Job Setup Guide

This guide explains how to set up the cron job for sending scheduled Telegram posts.

## Overview

The cron job calls the `/api/telegram/cron` endpoint every minute to process and send scheduled posts. The endpoint:
- Finds posts scheduled in the past (past-due) or in the next 5 minutes
- Sends them via Telegram
- Updates their status in the database

## Prerequisites

1. **CRON_SECRET** environment variable must be set in your `.env` file
2. The application must be running and accessible
3. You need shell access to your server

## Step 1: Generate CRON_SECRET

Generate a secure random string for the cron secret:

```bash
# Generate a random secret (32 characters)
openssl rand -hex 16
```

Or use any secure random string generator. Add it to your `.env` file:

```env
CRON_SECRET=your_generated_secret_here
```

**Important**: Keep this secret secure. Anyone with this secret can trigger your cron job.

## Step 2: Create Cron Script

The cron script is already created at `scripts/cron-mytgapp.sh`. Make sure it's executable:

```bash
chmod +x scripts/cron-mytgapp.sh
```

The script:
- Loads environment variables from `.env` file
- Calls the cron endpoint with proper authentication
- Logs the response

## Step 3: Test the Script Manually

Before setting up cron, test the script manually:

```bash
# From the project root
./scripts/cron-mytgapp.sh
```

You should see output like:
```
2025-01-01 12:00:00 SUCCESS: {"success":true,"message":"Processed 0 posts: 0 sent, 0 failed","results":{...}}
```

If you see an error, check:
1. `CRON_SECRET` is set in `.env`
2. `NEXT_PUBLIC_APP_URL` or `NEXTAUTH_URL` is set correctly
3. The application is running and accessible

## Step 4: Set Up Cron Job

### Option A: Using Crontab (Recommended)

1. Open crontab editor:
```bash
crontab -e
```

2. Add this line to run every minute:
```bash
* * * * * /path/to/Telegram-mytgapp/scripts/cron-mytgapp.sh >> /path/to/Telegram-mytgapp/logs/cron.log 2>&1
```

Replace `/path/to/Telegram-mytgapp` with your actual project path.

**Example** (if project is in `/home/username/Telegram-mytgapp`):
```bash
* * * * * /home/username/Telegram-mytgapp/scripts/cron-mytgapp.sh >> /home/username/Telegram-mytgapp/logs/cron.log 2>&1
```

3. Save and exit (in vim: press `Esc`, type `:wq`, press Enter)

4. Verify the cron job is added:
```bash
crontab -l
```

### Option B: Using CyberPanel (If using CyberPanel)

1. Log in to CyberPanel
2. Go to **Cron Jobs** → **Create Cron Job**
3. Set the schedule: `* * * * *` (every minute)
4. Command: `/path/to/Telegram-mytgapp/scripts/cron-mytgapp.sh`
5. Click **Create**

### Option C: Using Systemd Timer (Alternative)

If you prefer systemd over cron, create a timer:

1. Create service file `/etc/systemd/system/mytgapp-cron.service`:
```ini
[Unit]
Description=MyTgApp Cron Job
After=network.target

[Service]
Type=oneshot
User=your_username
WorkingDirectory=/path/to/Telegram-mytgapp
EnvironmentFile=/path/to/Telegram-mytgapp/.env
ExecStart=/path/to/Telegram-mytgapp/scripts/cron-mytgapp.sh
```

2. Create timer file `/etc/systemd/system/mytgapp-cron.timer`:
```ini
[Unit]
Description=Run MyTgApp Cron Every Minute
Requires=mytgapp-cron.service

[Timer]
OnCalendar=*:0/1
Persistent=true

[Install]
WantedBy=timers.target
```

3. Enable and start:
```bash
sudo systemctl enable mytgapp-cron.timer
sudo systemctl start mytgapp-cron.timer
```

## Step 5: Create Logs Directory

Create a logs directory for cron output:

```bash
mkdir -p logs
```

The cron script will log to `logs/cron.log`.

## Step 6: Verify Cron is Working

1. **Check cron logs**:
```bash
tail -f logs/cron.log
```

You should see entries every minute.

2. **Check if posts are being sent**:
- Create a test post scheduled for 1-2 minutes in the future
- Watch the logs to see if it gets processed
- Check the post status in the app

3. **Test the endpoint directly**:
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://yourdomain.com/api/telegram/cron
```

## Troubleshooting

### Cron job not running

1. **Check cron service is running**:
```bash
# On systemd systems
sudo systemctl status cron

# On older systems
sudo service cron status
```

2. **Check cron logs** (location varies by system):
```bash
# Ubuntu/Debian
grep CRON /var/log/syslog

# CentOS/RHEL
grep CRON /var/log/cron
```

3. **Verify script path is absolute** (cron requires absolute paths)

4. **Check file permissions**:
```bash
ls -l scripts/cron-mytgapp.sh
# Should show executable: -rwxr-xr-x
```

### Getting 401 Unauthorized

- Verify `CRON_SECRET` in `.env` matches what's in the script
- Check that the Authorization header is being sent correctly
- Ensure the secret doesn't have extra spaces or newlines

### Posts not being sent

1. **Check cron logs** for errors
2. **Verify posts are scheduled** in the database
3. **Check group owner has active subscription** (required for posts to be sent)
4. **Verify bot is admin** in the Telegram group
5. **Check application logs** for detailed error messages

### Cron job running but no output

- Check that the logs directory exists and is writable
- Verify the redirect in crontab: `>> logs/cron.log 2>&1`
- Check file permissions on the logs directory

## Monitoring

### View recent cron activity:
```bash
tail -n 50 logs/cron.log
```

### Count successful runs in last hour:
```bash
grep "SUCCESS" logs/cron.log | grep "$(date '+%Y-%m-%d %H')" | wc -l
```

### Monitor in real-time:
```bash
tail -f logs/cron.log
```

## Security Notes

1. **Keep CRON_SECRET secure**: Don't commit it to version control
2. **Restrict script permissions**: Only owner should be able to read/write
3. **Use HTTPS**: The cron endpoint should only be accessible via HTTPS
4. **Firewall**: Consider restricting access to the cron endpoint by IP if possible

## Advanced: Multiple Environments

If you have multiple environments (dev, staging, production), you can create separate scripts:

- `scripts/cron-mytgapp-dev.sh`
- `scripts/cron-mytgapp-staging.sh`
- `scripts/cron-mytgapp-prod.sh`

Each with different `APP_URL` and `CRON_SECRET` values.

## Schedule Options

The current setup runs every minute (`* * * * *`). You can adjust if needed:

- Every minute: `* * * * *`
- Every 5 minutes: `*/5 * * * *`
- Every hour: `0 * * * *`
- Every day at midnight: `0 0 * * *`

**Note**: Running less frequently than every minute may cause posts to be sent late. The current implementation processes posts scheduled in the next 5 minutes, so running every minute is recommended.

