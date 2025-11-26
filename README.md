# MyTgApp - Telegram Group Management Platform

A professional platform for managing Telegram groups, scheduling posts, and monetizing through paid advertisements.

## Features

### For Publishers
- Sign up with Telegram and email verification
- Add and verify Telegram groups
- Schedule posts in your groups
- Set pricing per post
- Manage users and grant credits
- Earn revenue from paid ads
- View analytics and statistics

### For Users
- Sign in via Telegram Mini App
- Request credits from admin
- Post paid ads in publisher groups
- Manage your posts

### For Admins
- Manage all users and publishers
- Approve/reject credit requests
- Grant credits to users
- Full platform control

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with Telegram OAuth
- **Payments**: Stripe
- **Styling**: Tailwind CSS
- **Bot**: Telegraf

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Telegram Bot Token (from @BotFather)
- Stripe account (optional, for payments)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables (`.env`):
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/mytgapp
   TELEGRAM_BOT_TOKEN=your_bot_token
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=your_webhook_secret
   CREDIT_STRIPE_PRICE_ID=price_xxx
   CREDIT_PRICE_EUR=2.0
   CRON_SECRET=your_cron_secret
   NEXTAUTH_SECRET=your_nextauth_secret
   NEXTAUTH_URL=http://localhost:3000
   ```

4. Set up the database:
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. (Optional) Run the Telegram bot:
   ```bash
   npm run bot
   ```

## Project Structure

```
/app
  /api          - API routes
  /admin        - Admin dashboard
  /dashboard    - Publisher dashboard
  /app          - User app
  /auth         - Authentication pages
/components    - React components
/lib           - Utilities and helpers
/prisma        - Database schema
/scripts       - Bot and utility scripts
```

## Key Features

### Authentication
- Telegram OAuth for web app
- Telegram Mini App authentication
- Email verification for publishers
- Session management

### Group Management
- Add Telegram groups
- Verify group ownership via bot
- Set pricing and posting windows
- Track statistics

### Post Scheduling
- Schedule posts with content and media
- Automated sending via cron job
- Status tracking
- Paid ads support

### Credit System
- Unified credit balance
- Credit purchases via Stripe
- Credit requests and approvals
- Transaction history

## API Routes

### Authentication
- `POST /api/auth/[...nextauth]` - NextAuth endpoints
- `POST /api/auth/publisher/signup/telegram` - Publisher Telegram signup
- `POST /api/auth/publisher/verify-email` - Email verification

### Admin
- `GET /api/admin/users` - List users
- `POST /api/admin/users/[userId]/credits` - Grant credits
- `GET /api/admin/credit-requests` - List credit requests
- `POST /api/admin/credit-requests/[id]/approve` - Approve request
- `POST /api/admin/credit-requests/[id]/reject` - Reject request

### Publisher
- `GET /api/publishers/me` - Get publisher profile
- `GET /api/publishers/me/users` - List managed users
- `POST /api/publishers/me/users` - Add user to managed list
- `POST /api/publishers/me/users/[userId]/credits` - Grant credits to user
- `DELETE /api/publishers/me/users/[userId]` - Remove user

### Groups
- `GET /api/groups` - List groups
- `POST /api/groups` - Add group

### Posts
- `GET /api/posts` - List posts
- `POST /api/posts` - Schedule post

### Credits
- `GET /api/credits/balance` - Get credit balance
- `POST /api/credits/request` - Request credits
- `POST /api/credits/purchase` - Purchase credits

### Telegram
- `POST /api/telegram/verify-group` - Verify group
- `GET /api/telegram/cron` - Cron job for sending posts

## Deployment

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

### Quick Deployment Steps

1. Set up production database (PostgreSQL)
2. Configure environment variables (`.env` file)
3. Run database migrations: `npx prisma migrate deploy`
4. Build the application: `npm run build`
5. Deploy to your hosting platform:
   - **VPS with CyberPanel**: See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete guide
   - **Vercel**: Connect your Git repository and configure environment variables
   - **Railway**: Connect repository and set up PostgreSQL addon
6. Set up cron job for post sending (see deployment guide)
7. Deploy Telegram bot (can run as PM2 process or separate service)

## License

MIT
