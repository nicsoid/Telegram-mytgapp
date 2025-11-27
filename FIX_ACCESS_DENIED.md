# Fix "Context [/] is not accessible: access denied"

## Problem

You're seeing this error in OpenLiteSpeed logs:
```
Context [/] is not accessible: access denied.
```

This means the virtual host has access control rules blocking requests to the `/` context.

## Solution

### Option 1: Fix via CyberPanel (Recommended)

1. **Login to CyberPanel**
2. Go to **Websites** → **List Websites**
3. Click **Manage** on your domain (`mytgapp.com`)
4. Go to **Access Control** tab
5. Check the access control rules:
   - Look for any **IP restrictions** or **deny rules**
   - If there are deny rules for `/`, remove them
   - Ensure there's an **allow rule** for `/` or no restrictions at all

6. **Or reset access control**:
   - Remove all access control rules
   - Add a default allow rule if needed
   - Save changes

7. **Restart OpenLiteSpeed**:
   ```bash
   sudo systemctl restart lsws
   ```

### Option 2: Fix via Virtual Host Config File

1. **SSH into your server**
2. **Find your virtual host config**:
   ```bash
   sudo find /usr/local/lsws/conf -name "*mytgapp*" -o -name "*yourdomain*"
   # Or check:
   ls -la /usr/local/lsws/conf/vhosts/
   ```

3. **Edit the virtual host config**:
   ```bash
   sudo nano /usr/local/lsws/conf/vhosts/mytgapp.com/vhost.conf
   # Or wherever your vhost config is
   ```

4. **Look for access control blocks** like:
   ```apache
   accessControl {
     allow                   ALL
     deny                    ALL
   }
   ```

5. **Change to allow all** (or configure properly):
   ```apache
   accessControl {
     allow                   ALL
   }
   ```

6. **Or remove access control entirely** if not needed

7. **Restart OpenLiteSpeed**:
   ```bash
   sudo systemctl restart lsws
   ```

### Option 3: Check Context-Specific Access Control

The issue might be in the context definition itself. Check your vhost config:

```apache
context / {
  type                    proxy
  handler                 http://127.0.0.1:3002
  addDefaultCharset       off
  proxyWebSocket          1
  enableExpires           0
  # Make sure there's no accessControl block here blocking access
}
```

If there's an `accessControl` block in the context, remove it or change it to:
```apache
accessControl {
  allow                   ALL
}
```

## Verify Fix

After making changes:

1. **Restart OpenLiteSpeed**:
   ```bash
   sudo systemctl restart lsws
   ```

2. **Test access**:
   ```bash
   curl -I https://mytgapp.com
   # Should return 200 OK, not 403 or access denied
   ```

3. **Check logs**:
   ```bash
   sudo tail -f /usr/local/lsws/logs/error.log
   # Should not show "access denied" errors anymore
   ```

## Quick Fix Command

If you want to quickly remove access restrictions, you can:

```bash
# Backup first
sudo cp /usr/local/lsws/conf/vhosts/mytgapp.com/vhost.conf /usr/local/lsws/conf/vhosts/mytgapp.com/vhost.conf.backup

# Edit and remove/comment out accessControl blocks that deny access
sudo nano /usr/local/lsws/conf/vhosts/mytgapp.com/vhost.conf

# Restart
sudo systemctl restart lsws
```

## Common Causes

1. **Default CyberPanel access control** - CyberPanel sometimes adds restrictive access rules by default
2. **IP whitelisting** - If IP whitelisting is enabled, your IP might not be in the list
3. **Security plugin** - Some security plugins add access restrictions
4. **Previous configuration** - Leftover config from another setup

