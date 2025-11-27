#!/usr/bin/env tsx
/**
 * Check if domain is properly configured for Telegram Login Widget
 * Usage: npx tsx scripts/check-domain-setup.ts
 */

import 'dotenv/config'

async function main() {
  console.log('=== Telegram Login Widget Domain Check ===')
  console.log('')
  
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const botUsername = process.env.TELEGRAM_BOT_USERNAME || process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'NOT SET'
  
  if (!botToken) {
    console.error('❌ TELEGRAM_BOT_TOKEN is not set')
    process.exit(1)
  }
  
  if (!botUsername) {
    console.error('❌ TELEGRAM_BOT_USERNAME is not set')
    process.exit(1)
  }
  
  console.log('Bot Username:', botUsername)
  console.log('App URL:', appUrl)
  console.log('')
  
  // Extract domain from URL
  let domain = 'NOT SET'
  try {
    if (appUrl && appUrl !== 'NOT SET') {
      const url = new URL(appUrl)
      domain = url.hostname
    }
  } catch (e) {
    console.error('Failed to parse app URL:', e)
  }
  
  console.log('Domain:', domain)
  console.log('')
  
  // Get bot info
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`)
    const data = await response.json()
    
    if (data.ok) {
      console.log('✅ Bot token is valid')
      console.log('   Bot ID:', data.result.id)
      console.log('   Bot Username: @' + data.result.username)
      console.log('   Bot Name:', data.result.first_name)
      console.log('')
    } else {
      console.error('❌ Bot token is invalid:', data.description)
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ Failed to verify bot token:', error)
    process.exit(1)
  }
  
  console.log('=== CRITICAL: Domain Configuration ===')
  console.log('')
  console.log('The Telegram Login Widget REQUIRES the domain to be set with BotFather!')
  console.log('Without this, the widget will NOT work correctly and you will get hash mismatches.')
  console.log('')
  console.log('To set the domain:')
  console.log('1. Open Telegram and message @BotFather')
  console.log('2. Send: /setdomain')
  console.log('3. Select your bot: @' + botUsername)
  console.log('4. Add your domain: ' + domain)
  console.log('5. BotFather will confirm the domain has been added')
  console.log('')
  console.log('To verify the domain is set:')
  console.log('1. Message @BotFather: /mybots')
  console.log('2. Select your bot: @' + botUsername)
  console.log('3. Go to "Bot Settings" → "Domain"')
  console.log('4. It should show: ' + domain)
  console.log('')
  
  if (domain === 'NOT SET') {
    console.error('❌ Domain is not set in environment variables!')
    console.error('   Set NEXT_PUBLIC_APP_URL or NEXTAUTH_URL in your .env file')
    process.exit(1)
  }
  
  console.log('=== Next Steps ===')
  console.log('1. Verify domain is set with BotFather (see instructions above)')
  console.log('2. After setting domain, rebuild: npm run build')
  console.log('3. Restart PM2: pm2 restart ecosystem.config.js --update-env')
  console.log('4. Clear browser cache and try logging in again')
  console.log('')
  console.log('If domain is NOT set, the widget will fail hash verification!')
}

main()

