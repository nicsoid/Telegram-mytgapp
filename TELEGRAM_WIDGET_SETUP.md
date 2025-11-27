# Telegram Login Widget Setup

## Critical: Domain Configuration

The Telegram Login Widget **requires** your domain to be configured with BotFather. Without this, the widget will not work correctly and you'll get hash mismatches.

### Steps to Configure Domain:

1. **Open Telegram** and message [@BotFather](https://t.me/botfather)

2. **Send the command:**
   ```
   /setdomain
   ```

3. **Select your bot** (`@igramposter_bot`)

4. **Add your domain:**
   ```
   mytgapp.com
   ```

5. **Verify the domain is set:**
   - BotFather will confirm the domain has been added
   - The widget should now work correctly

## Why This Matters

When the domain is not set with BotFather:
- Telegram may use a different signing mechanism
- The hash verification will fail
- The widget may not work at all

## Verification

After setting the domain:
1. Clear browser cache
2. Rebuild the app: `npm run build`
3. Restart PM2: `pm2 restart ecosystem.config.js --update-env`
4. Try logging in again

## Troubleshooting

If you still get hash mismatches after setting the domain:

1. **Verify domain is set:**
   - Message @BotFather: `/mybots`
   - Select your bot
   - Check "Bot Settings" → "Domain"

2. **Check bot token:**
   ```bash
   npx tsx scripts/verify-bot-token.ts
   ```

3. **Test hash calculation:**
   ```bash
   npx tsx scripts/find-matching-bot-token.ts
   ```

4. **Check server time:**
   ```bash
   curl https://mytgapp.com/api/debug/server-info
   ```

## References

- [Telegram Login Widget Documentation](https://core.telegram.org/widgets/login)
- [BotFather Commands](https://core.telegram.org/bots/api#authorizing-your-bot)

