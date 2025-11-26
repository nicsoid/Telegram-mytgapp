# Quick Start Guide

## Initial Setup

### 1. Environment Setup

Create a `.env` file in the root directory:

```bash
# Database
DATABASE_URL="postgresql://postgres:p933kLDsURjUL7@127.0.0.1:5432/mytgapp"

# NextAuth
NEXTAUTH_SECRET="sadjqwsdaeds77DIlkkDJLWKNwwq230lKffep92"
NEXTAUTH_URL="http://localhost:3001"

# Telegram
TELEGRAM_BOT_TOKEN="your-bot-token-from-botfather"
TELEGRAM_BOT_USERNAME="your-bot-username"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3001"
CREDIT_PRICE_EUR=2.0
CREDIT_STRIPE_PRICE_ID="price_..."

# Subscription Configuration
SUBSCRIPTION_PRICE_EUR=9.99
SUBSCRIPTION_STRIPE_PRICE_ID="price_..."

# Platform Commission
PLATFORM_COMMISSION_PERCENT=20
```

### 2. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Create database and run migrations
npm run db:migrate

# (Optional) Open Prisma Studio to view data
npm run db:studio
```

### 3. Start Development

```bash
# Terminal 1: Start Next.js dev server
npm run dev

# Terminal 2: Start Telegram bot
npm run bot:dev
```

### 4. Create First Admin User

You'll need to create an admin user manually in the database or via a seed script:

```sql
-- Example SQL (adjust as needed)
INSERT INTO "User" (id, email, name, role, "createdAt")
VALUES ('admin-id', 'admin@mytgapp.com', 'Admin', 'ADMIN', NOW());
```

---

## Next Steps

1. **Set up Telegram Bot**:
   - Create bot via [@BotFather](https://t.me/botfather)
   - Get bot token
   - Add bot to a test group as admin
   - Test group verification flow

2. **Set up Stripe**:
   - Create Stripe account
   - Get API keys
   - Create products for credits and subscriptions
   - Set up webhook endpoint

3. **Start Development**:
   - Follow the implementation plan phases
   - Begin with Phase 1: Foundation
   - Build incrementally

---

## Project Status

✅ **Completed**:
- Project structure
- Database schema
- Basic configuration
- Documentation

🚧 **Next Steps**:
- Phase 1: Foundation (authentication, basic UI)
- Phase 2: Publisher system
- Phase 3: Group management
- Phase 4: Post scheduling

See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for detailed roadmap.

