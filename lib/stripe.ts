import Stripe from 'stripe'

// Get and trim the Stripe secret key to avoid whitespace issues
const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim()

// Initialize Stripe client
export const stripe = stripeSecretKey
  ? (() => {
      try {
        const client = new Stripe(stripeSecretKey, {
          apiVersion: '2025-10-29.clover',
          typescript: true,
        })
        
        // Log key info (first 10 chars only for security)
        const keyPrefix = stripeSecretKey.substring(0, 10)
        console.log(`✅ Stripe initialized with key: ${keyPrefix}...`)
        
        return client
      } catch (error) {
        console.error('❌ Failed to initialize Stripe client:', error)
        return null
      }
    })()
  : null

if (!stripe) {
  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️ STRIPE_SECRET_KEY is not set - Stripe features will not work')
  } else {
    console.warn('⚠️ STRIPE_SECRET_KEY is not set - Stripe features will not work')
    console.warn('   Add STRIPE_SECRET_KEY=sk_test_... to your .env file')
  }
} else if (stripeSecretKey) {
  // Validate the key format (basic check)
  if (!stripeSecretKey.startsWith('sk_test_') && !stripeSecretKey.startsWith('sk_live_')) {
    console.warn('⚠️ STRIPE_SECRET_KEY format looks incorrect. Should start with sk_test_ or sk_live_')
  } else {
    console.log(`✅ Stripe key format validated: ${stripeSecretKey.startsWith('sk_test_') ? 'TEST' : 'LIVE'} mode`)
  }
}

