# Stripe Setup Guide

## Common Issues and Solutions

### Error: "Invalid API Key provided: sk_test_..."

This error means your Stripe API key is invalid or incorrect. Here's how to fix it:

#### 1. Verify Your Stripe API Key

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Developers** → **API keys**
3. Make sure you're in the correct mode:
   - **Test mode** for development (keys start with `sk_test_` and `pk_test_`)
   - **Live mode** for production (keys start with `sk_live_` and `pk_live_`)

#### 2. Check Your Environment Variables

Make sure your `.env` file has the correct key:

```env
# For TEST mode (development)
STRIPE_SECRET_KEY=sk_test_51...your_actual_key_here

# For LIVE mode (production)
STRIPE_SECRET_KEY=sk_live_51...your_actual_key_here
```

**Important:**
- The key should start with `sk_test_` (test) or `sk_live_` (production)
- No extra spaces or quotes around the key
- Copy the entire key from Stripe dashboard

#### 3. Verify Price IDs

Make sure your price IDs match your Stripe account:

```env
# Monthly subscription price ID
STRIPE_MONTHLY_PRICE_ID=price_1...your_actual_price_id

# Revenue share subscription price ID (optional)
STRIPE_REVENUE_SHARE_PRICE_ID=price_1...your_actual_price_id
```

To find your price IDs:
1. Go to Stripe Dashboard → **Products**
2. Click on your product
3. Copy the **Price ID** (starts with `price_`)

#### 4. Restart Your Server

After updating `.env`:
```bash
# Stop your server (Ctrl+C)
# Then restart
npm run dev
# or in production
npm run build && npm start
```

#### 5. Test Your Configuration

You can test if your Stripe key is working by checking the pricing endpoint:
```bash
curl https://mytgapp.com/api/subscriptions/pricing
```

If it returns pricing data, your key is working. If you get an error, check the logs.

## Webhook Setup

### 1. Create Webhook in Stripe Dashboard

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter your webhook URL: `https://mytgapp.com/api/subscriptions/webhook`
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the **Signing secret** (starts with `whsec_`)

### 2. Add Webhook Secret to .env

```env
STRIPE_WEBHOOK_SECRET=whsec_...your_webhook_secret_here
```

### 3. Test Webhook

You can test webhooks using Stripe CLI:
```bash
stripe listen --forward-to https://mytgapp.com/api/subscriptions/webhook
```

## Environment Variables Checklist

```env
# Required
STRIPE_SECRET_KEY=sk_test_...          # Your Stripe secret key
STRIPE_MONTHLY_PRICE_ID=price_...      # Monthly subscription price ID
STRIPE_WEBHOOK_SECRET=whsec_...         # Webhook signing secret

# Optional
STRIPE_REVENUE_SHARE_PRICE_ID=price_... # Revenue share price ID (if using)
REVENUE_SHARE_PERCENT=20                # Revenue share percentage
MONTHLY_SUBSCRIPTION_PRICE=9.99         # Fallback price if Stripe API fails
```

## Troubleshooting

### Issue: "Stripe not configured"
- Check if `STRIPE_SECRET_KEY` is set in `.env`
- Restart your server after adding the key

### Issue: "Price ID not found"
- Verify the price ID exists in your Stripe account
- Make sure you're using the correct mode (test vs live)
- Check that the price ID matches the product you created

### Issue: Webhook not receiving events
- Verify webhook URL is correct and accessible
- Check webhook secret matches the one in Stripe dashboard
- Ensure your server is running and accessible from the internet
- Check server logs for webhook errors

### Issue: Test vs Live Mode Mismatch
- Test keys (`sk_test_`) only work with test price IDs
- Live keys (`sk_live_`) only work with live price IDs
- Make sure all your keys and price IDs are from the same mode

