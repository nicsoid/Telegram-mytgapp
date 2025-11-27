# OpenLiteSpeed Virtual Host Configuration

## Recommended Configuration

For your OpenLiteSpeed virtual host, use this configuration:

```apache
# Static files context (uploads, etc.)
context /uploads/ {
  type                    static
  location                ${VH_ROOT}/public/uploads/
  allowBrowse             1
  addDefaultCharset       off
}

# Main application - proxy to Node.js
context / {
  type                    proxy
  handler                 http://127.0.0.1:3002
  addDefaultCharset       off
  proxyWebSocket          1
  enableExpires           0
  addHeaders              <<<END_addHeaders
    Header always set X-Forwarded-Proto "https"
    Header always set X-Forwarded-For "%{REMOTE_ADDR}e"
    Header always set X-Real-IP "%{REMOTE_ADDR}e"
  END_addHeaders
}
```

## Key Points

1. **Handler URL**: Use `http://127.0.0.1:3002` (not just `127.0.0.1:3002`)
2. **Proxy WebSocket**: Enable for Next.js hot reload and real-time features
3. **Headers**: Add forwarding headers so Next.js knows the original request details

## Testing the Configuration

1. **Test direct access** (should work):
   ```bash
   curl http://127.0.0.1:3002
   curl http://77.83.101.133:3002
   ```

2. **Test via domain** (should work):
   ```bash
   curl https://mytgapp.com
   curl -H "Host: mytgapp.com" http://127.0.0.1:3002
   ```

3. **Check OpenLiteSpeed logs**:
   ```bash
   sudo tail -f /usr/local/lsws/logs/error.log
   sudo tail -f /usr/local/lsws/logs/access.log
   ```

## Common Issues

### Issue 1: 403 Forbidden via Domain

**Symptoms**: Direct IP:port works, but domain shows 403

**Causes**:
- Missing `http://` prefix in handler
- Access control blocking requests
- Missing forwarding headers

**Fix**:
1. Ensure handler is `http://127.0.0.1:3002` (with http://)
2. Check Access Control tab in CyberPanel - ensure no IP restrictions
3. Add forwarding headers as shown above

### Issue 2: Static Files Not Serving

**Symptoms**: `/uploads/` files return 404

**Fix**:
1. Ensure `${VH_ROOT}/public/uploads/` directory exists
2. Set correct permissions: `chmod 755` on directory, `chmod 644` on files
3. Check if `allowBrowse` is set to `1` for directory listing (or `0` to disable)

### Issue 3: WebSocket Not Working

**Symptoms**: Real-time features don't work

**Fix**:
- Ensure `proxyWebSocket 1` is set
- Check firewall allows WebSocket connections
- Verify Next.js is configured for WebSocket support

## Restart OpenLiteSpeed

After making changes:

```bash
sudo systemctl restart lsws
# Or via CyberPanel: Websites → List Websites → Manage → Restart
```

## Verify Configuration

1. **Check if proxy is working**:
   ```bash
   curl -I https://mytgapp.com
   # Should return 200 OK, not 403
   ```

2. **Check response headers**:
   ```bash
   curl -I https://mytgapp.com | grep -i "x-forwarded"
   # Should show X-Forwarded-* headers
   ```

3. **Check PM2 status**:
   ```bash
   pm2 status
   pm2 logs mytgapp-web --lines 20
   ```

## Security Note

For production, you should:
1. Keep the app listening on `127.0.0.1:3002` (localhost only)
2. Only allow access via the reverse proxy (domain)
3. Block direct IP:port access in firewall:
   ```bash
   sudo ufw deny 3002/tcp
   # But allow from localhost
   sudo ufw allow from 127.0.0.1 to any port 3002
   ```

