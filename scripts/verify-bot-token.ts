#!/usr/bin/env tsx
/**
 * Verify that the bot token in .env matches the expected bot
 * Usage: npx tsx scripts/verify-bot-token.ts
 */

import 'dotenv/config'

const botToken = process.env.TELEGRAM_BOT_TOKEN
const expectedBotUsername = process.env.TELEGRAM_BOT_USERNAME || process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME

if (!botToken) {
  console.error('❌ TELEGRAM_BOT_TOKEN is not set in .env')
  process.exit(1)
}

if (!expectedBotUsername) {
  console.warn('⚠️  TELEGRAM_BOT_USERNAME or NEXT_PUBLIC_TELEGRAM_BOT_USERNAME is not set')
}

const botId = botToken.split(':')[0]
console.log('=== Bot Token Verification ===')
console.log(`Bot ID: ${botId}`)
console.log(`Token preview: ${botToken.substring(0, 20)}...`)
console.log(`Expected username: ${expectedBotUsername || 'NOT SET'}`)
console.log('')

// Call Telegram API to verify
try {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`)
  const data = await response.json()
  
  if (!data.ok) {
    console.error('❌ Bot token is invalid:', data.description)
    process.exit(1)
  }
  
  const bot = data.result
  console.log('✅ Bot token is valid')
  console.log(`   Bot ID: ${bot.id}`)
  console.log(`   Username: @${bot.username}`)
  console.log(`   Name: ${bot.first_name}`)
  console.log('')
  
  if (expectedBotUsername) {
    const expected = expectedBotUsername.replace('@', '').toLowerCase()
    const actual = bot.username.toLowerCase()
    
    if (expected === actual) {
      console.log(`✅ Bot username matches: @${bot.username}`)
    } else {
      console.error(`❌ Bot username mismatch!`)
      console.error(`   Expected: @${expectedBotUsername}`)
      console.error(`   Actual: @${bot.username}`)
      console.error('')
      console.error('This is the problem! The bot token belongs to a different bot than expected.')
      console.error('Make sure TELEGRAM_BOT_TOKEN in .env matches the bot configured in the Telegram Login Widget.')
      process.exit(1)
    }
  } else {
    console.warn('⚠️  Cannot verify username match - TELEGRAM_BOT_USERNAME not set')
  }
  
  console.log('')
  console.log('✅ All checks passed!')
} catch (error) {
  console.error('❌ Failed to verify bot token:', error)
  process.exit(1)
}

