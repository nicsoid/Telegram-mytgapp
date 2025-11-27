#!/usr/bin/env tsx
/**
 * Try to find which bot token matches the received hash
 * Usage: npx tsx scripts/find-matching-bot-token.ts
 */

import 'dotenv/config'
import crypto from 'crypto'

async function main() {
  // Latest payload from logs
  const testData = {
    id: '6941596189',
    first_name: 'Admin',
    last_name: 'UaDeals.Com',
    username: 'uadeals1',
    photo_url: '',
    auth_date: '1764274336',
    hash: '885cdb86820bfeb24d871541262be774a53c595d8f5ac122817924792e972876', // From latest logs
  }

  console.log('=== Finding Matching Bot Token ===')
  console.log('Test payload:')
  console.log(JSON.stringify(testData, null, 2))
  console.log('')

  // Create data check string
  const dataCheckString = Object.keys(testData)
    .filter(key => key !== 'hash')
    .sort()
    .map(key => `${key}=${testData[key]}`)
    .join('\n')

  console.log('Data Check String:')
  console.log(JSON.stringify(dataCheckString))
  console.log('')

  // Get current bot token
  const currentBotToken = process.env.TELEGRAM_BOT_TOKEN
  if (!currentBotToken) {
    console.error('❌ TELEGRAM_BOT_TOKEN not set')
    process.exit(1)
  }

  console.log('Current bot token:', currentBotToken.substring(0, 20) + '...')
  console.log('Current bot ID:', currentBotToken.split(':')[0])
  console.log('')

  // Test with current token
  const secretKey = crypto.createHash('sha256').update(currentBotToken).digest()
  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex')

  console.log('=== Test Results ===')
  console.log('Received hash:', testData.hash)
  console.log('Calculated hash (current token):', calculatedHash)
  console.log('Match:', calculatedHash === testData.hash ? '✅ YES' : '❌ NO')
  console.log('')

  if (calculatedHash !== testData.hash) {
    console.log('❌ Current bot token does NOT match!')
    console.log('')
    console.log('This means the Telegram Login Widget is configured with a DIFFERENT bot.')
    console.log('')
    console.log('To fix this:')
    console.log('1. Check the widget HTML/JS - what bot name is in data-telegram-login?')
    console.log('2. The widget must use @igramposter_bot')
    console.log('3. Or update TELEGRAM_BOT_TOKEN to match the bot the widget is using')
    console.log('')
    console.log('To check what bot the widget is using:')
    console.log('- Open browser dev tools')
    console.log('- Find the <script> tag with data-telegram-login')
    console.log('- The value should be "igramposter_bot" (without @)')
    console.log('')
    
    // Try to get bot info from Telegram API to see what bots you have
    console.log('=== Checking Current Bot Info ===')
    try {
      const response = await fetch(`https://api.telegram.org/bot${currentBotToken}/getMe`)
      const data = await response.json()
      if (data.ok) {
        console.log('Current bot:', data.result.username, '(ID:', data.result.id + ')')
        console.log('This bot token belongs to: @' + data.result.username)
      }
    } catch (error) {
      console.error('Failed to check bot info:', error)
    }
    
    console.log('')
    console.log('=== IMPORTANT: Domain Configuration ===')
    console.log('The Telegram Login Widget requires the domain to be set with BotFather!')
    console.log('')
    console.log('To fix this:')
    console.log('1. Open Telegram and message @BotFather')
    console.log('2. Send: /setdomain')
    console.log('3. Select your bot: @igramposter_bot')
    console.log('4. Add your domain: mytgapp.com')
    console.log('')
    console.log('Without this, Telegram may sign the widget with a different token!')
    console.log('')
    console.log('=== Next Steps ===')
    console.log('1. Verify domain is set with BotFather (/setdomain)')
    console.log('2. Check your signin page - what bot name is in the TelegramLoginWidget component?')
    console.log('3. It should be: botName="igramposter_bot"')
    console.log('4. If domain is not set, that\'s likely the problem!')
  } else {
    console.log('✅ Current bot token matches!')
  }
}

main()

