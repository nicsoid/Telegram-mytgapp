# Mini App Auto-Authentication Debug Guide

## Current Issue
Mini App redirects to browser login instead of auto-authenticating.

## How to Debug

### 1. Check Browser Console
When opening Mini App, check the browser console for:
- `[HomePage] Telegram WebApp script loaded`
- `[HomePage] Telegram WebApp detected`
- `[TelegramLayout] Auto-authenticating with Telegram WebApp initData`
- `[TelegramLayout] Auto-sign in successful`

### 2. Check if Telegram WebApp is Available
In browser console, run:
```javascript
window.Telegram?.WebApp
```

Should return the WebApp object. If `undefined`, the script didn't load.

### 3. Check initData
In browser console, run:
```javascript
window.Telegram?.WebApp?.initData || window.Telegram?.WebApp?.initDataUnsafe
```

Should return a string with user data. If empty, Telegram isn't providing initData.

### 4. Common Issues

**Issue: Script not loading**
- Check network tab for `telegram-web-app.js`
- Check if domain is allowed in Telegram Bot settings
- Check if HTTPS is enabled (required for Mini Apps)

**Issue: initData is empty**
- Make sure Mini App is opened from Telegram (not browser)
- Check bot token is correct
- Verify domain is configured in BotFather

**Issue: Auto-auth fails**
- Check server logs for authentication errors
- Verify `TELEGRAM_BOT_TOKEN` is set correctly
- Check if user exists in database

## Testing Steps

1. Open bot in Telegram
2. Click Mini App button
3. Check browser console immediately
4. Look for auto-auth messages
5. If redirecting, check what's triggering the redirect

## Expected Flow

1. User opens Mini App → Telegram loads your website
2. Script loads → `telegram-web-app.js` loads
3. WebApp detected → `Telegram.WebApp` is available
4. initData available → Contains user authentication data
5. Auto-auth triggered → `signIn("credentials", { initData })`
6. Session created → User is logged in
7. Mini App shown → User sees the app interface

## If Still Not Working

1. Check server logs for errors
2. Verify bot token in `.env`
3. Check domain configuration in BotFather
4. Ensure HTTPS is enabled
5. Try opening in Telegram's built-in browser (not external browser)

