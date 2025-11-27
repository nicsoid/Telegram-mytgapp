#!/bin/bash
# Server Diagnostics Script
# Run this on your VPS to diagnose connection issues

echo "=== Server Diagnostics ==="
echo ""

echo "1. Checking PM2 Status..."
pm2 status
echo ""

echo "2. Checking if port 3002 is listening..."
sudo netstat -tuln | grep 3002 || echo "Port 3002 not found in listening ports"
echo ""

echo "3. Checking if process is running..."
ps aux | grep -E "next|node.*3002" | grep -v grep || echo "No Next.js process found"
echo ""

echo "4. Testing local connection..."
curl -I http://127.0.0.1:3002 2>&1 | head -5 || echo "Failed to connect locally"
echo ""

echo "5. Checking PM2 logs (last 20 lines)..."
pm2 logs mytgapp-web --lines 20 --nostream 2>&1 | tail -20
echo ""

echo "6. Checking OpenLiteSpeed status..."
sudo systemctl status lsws --no-pager -l | head -20
echo ""

echo "7. Checking firewall rules for port 3002..."
sudo ufw status | grep 3002 || echo "No firewall rule found for port 3002"
echo ""

echo "8. Checking if OpenLiteSpeed is listening on port 80/443..."
sudo netstat -tuln | grep -E ":80|:443" | head -5
echo ""

echo "9. Testing domain access (if domain is set)..."
if [ -n "$1" ]; then
    echo "Testing: $1"
    curl -I "https://$1" 2>&1 | head -10
else
    echo "Usage: $0 <domain> (e.g., $0 mytgapp.com)"
fi
echo ""

echo "10. Checking OpenLiteSpeed error log (last 10 lines)..."
sudo tail -10 /usr/local/lsws/logs/error.log 2>/dev/null || echo "Cannot read error log"
echo ""

echo "=== Diagnostics Complete ==="

