#!/usr/bin/env tsx
/**
 * Test hash calculation with hardcoded values
 * Usage: npx tsx scripts/test-hash-calculation.ts
 */

import 'dotenv/config'
import crypto from 'crypto'

async function main() {
  // Hardcoded test values (from your widget sample)
  const testData = {
    id: '6941596189',
    first_name: 'Admin',
    last_name: 'UaDeals.Com',
    username: 'uadeals1',
    photo_url: '',
    auth_date: '1764273082',
    hash: 'ad2d089055ce9d981ef18939e0eefd9619963fbd0fd08f60bc5607c17e301a97', // The hash you received
  }

  // Get bot token from env
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) {
    console.error('❌ TELEGRAM_BOT_TOKEN is not set')
    process.exit(1)
  }

  console.log('=== Hash Calculation Test ===')
  console.log('Bot Token Preview:', botToken.substring(0, 20) + '...')
  console.log('Bot ID:', botToken.split(':')[0])
  console.log('')
  console.log('Test Data:')
  console.log(JSON.stringify(testData, null, 2))
  console.log('')

  // Create data check string (same as in verifyTelegramWidgetData)
  const dataCheckString = Object.keys(testData)
    .filter(key => key !== 'hash')
    .sort()
    .map(key => `${key}=${testData[key]}`)
    .join('\n')

  console.log('Data Check String:')
  console.log(dataCheckString)
  console.log('')
  console.log('Data Check String (with \\n visible):')
  console.log(JSON.stringify(dataCheckString))
  console.log('')

  // Create secret key
  const secretKey = crypto
    .createHash('sha256')
    .update(botToken)
    .digest()

  console.log('Secret Key (hex):', secretKey.toString('hex'))
  console.log('Secret Key Length:', secretKey.length, 'bytes')
  console.log('')

  // Calculate hash
  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex')

  console.log('=== Results ===')
  console.log('Received Hash:', testData.hash)
  console.log('Calculated Hash:', calculatedHash)
  console.log('Match:', calculatedHash === testData.hash ? '✅ YES' : '❌ NO')
  console.log('')

  if (calculatedHash !== testData.hash) {
    console.log('❌ Hash mismatch!')
    console.log('')
    console.log('Possible causes:')
    console.log('1. Bot token is wrong (verify with: npx tsx scripts/verify-bot-token.ts)')
    console.log('2. Data check string format is wrong')
    console.log('3. Server time is wrong (check with: curl https://mytgapp.com/api/debug/server-info)')
    console.log('4. Widget is using a different bot token')
  } else {
    console.log('✅ Hash matches! The calculation is correct.')
  }

  // Also test with different bot tokens to see what would match
  console.log('')
  console.log('=== Testing with different bot tokens ===')
  const testTokens = [
    botToken, // Current token
    // Add other tokens if you have them
  ]

  for (const token of testTokens) {
    const testSecretKey = crypto.createHash('sha256').update(token).digest()
    const testHash = crypto
      .createHmac('sha256', testSecretKey)
      .update(dataCheckString)
      .digest('hex')
    
    const matches = testHash === testData.hash
    console.log(`Token ${token.substring(0, 20)}...: ${matches ? '✅ MATCHES' : '❌ No match'}`)
  }
}

main()

