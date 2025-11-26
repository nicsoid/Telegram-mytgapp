# User Management System

## Overview

This document details how different user roles can manage users and their interactions within the platform.

---

## User Roles & Permissions

### Admin (Platform Owner)
**Full Control Over:**
- ✅ All users (view, edit, delete, change roles)
- ✅ All publishers (view, edit, verify, manage subscriptions)
- ✅ All groups (view, manage, verify)
- ✅ All posts (view, edit, delete)
- ✅ Credit system (grant, revoke, approve requests)
- ✅ Platform settings and configuration
- ✅ Analytics and reporting

### Publisher (Group Owner)
**Can Manage:**
- ✅ Users who post in their groups
- ✅ Grant credits to users for posting in their groups
- ✅ Remove users from their managed list
- ✅ View posts by users in their groups
- ✅ Set pricing for their groups
- ✅ Schedule posts in their groups

**Cannot:**
- ❌ Manage users outside their groups
- ❌ Grant credits to users not in their managed list
- ❌ Access other publishers' data
- ❌ Change user roles

### User (Advertiser/Regular User)
**Can:**
- ✅ Request credits from admin
- ✅ View own credit balance
- ✅ View own posts
- ✅ Post paid ads in publisher groups (if they have credits)
- ✅ Manage own posts

**Cannot:**
- ❌ Manage other users
- ❌ Grant credits
- ❌ Access publisher features

---

## Publisher User Management

### Adding Users to Managed List

**Flow:**
1. Publisher navigates to "Manage Users" in dashboard
2. Publisher searches for user by:
   - Telegram username
   - Email address
   - User ID
3. System finds user and displays:
   - Name
   - Telegram username
   - Current credit balance
   - Posts in publisher's groups
4. Publisher clicks "Add to Managed List"
5. System creates `PublisherManagedUser` record

**API Endpoint:**
```
POST /api/publishers/me/users
Body: { userId: string, notes?: string }
```

### Granting Credits to Users

**Flow:**
1. Publisher selects user from managed list
2. Publisher enters credit amount
3. Publisher can add optional notes
4. System validates:
   - User is in publisher's managed list
   - Publisher has sufficient credits (if deducting from publisher)
   - Amount is positive
5. System:
   - Adds credits to user's account
   - Creates `CreditTransaction` (type: `ADMIN_GRANT`, relatedGroupId: group ID)
   - Updates `PublisherManagedUser.creditsAdded`
   - Logs transaction

**API Endpoint:**
```
POST /api/publishers/me/users/[userId]/credits
Body: { amount: number, groupId?: string, notes?: string }
```

**Note:** Publishers can grant credits from their own balance OR from platform credits (if they have permission).

### Removing Users from Managed List

**Flow:**
1. Publisher selects user from managed list
2. Publisher clicks "Remove User"
3. System confirms action
4. System:
   - Deletes `PublisherManagedUser` record
   - User's existing posts remain
   - User can no longer receive credits from this publisher

**API Endpoint:**
```
DELETE /api/publishers/me/users/[userId]
```

### Viewing User Activity

Publishers can view:
- User's posts in their groups
- Credit transactions related to their groups
- User's credit balance
- User's activity history

**API Endpoint:**
```
GET /api/publishers/me/users/[userId]/activity
```

---

## Admin User Management

### Viewing All Users

**Filters:**
- Role (USER, PUBLISHER, ADMIN)
- Verification status
- Credit balance range
- Registration date range
- Search by name, email, Telegram username

**API Endpoint:**
```
GET /api/admin/users?role=USER&verified=true&search=john
```

### Granting Credits

**Flow:**
1. Admin selects user
2. Admin enters credit amount
3. Admin adds reason/notes
4. System:
   - Adds credits to user's account
   - Creates `CreditTransaction` (type: `ADMIN_GRANT`)
   - Logs admin action

**API Endpoint:**
```
POST /api/admin/users/[userId]/credits
Body: { amount: number, reason?: string }
```

### Revoking Credits

**Flow:**
1. Admin selects user
2. Admin enters credit amount to revoke
3. Admin adds reason
4. System:
   - Deducts credits from user's account
   - Creates `CreditTransaction` (type: `ADMIN_GRANT`, negative amount)
   - Logs admin action

**API Endpoint:**
```
POST /api/admin/users/[userId]/credits
Body: { amount: -number, reason: string }
```

### Changing User Role

**Flow:**
1. Admin selects user
2. Admin changes role (USER → PUBLISHER, PUBLISHER → ADMIN, etc.)
3. System:
   - Updates user role
   - If promoting to PUBLISHER: Creates Publisher record
   - If demoting from PUBLISHER: Removes Publisher record (with confirmation)
   - Logs role change

**API Endpoint:**
```
PATCH /api/admin/users/[userId]
Body: { role: "PUBLISHER" | "ADMIN" | "USER" }
```

### Deleting Users

**Flow:**
1. Admin selects user
2. Admin confirms deletion
3. System:
   - Checks for related data (posts, transactions)
   - Shows warning if data exists
   - Deletes user (cascades to related records)
   - Logs deletion

**API Endpoint:**
```
DELETE /api/admin/users/[userId]
```

---

## Credit Request System

### User Requesting Credits

**Flow:**
1. User navigates to "Request Credits" in Mini App or web app
2. User enters:
   - Credit amount requested
   - Reason/description (optional)
3. System creates `CreditRequest` record (status: PENDING)
4. User sees confirmation and request status

**API Endpoint:**
```
POST /api/credits/request
Body: { amount: number, reason?: string }
```

### Admin Processing Requests

**Flow:**
1. Admin views credit request queue
2. Admin sees:
   - User information
   - Requested amount
   - Reason
   - Request date
3. Admin can:
   - **Approve**: Grants credits, updates request status
   - **Reject**: Updates request status, can add notes
4. System:
   - If approved: Adds credits, creates transaction
   - If rejected: Updates request with rejection reason
   - Notifies user (via Telegram or email)

**API Endpoints:**
```
GET /api/admin/credit-requests?status=PENDING
POST /api/admin/credit-requests/[id]/approve
Body: { amount?: number } // Can approve different amount
POST /api/admin/credit-requests/[id]/reject
Body: { reason: string }
```

---

## Admin Publisher Management

### Viewing All Publishers

**Filters:**
- Subscription tier
- Subscription status
- Verification status
- Registration date
- Search by name, email, Telegram username

**API Endpoint:**
```
GET /api/admin/publishers?tier=MONTHLY&status=ACTIVE
```

### Managing Publisher Subscriptions

**Actions:**
- Activate/deactivate subscription
- Change subscription tier
- Set subscription expiration
- Grant free credits
- View subscription history

**API Endpoint:**
```
PATCH /api/admin/publishers/[id]/subscription
Body: { 
  tier?: SubscriptionTier,
  status?: SubscriptionStatus,
  expiresAt?: Date,
  credits?: number
}
```

### Verifying Publishers

**Flow:**
1. Admin reviews publisher account
2. Admin verifies:
   - Telegram account is verified
   - Email is verified
   - Groups are verified
3. Admin can manually verify publisher
4. System updates `Publisher.isVerified = true`

**API Endpoint:**
```
POST /api/admin/publishers/[id]/verify
```

---

## Database Schema

### PublisherManagedUser
```prisma
model PublisherManagedUser {
  id          String   @id @default(cuid())
  publisherId String
  userId      String
  creditsAdded Int     @default(0)
  notes       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  publisher Publisher @relation(...)
  user      User      @relation(...)
  
  @@unique([publisherId, userId])
}
```

### CreditRequest
```prisma
model CreditRequest {
  id          String   @id @default(cuid())
  userId      String
  amount      Int
  reason      String?
  status      String   @default("PENDING")
  processedBy String?
  processedAt DateTime?
  notes       String?
  createdAt   DateTime @default(now())
  
  user User @relation(...)
}
```

---

## Security & Validation

### Publisher User Management
- ✅ Publishers can only manage users in their managed list
- ✅ Credit grants are logged and auditable
- ✅ Publishers cannot grant more credits than they have (if deducting from their balance)
- ✅ All actions require authentication

### Admin Actions
- ✅ All admin actions are logged
- ✅ Admin role is verified on every request
- ✅ Sensitive actions require confirmation
- ✅ Audit trail for all credit transactions

### Credit Requests
- ✅ Users can only request credits for themselves
- ✅ Requests are queued for admin review
- ✅ Admin can approve/reject with notes
- ✅ Users are notified of request status

---

## UI Components Needed

### Publisher Dashboard
- User management section
- Add user form
- User list with credit balance
- Grant credits form
- User activity view

### Admin Dashboard
- User management panel
- Credit request queue
- Publisher management panel
- Credit grant/revoke forms
- User search and filters

### User Mini App
- Credit request form
- Request status view
- Credit balance display
- Transaction history

---

## Implementation Checklist

- [ ] Publisher user management API endpoints
- [ ] Admin user management API endpoints
- [ ] Credit request system API endpoints
- [ ] Publisher user management UI
- [ ] Admin dashboard UI
- [ ] Credit request UI (user and admin)
- [ ] Audit logging for all actions
- [ ] Email/Telegram notifications
- [ ] Security validation and authorization

