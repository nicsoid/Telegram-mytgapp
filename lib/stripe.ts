import Stripe from 'stripe'

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-10-29.clover',
      typescript: true,
    })
  : null

if (!stripe && process.env.NODE_ENV === 'production') {
  console.warn('STRIPE_SECRET_KEY is not set - Stripe features will not work')
}

