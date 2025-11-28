# Telegram Mini App Setup Guide

## Mini App URL

The Mini App should be accessible at your **root domain**:
```
https://yourdomain.com
```

When configured in Telegram Bot settings, this is the URL you'll use.

## How It Works

1. **User opens Mini App from Telegram** → Telegram loads your website
2. **Telegram injects `Telegram.WebApp`** → Provides `initData` with user info
3. **Auto-authentication happens** → `app/(telegram)/layout.tsx` detects Telegram WebApp and signs user in automatically
4. **User sees the Mini App** → No login page, seamless experience

## File Structure

- **`app/(telegram)/layout.tsx`** - Handles auto-authentication for Mini App
- **`app/(telegram)/page.tsx`** - Main Mini App page (shown at `/`)
- **`app/(web)/auth/signin/page.tsx`** - Web sign-in page (for non-Mini App users)

## Configuration in Telegram

1. Go to [@BotFather](https://t.me/botfather)
2. Use `/newapp` or `/editapp` command
3. Select your bot
4. Set the Mini App URL to: `https://yourdomain.com`
5. Save

## Testing

### From Telegram (Mini App)
- Open your bot in Telegram
- Click the "Menu" button or use `/start` command
- Click the Mini App button
- Should auto-authenticate without showing login page

### From Browser (Web)
- Visit `https://yourdomain.com` in a regular browser
- Will show the landing page or redirect to sign-in (normal web flow)

## Troubleshooting

### Issue: Still seeing login page in Mini App

**Check:**
1. Is `Telegram.WebApp` available? Check browser console: `window.Telegram?.WebApp`
2. Is `initData` present? Check: `window.Telegram?.WebApp?.initData`
3. Check server logs for authentication errors
4. Verify `TELEGRAM_BOT_TOKEN` is set correctly

### Issue: Auto-auth not working

**Possible causes:**
1. Bot token not configured
2. `initData` verification failing
3. User doesn't exist in database yet (first-time user needs to be created)

**Solution:**
- Check browser console for errors
- Check server logs for authentication errors
- Verify bot token is correct in `.env`

## Environment Variables

Make sure these are set:
```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXTAUTH_URL=https://yourdomain.com
```

## Routes

- **`/`** - Mini App main page (when accessed from Telegram)
- **`/auth/signin`** - Web sign-in page (for regular browsers)
- **`/app/*`** - Protected app routes
- **`/dashboard/*`** - Dashboard routes (subscription required)

