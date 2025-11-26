# Authentication & User Management Plan

## Overview

This document outlines the authentication flows, user roles, and management capabilities for MyTgApp.

---

## User Roles

### 1. **Admin** (Platform Owner)
- Full control over the entire platform
- Can manage all publishers
- Can manage all users
- Can grant/revoke credits
- Can approve/reject credit requests
- Can manage subscriptions
- Can access all analytics
- Can configure platform settings

### 2. **Publisher** (Group Owners)
- Must verify both Telegram account AND email
- Can add and verify Telegram groups they own
- Can manage users who post in their groups
- Can grant credits to users for posting in their groups
- Can delete users from their groups
- Can schedule posts in their groups
- Can set pricing for their groups
- Can view analytics for their groups

### 3. **User** (Advertisers/Regular Users)
- Can sign up via Telegram Mini App
- Can request credits from admin
- Can post paid ads in publisher groups (if they have credits)
- Can manage their own posts
- Can view their credit balance and transaction history

---

## Authentication Flows

### Publisher Signup Flow

#### Step 1: Telegram Authentication
1. User clicks "Sign up as Publisher" on web app
2. Redirected to Telegram OAuth/login
3. User authorizes with Telegram
4. System receives:
   - `telegramId`
   - `telegramUsername`
   - `firstName`, `lastName` (optional)
   - `photoUrl` (optional)

#### Step 2: Create User Account
1. System creates User record with:
   - `telegramId`
   - `telegramUsername`
   - `role = PUBLISHER`
   - `telegramVerifiedAt = now()`

#### Step 3: Email Verification
1. User is prompted to add email address
2. System sends verification email
3. User clicks verification link
4. System updates:
   - `email`
   - `emailVerified = now()`

#### Step 4: Create Publisher Profile
1. Once both Telegram and email are verified:
   - Create Publisher record
   - Set `telegramVerified = true`
   - Set `emailVerified = true`
   - Set `isVerified = true`
2. User can now add groups

#### Step 5: Group Verification
1. Publisher adds group via web app or mini app
2. System generates unique verification code
3. Publisher adds bot to group as admin
4. Publisher sends `/verify <code>` in group
5. Bot verifies:
   - Bot is admin in group
   - Publisher (user who sent command) is admin in group
   - Code matches
6. Group is marked as verified (`isVerified = true`, `verifiedByBot = true`)

---

### Regular User Signup Flow (Mini App)

#### Step 1: Telegram Mini App Authentication
1. User opens Mini App from Telegram
2. System receives Telegram init data (from Telegram WebApp)
3. System extracts:
   - `telegramId`
   - `telegramUsername`
   - `firstName`, `lastName`
   - `photoUrl`

#### Step 2: Create or Login User
1. System checks if user exists by `telegramId`
2. If exists: Login and create session
3. If not exists: Create User record with:
   - `telegramId`
   - `telegramUsername`
   - `role = USER`
   - `telegramVerifiedAt = now()`
   - No email required for regular users

#### Step 3: Request Credits (Optional)
1. User can request credits from admin
2. System creates CreditRequest record
3. Admin reviews and approves/rejects
4. If approved: Credits added to user account

---

## User Management

### Publisher Managing Users

Publishers can manage users who post in their groups:

#### Add User to Managed List
1. Publisher searches for user (by Telegram username or email)
2. System creates `PublisherManagedUser` record
3. Publisher can now:
   - Grant credits to this user
   - View user's posts in their groups
   - Delete user from managed list

#### Grant Credits to User
1. Publisher selects user from managed list
2. Publisher enters credit amount
3. System:
   - Adds credits to user's account
   - Creates `CreditTransaction` (type: `ADMIN_GRANT`)
   - Updates `PublisherManagedUser.creditsAdded`
   - Deducts from publisher's credits (if applicable)

#### Delete User
1. Publisher removes user from managed list
2. System deletes `PublisherManagedUser` record
3. User's existing posts remain, but publisher can't manage them anymore

---

### Admin Managing Users

Admins can:
1. **View all users**: List all users with filters (role, verified status, etc.)
2. **Grant credits**: Add credits to any user
3. **Revoke credits**: Remove credits from any user
4. **Change user role**: Promote user to Publisher or Admin
5. **Delete users**: Remove users from system
6. **View credit requests**: See all pending credit requests
7. **Approve/Reject requests**: Process credit requests

---

### Admin Managing Publishers

Admins can:
1. **View all publishers**: List all publishers with subscription info
2. **Manage subscriptions**: 
   - Activate/deactivate subscriptions
   - Change subscription tier
   - Set subscription expiration
   - Grant free credits
3. **Verify publishers**: Manually verify publisher accounts
4. **Manage groups**: View and manage all groups
5. **View analytics**: See publisher performance metrics

---

## API Endpoints

### Authentication

#### Publisher Signup
- `POST /api/auth/publisher/signup/telegram` - Start Telegram OAuth
- `POST /api/auth/publisher/verify-email` - Verify email address
- `GET /api/auth/publisher/status` - Check verification status

#### User Signup (Mini App)
- `POST /api/auth/telegram/login` - Login via Telegram Mini App
- `GET /api/auth/session` - Get current session

### User Management

#### Publisher Managing Users
- `GET /api/publishers/me/users` - List managed users
- `POST /api/publishers/me/users` - Add user to managed list
- `POST /api/publishers/me/users/[userId]/credits` - Grant credits to user
- `DELETE /api/publishers/me/users/[userId]` - Remove user from managed list

#### Admin Managing Users
- `GET /api/admin/users` - List all users
- `POST /api/admin/users/[userId]/credits` - Grant/revoke credits
- `PATCH /api/admin/users/[userId]` - Update user (role, etc.)
- `DELETE /api/admin/users/[userId]` - Delete user
- `GET /api/admin/credit-requests` - List credit requests
- `POST /api/admin/credit-requests/[id]/approve` - Approve request
- `POST /api/admin/credit-requests/[id]/reject` - Reject request

#### Admin Managing Publishers
- `GET /api/admin/publishers` - List all publishers
- `PATCH /api/admin/publishers/[id]` - Update publisher
- `POST /api/admin/publishers/[id]/verify` - Manually verify publisher
- `POST /api/admin/publishers/[id]/subscription` - Manage subscription

### Credit Requests

#### User Requesting Credits
- `POST /api/credits/request` - Request credits from admin
- `GET /api/credits/requests` - View own credit requests

---

## Database Schema Updates

### User Model
- Added `telegramVerifiedAt` - When Telegram was verified
- Added relations for publisher-managed users

### Publisher Model
- Added `telegramVerified` - Telegram account verified
- Added `emailVerified` - Email verified
- Added `isVerified` - Both verified (can add groups)

### TelegramGroup Model
- Added `verifiedByBot` - Bot confirmed publisher is admin

### New Models

#### PublisherManagedUser
- Links publishers to users they manage
- Tracks credits added by publisher

#### CreditRequest
- Users can request credits from admin
- Admin can approve/reject

---

## Security Considerations

1. **Telegram Verification**: 
   - Verify Telegram init data signature
   - Validate Telegram user ID matches session

2. **Email Verification**:
   - Send secure verification tokens
   - Expire tokens after 24 hours

3. **Group Verification**:
   - Bot must verify publisher is admin
   - Verification code expires after 1 hour
   - Only verified publishers can add groups

4. **Publisher User Management**:
   - Publishers can only manage users who post in their groups
   - Credit grants are logged and auditable

5. **Admin Actions**:
   - All admin actions are logged
   - Admin role is protected and verified

---

## Implementation Priority

### Phase 1: Basic Authentication
1. Telegram OAuth for publishers (web app)
2. Telegram Mini App auth for users
3. Email verification for publishers
4. Basic session management

### Phase 2: Verification
1. Telegram account verification
2. Email verification
3. Group ownership verification via bot

### Phase 3: User Management
1. Publisher managing users
2. Admin managing users and publishers
3. Credit request system

---

## UI/UX Considerations

### Publisher Signup
- Clear step-by-step process
- Show verification status (Telegram ✓, Email ✓, Groups ✓)
- Guide through group verification

### User Signup (Mini App)
- Seamless Telegram login
- Simple credit request form
- Clear credit balance display

### Admin Dashboard
- User management interface
- Credit request queue
- Publisher management
- Analytics and reporting

---

## Next Steps

1. Implement Telegram OAuth flow
2. Implement email verification
3. Implement group verification bot commands
4. Build user management interfaces
5. Build admin dashboard

