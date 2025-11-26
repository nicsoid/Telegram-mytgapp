# MyTgApp - Implementation Plan

## Overview

MyTgApp is a platform that enables Telegram group owners (Publishers) to monetize their groups by allowing advertisers to post paid content. Publishers can manage their groups, set pricing, schedule posts, and earn revenue from paid advertisements.

**Website**: myTgApp.com  
**Target Users**: Telegram group owners (Publishers) and advertisers

---

## Core Features

### 1. Publisher Management
- **Publisher Registration**: Users can sign up as Publishers
- **Subscription Tiers**:
  - **Free Tier**: 10 credits total (one-time)
  - **Paid Tiers**: 
    - Fixed monthly fee (e.g., €9.99/month)
    - Revenue share model (% of paid posts, e.g., 20% commission)
- **Publisher Dashboard**: Manage groups, view analytics, manage subscriptions

### 2. Group Management
- **Add Groups**: Publishers can add their Telegram groups
- **Group Verification**: 
  - Publisher must be admin of the group
  - Verification via Telegram bot (bot must be added to group)
  - Bot checks admin status and verifies ownership
- **Group Settings**:
  - Set price per post (in credits)
  - Set posting windows (time slots when posts can be scheduled)
  - Set free post intervals (e.g., 1 free post per 7 days)
  - Enable/disable group

### 3. Post Scheduling
- **Publisher Posts**: Publishers can schedule their own posts in their groups
- **Paid Ad Posts**: Advertisers can pay to post in publisher groups
- **Scheduling Options**:
  - One-time posts
  - Recurring posts (daily, weekly)
  - Multiple time slots
- **Post Management**: Edit, delete, view status

### 4. Payment & Credits System
- **Unified Credits**: Platform-wide credit system
- **Credit Pricing**: Fixed price per credit (e.g., €2/credit)
- **Publisher Revenue**:
  - Advertiser pays credits to post
  - Publisher receives credits (minus platform commission)
  - Publisher can withdraw credits or use for their own posts
- **Stripe Integration**: For subscription payments and credit purchases

### 5. Telegram Integration
- **Telegram Bot**: 
  - Group verification
  - Admin commands
  - Post delivery
- **Telegram Mini App**: 
  - Publisher dashboard
  - Group management
  - Post scheduling
  - Analytics

---

## Architecture

### Tech Stack
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Payments**: Stripe
- **Telegram**: Telegraf (bot), Telegram Bot API
- **Deployment**: Vercel (web app), Railway/Neon (database)

### Project Structure
```
Telegram-mytgapp/
├── app/
│   ├── (web)/              # Web app routes
│   │   ├── dashboard/      # Publisher dashboard
│   │   ├── groups/         # Group management
│   │   ├── posts/          # Post scheduling
│   │   └── analytics/      # Analytics
│   ├── (telegram)/         # Telegram Mini App routes
│   │   ├── groups/         # Mini app group management
│   │   └── posts/          # Mini app post scheduling
│   └── api/
│       ├── publishers/     # Publisher management
│       ├── groups/         # Group CRUD
│       ├── posts/          # Post scheduling
│       ├── credits/        # Credit system
│       ├── subscriptions/  # Subscription management
│       └── telegram/       # Telegram bot webhooks
├── components/
│   ├── publisher/          # Publisher-specific components
│   ├── groups/             # Group management components
│   └── posts/              # Post scheduling components
├── lib/
│   ├── telegram/           # Telegram utilities
│   ├── credits/            # Credit system
│   └── stripe/             # Stripe integration
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── migrations/         # Database migrations
└── scripts/
    └── telegram-bot.ts     # Telegram bot server
```

---

## Database Schema

### Core Models

#### User
- Standard user fields (email, name, password)
- Role: `USER` | `PUBLISHER` | `ADMIN`
- Telegram integration (telegramId, telegramUsername)
- Credits balance

#### Publisher
- userId (one-to-one with User)
- subscriptionTier: `FREE` | `MONTHLY` | `REVENUE_SHARE`
- subscriptionStatus: `ACTIVE` | `CANCELED` | `EXPIRED`
- subscriptionExpiresAt
- revenueSharePercent (for revenue share tier)
- totalEarnings (credits earned from paid posts)
- totalSpent (credits spent on own posts)

#### TelegramGroup
- publisherId (owner)
- telegramChatId (group chat ID)
- name
- username (if public)
- isVerified (verified via bot)
- verifiedAt
- pricePerPost (in credits)
- freePostIntervalDays
- isActive
- postingWindows (JSON: time slots)
- totalPostsScheduled
- totalPostsSent
- createdAt, updatedAt

#### TelegramPost
- groupId
- publisherId (who scheduled it)
- advertiserId (if paid ad, null if publisher's own post)
- content (text)
- mediaUrls (images/videos)
- scheduledAt
- postedAt
- status: `DRAFT` | `SCHEDULED` | `SENT` | `FAILED`
- isPaidAd (boolean)
- creditsPaid (if paid ad)
- campaignId (if part of campaign)

#### CreditTransaction
- userId
- amount (positive for credit, negative for debit)
- type: `PURCHASE` | `EARNED` | `SPENT` | `WITHDRAWAL` | `ADMIN_GRANT`
- relatedPostId (if related to post)
- relatedGroupId (if related to group)
- description
- createdAt

#### Subscription
- publisherId
- tier: `FREE` | `MONTHLY` | `REVENUE_SHARE`
- status: `ACTIVE` | `CANCELED` | `EXPIRED`
- stripeSubscriptionId (if paid)
- stripeCustomerId
- currentPeriodStart
- currentPeriodEnd
- monthlyFee (if fixed fee)
- revenueSharePercent (if revenue share)

---

## Monetization Strategy

### Option 1: Fixed Monthly Subscription
- **Free Tier**: 10 credits (one-time), limited features
- **Basic**: €9.99/month - 100 credits/month, up to 5 groups
- **Pro**: €29.99/month - 500 credits/month, unlimited groups
- **Enterprise**: Custom pricing

### Option 2: Revenue Share Model
- **Free Tier**: 10 credits (one-time)
- **Revenue Share**: 20% commission on paid posts
  - Advertiser pays 10 credits → Publisher gets 8 credits, Platform gets 2 credits
  - No monthly fee, only pay when earning

### Option 3: Hybrid Model (Recommended)
- **Free Tier**: 10 credits (one-time)
- **Monthly Subscription**: €9.99/month (includes 50 credits + lower commission)
  - Commission: 15% (vs 20% for free tier)
- **Revenue Share Only**: No monthly fee, 25% commission
- **Enterprise**: Custom pricing, lower commission

### Revenue Streams
1. **Subscription Fees**: Monthly recurring revenue
2. **Commission on Paid Posts**: Percentage of each paid ad
3. **Credit Sales**: Selling credits to advertisers
4. **Premium Features**: Advanced analytics, API access, etc.

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Set up Next.js project with TypeScript
- [ ] Configure Prisma with PostgreSQL
- [ ] Set up authentication (NextAuth.js)
  - [ ] Telegram OAuth for publishers (web app)
  - [ ] Telegram Mini App auth for users
  - [ ] Email verification for publishers
- [ ] Create basic database schema
- [ ] Set up Stripe integration
- [ ] Create basic UI layout
- [ ] Implement publisher signup flow (Telegram + Email verification)

### Phase 2: Publisher System (Week 3-4)
- [ ] Publisher registration and onboarding
  - [ ] Telegram account verification
  - [ ] Email verification
  - [ ] Publisher profile creation
- [ ] Subscription management (free tier, paid tiers)
- [ ] Publisher dashboard
- [ ] Credit system implementation
- [ ] Stripe subscription checkout
- [ ] Publisher user management (add users, grant credits, delete users)

### Phase 3: Group Management (Week 5-6)
- [ ] Telegram bot setup
- [ ] Group verification flow
  - [ ] Bot verification commands (`/verify <code>`)
  - [ ] Admin status verification
  - [ ] Group ownership confirmation
- [ ] Group CRUD operations
- [ ] Group settings (pricing, windows, intervals)
- [ ] Admin panel for group management

### Phase 4: Post Scheduling (Week 7-8)
- [ ] Post creation and editing
- [ ] Scheduling system (one-time, recurring)
- [ ] Post status management
- [ ] Cron job for sending posts
- [ ] Post analytics

### Phase 5: Telegram Mini App (Week 9-10)
- [ ] Mini app authentication
- [ ] Mini app group management
- [ ] Mini app post scheduling
- [ ] Mini app analytics

### Phase 6: Paid Ads System (Week 11-12)
- [ ] Advertiser flow (browse groups, purchase posts)
- [ ] Payment processing for paid ads
- [ ] Revenue distribution (publisher earnings)
- [ ] Advertiser dashboard
- [ ] Credit request system (users request credits from admin)
- [ ] Admin credit management (approve/reject requests, grant credits)

### Phase 7: Polish & Launch (Week 13-14)
- [ ] Analytics and reporting
- [ ] Email notifications
- [ ] Error handling and logging
- [ ] Performance optimization
- [ ] Documentation
- [ ] Beta testing
- [ ] Production deployment

---

## Key Features Details

### Group Verification Flow
1. Publisher adds group via web app or mini app
2. System generates unique verification code
3. Publisher adds bot to group as admin
4. Publisher sends `/verify <code>` command in group
5. Bot verifies:
   - Bot is admin
   - Publisher (user who sent command) is admin
   - Code matches
6. Group is marked as verified
7. Publisher can now manage group settings

### Post Scheduling Flow
1. Publisher selects group
2. Creates post (text, media)
3. Selects time slots (one-time or recurring)
4. If paid ad: Advertiser pays credits
5. Post is scheduled
6. Cron job sends post at scheduled time
7. Post status updated to SENT
8. Publisher earns credits (if paid ad, minus commission)

### Credit System Flow
1. **Purchase Credits**: User buys credits via Stripe
2. **Earn Credits**: Publisher earns from paid posts
3. **Spend Credits**: 
   - Publisher schedules own posts (free)
   - Advertiser pays to post in group
4. **Withdrawal**: Publisher can request withdrawal (future feature)

---

## API Endpoints

### Publisher Management
- `POST /api/publishers/register` - Register as publisher
- `GET /api/publishers/me` - Get current publisher profile
- `PATCH /api/publishers/me` - Update publisher profile

### Groups
- `GET /api/groups` - List publisher's groups
- `POST /api/groups` - Add new group
- `GET /api/groups/[id]` - Get group details
- `PATCH /api/groups/[id]` - Update group settings
- `DELETE /api/groups/[id]` - Remove group
- `POST /api/groups/[id]/verify` - Verify group ownership

### Posts
- `GET /api/posts` - List posts (filter by group, status)
- `POST /api/posts` - Create new post
- `GET /api/posts/[id]` - Get post details
- `PATCH /api/posts/[id]` - Update post
- `DELETE /api/posts/[id]` - Delete post
- `POST /api/posts/[id]/purchase` - Purchase paid ad post

### Credits
- `GET /api/credits/balance` - Get credit balance
- `POST /api/credits/purchase` - Purchase credits
- `GET /api/credits/transactions` - Get transaction history

### Subscriptions
- `GET /api/subscriptions/plans` - Get subscription plans
- `POST /api/subscriptions/create-checkout` - Create Stripe checkout
- `POST /api/subscriptions/cancel` - Cancel subscription
- `GET /api/subscriptions/webhook` - Stripe webhook handler

### Telegram
- `POST /api/telegram/webhook` - Telegram bot webhook
- `POST /api/telegram/verify-group` - Verify group via bot

---

## Security Considerations

1. **Group Verification**: Only verified group owners can manage groups
2. **Post Authorization**: Only group owner or paid advertiser can schedule posts
3. **Credit Security**: All credit transactions are logged and auditable
4. **Telegram Bot Security**: Verify bot token, validate webhook signatures
5. **Rate Limiting**: Prevent abuse of API endpoints
6. **Input Validation**: Validate all user inputs (Zod schemas)

---

## Future Enhancements

1. **Analytics Dashboard**: Detailed analytics for publishers
2. **API Access**: REST API for third-party integrations
3. **Bulk Posting**: Schedule multiple posts at once
4. **Post Templates**: Save and reuse post templates
5. **A/B Testing**: Test different post formats
6. **Affiliate Program**: Publishers can refer other publishers
7. **White Label**: Custom branding for enterprise clients
8. **Mobile App**: Native mobile apps for iOS/Android

---

## Success Metrics

1. **Publisher Acquisition**: Number of publishers registered
2. **Group Growth**: Number of groups added
3. **Post Volume**: Number of posts scheduled/sent
4. **Revenue**: Monthly recurring revenue (MRR)
5. **Commission Revenue**: Revenue from paid posts
6. **User Retention**: Publisher retention rate
7. **Engagement**: Posts per publisher per month

---

## Next Steps

1. Review and approve this plan
2. Set up project structure
3. Initialize database schema
4. Begin Phase 1 implementation

