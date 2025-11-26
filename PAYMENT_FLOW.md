# Payment Flow Documentation

## Overview

MyTgApp uses a two-tier payment system:
1. **Publishers pay the platform** via Stripe subscriptions
2. **Users receive credits from publishers** (no direct payment between users and publishers)

## Publisher Payment Flow

### Subscription Tiers

Publishers can subscribe to different tiers:

1. **FREE Tier**
   - 10 credits (one-time)
   - No monthly fee
   - Basic features

2. **MONTHLY Tier**
   - Fixed monthly fee (e.g., €9.99/month)
   - Unlimited credits for own posts
   - Full features

3. **REVENUE_SHARE Tier**
   - Revenue share model (e.g., 20% commission)
   - Earn from paid ads in their groups
   - Full features

### Subscription Process

1. Publisher signs up and verifies Telegram + Email
2. Publisher navigates to subscription settings
3. Publisher selects tier and initiates Stripe checkout
4. Payment processed via Stripe
5. Webhook updates publisher subscription status
6. Publisher gains access to features based on tier

### API Endpoints

- `POST /api/subscriptions/create-checkout` - Create Stripe checkout session
- `POST /api/subscriptions/webhook` - Handle Stripe webhooks

## User Credit Flow

### Credit Sources

Users can receive credits from:
1. **Publishers** - Request credits from specific publishers
2. **Admin** - Request credits from platform admin

### Credit Request Process

1. User requests credits from a publisher or admin
2. Request is created with status "PENDING"
3. Publisher/Admin reviews request
4. Publisher/Admin approves or rejects
5. If approved, credits are added to user's account
6. User can now post paid ads in groups

### API Endpoints

**User Side:**
- `POST /api/credits/request` - Request credits (can specify publisherId)

**Publisher Side:**
- `GET /api/publishers/me/credit-requests` - List credit requests
- `POST /api/publishers/me/credit-requests/[id]/approve` - Approve request
- `POST /api/publishers/me/credit-requests/[id]/reject` - Reject request

**Admin Side:**
- `GET /api/admin/credit-requests` - List all credit requests
- `POST /api/admin/credit-requests/[id]/approve` - Approve request
- `POST /api/admin/credit-requests/[id]/reject` - Reject request

## Paid Ads Flow

1. User has credits in their account
2. User schedules a paid ad in a publisher's group
3. Credits are deducted from user's account
4. Publisher receives credits (minus platform commission)
5. Post is scheduled and sent automatically

## Database Schema

### CreditRequest Model
```prisma
model CreditRequest {
  id          String
  userId      String
  publisherId String?  // null if requesting from admin
  amount      Int
  reason      String?
  status      String   // PENDING, APPROVED, REJECTED
  processedBy String?  // Publisher or admin ID
  ...
}
```

### CreditTransaction Model
```prisma
model CreditTransaction {
  id            String
  userId        String
  amount        Int      // Positive for credit, negative for debit
  type          CreditTransactionType
  relatedPostId String?
  relatedGroupId String?
  description   String?
  ...
}
```

## Important Notes

- **Users do NOT purchase credits directly** - they only receive them from publishers or admin
- **Publishers pay the platform** via Stripe subscriptions
- **No payment processing between users and publishers** - credits are virtual currency
- **Platform takes commission** from paid ads (configured per publisher tier)

## Environment Variables

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_MONTHLY_PRICE_ID=price_...
STRIPE_REVENUE_SHARE_PRICE_ID=price_...

# Credit Configuration (for admin grants, not user purchases)
CREDIT_PRICE_EUR=2.0  # Display only, not used for user purchases
```

