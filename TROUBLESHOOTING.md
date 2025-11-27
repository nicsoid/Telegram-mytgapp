# Troubleshooting Guide

## Connection Refused on Direct IP:Port Access

### Problem
- `curl http://127.0.0.1:3002` works locally
- `http://your-server-ip:3002` refuses connection from external

### Explanation

**This is actually correct behavior for security!** Your app should only be accessible via the reverse proxy (through your domain), not directly via IP:port. This prevents:
- Direct access bypassing security
- DDoS attacks on the Node.js app
- Exposing internal services

### If You Need Direct Access (Testing Only)

If you need direct access for testing/debugging, update `ecosystem.config.js`:

```javascript
{
  name: 'mytgapp-web',
  script: 'node_modules/next/dist/bin/next',
  args: 'start -H 0.0.0.0',  // Listen on all interfaces
  env: {
    NODE_ENV: 'production',
    PORT: 3002,
    HOSTNAME: '0.0.0.0',
  },
}
```

Then:
1. Restart PM2: `pm2 restart mytgapp-web`
2. Open firewall port (if needed): `sudo ufw allow 3002/tcp`
3. **WARNING**: Only do this for testing. Remove direct access in production!

### Recommended: Use Reverse Proxy Only

Access your app via the domain (e.g., `https://mytgapp.com`) which goes through the reverse proxy. This is the secure way.

## 403 Forbidden Error in Browser (but curl works)

### Problem
- `curl http://localhost:3002` works
- Browser shows 403 Forbidden when accessing the domain

### Common Causes

1. **Reverse Proxy Not Configured**
2. **OpenLiteSpeed Access Rules**
3. **Missing Host Header**
4. **IP Whitelisting/Blocking**

### Solutions

#### Solution 1: Configure Reverse Proxy in CyberPanel

1. **Login to CyberPanel**
2. Go to **Websites** → **List Websites** → Click **Manage** on your domain
3. Go to **Rewrite Rules** tab
4. Add this rewrite rule:

```apache
RewriteEngine On
RewriteCond %{REQUEST_URI} !^/\.well-known
RewriteRule ^(.*)$ http://127.0.0.1:3002$1 [P,L]
```

5. **OR use Reverse Proxy feature:**
   - Go to **Reverse Proxy** tab
   - Enable **Reverse Proxy**
   - **Proxy URL**: `http://127.0.0.1:3002`
   - **Proxy Preserve Host**: Yes
   - **Additional Headers**: Add if needed
   - Click **Save**

#### Solution 2: Check OpenLiteSpeed Access Rules

1. In CyberPanel, go to **Websites** → **List Websites** → **Manage**
2. Go to **Access Control** or **Security** tab
3. Check if there are any IP restrictions or access rules blocking requests
4. Make sure **Access Control** allows all or your IP range

#### Solution 3: Check Virtual Host Configuration

If you have SSH access, check the virtual host config:

```bash
# Find your domain's virtual host config
sudo find /usr/local/lsws -name "*yourdomain.com*" -type f

# Or check the main config
sudo nano /usr/local/lsws/conf/httpd_config.conf
```

Look for your domain's virtual host and ensure:
- No IP restrictions
- Proper proxy configuration
- Correct document root

#### Solution 4: Test Direct Access

Test if the app is accessible directly:

```bash
# From server
curl http://127.0.0.1:3002

# From browser (if you have direct server access)
# Try: http://your-server-ip:3002
```

#### Solution 5: Check OpenLiteSpeed Error Logs

```bash
# Check OpenLiteSpeed error logs
sudo tail -f /usr/local/lsws/logs/error.log
sudo tail -f /usr/local/lsws/logs/access.log
```

Look for 403 errors and their causes.

#### Solution 6: Verify PM2 is Running

```bash
pm2 status
pm2 logs mytgapp-web
```

Make sure the app is actually running on port 3002.

#### Solution 7: Check Firewall/Security Settings

```bash
# Check if port 3002 is accessible locally
netstat -tuln | grep 3002

# Check CyberPanel firewall settings
# In CyberPanel: Security → Firewall
```

#### Solution 8: Manual OpenLiteSpeed Configuration

If CyberPanel UI doesn't work, manually edit the config:

1. SSH into your server
2. Edit the virtual host config:
   ```bash
   sudo nano /usr/local/lsws/conf/vhosts/yourdomain.com/vhost.conf
   ```

3. Add or update the reverse proxy configuration:
   ```xml
   <context>
     <type>proxy</type>
     <handler>http://127.0.0.1:3002</handler>
     <addDefaultCharset>off</addDefaultCharset>
   </context>
   ```

4. Restart OpenLiteSpeed:
   ```bash
   sudo systemctl restart lsws
   ```

### Quick Diagnostic Commands

```bash
# Run the diagnostic script
./scripts/diagnose-server.sh mytgapp.com

# Or manually check:
# Check if app is running
pm2 status
curl http://127.0.0.1:3002

# Check OpenLiteSpeed status
sudo systemctl status lsws

# Check port binding
sudo netstat -tuln | grep 3002
sudo lsof -i :3002

# Check logs
pm2 logs mytgapp-web --lines 50
sudo tail -50 /usr/local/lsws/logs/error.log

# Check if OpenLiteSpeed is receiving requests
sudo tail -f /usr/local/lsws/logs/access.log
```

## Server Not Receiving Requests

### Problem
- Domain shows no response (not even 403)
- Server appears to not receive any requests
- Direct IP:port works but domain doesn't

### Diagnostic Steps

1. **Run the diagnostic script**:
   ```bash
   ./scripts/diagnose-server.sh mytgapp.com
   ```

2. **Check if PM2 is running**:
   ```bash
   pm2 status
   pm2 logs mytgapp-web --lines 20
   ```

3. **Check if OpenLiteSpeed is running**:
   ```bash
   sudo systemctl status lsws
   sudo systemctl restart lsws
   ```

4. **Check if port 3002 is listening**:
   ```bash
   sudo netstat -tuln | grep 3002
   # Should show: tcp 0 0 0.0.0.0:3002 or 127.0.0.1:3002
   ```

5. **Test local connection**:
   ```bash
   curl -v http://127.0.0.1:3002
   ```

6. **Check OpenLiteSpeed access log**:
   ```bash
   sudo tail -f /usr/local/lsws/logs/access.log
   # Then try accessing your domain - you should see entries
   ```

7. **Check DNS**:
   ```bash
   nslookup mytgapp.com
   dig mytgapp.com
   # Should point to your server IP
   ```

8. **Check firewall**:
   ```bash
   sudo ufw status
   # Port 80 and 443 should be open
   ```

### Common Fixes

1. **Restart OpenLiteSpeed**:
   ```bash
   sudo systemctl restart lsws
   ```

2. **Restart PM2**:
   ```bash
   pm2 restart all
   ```

3. **Check virtual host is active**:
   - In CyberPanel: Websites → List Websites
   - Ensure your domain shows as "Active"
   - Click "Manage" and verify settings

4. **Check SSL certificate**:
   - If using HTTPS, ensure SSL is properly configured
   - Try HTTP first: `http://mytgapp.com` to test

5. **Verify vhost config**:
   - In CyberPanel: Websites → Manage → Virtual Hosts
   - Check that the proxy context is correct
   - Handler should be: `http://127.0.0.1:3002`

### Common Fix: Update Reverse Proxy Port

If your app is running on port 3002 but reverse proxy is configured for 3000:

1. Update CyberPanel reverse proxy to point to `http://127.0.0.1:3002`
2. Or update PM2 ecosystem.config.js to use port 3000
3. Restart PM2: `pm2 restart all`

## "Context [/] is not accessible: access denied" Error

### Problem

OpenLiteSpeed error log shows:
```
Context [/] is not accessible: access denied.
```

### Solution

This is an **access control issue** in OpenLiteSpeed. Fix it:

1. **In CyberPanel**: Websites → Manage → **Access Control** tab
   - Remove any deny rules
   - Ensure allow rules are set correctly
   - Or remove all access control rules

2. **Or edit vhost config directly**:
   ```bash
   sudo nano /usr/local/lsws/conf/vhosts/mytgapp.com/vhost.conf
   # Remove or fix accessControl blocks
   sudo systemctl restart lsws
   ```

3. See [FIX_ACCESS_DENIED.md](./FIX_ACCESS_DENIED.md) for detailed instructions.

