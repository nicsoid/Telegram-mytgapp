# Architecture Change: Remove Publisher Role

## Overview
Simplify the model by removing the separate PUBLISHER role. All users can add groups and manage them with a subscription.

## Key Changes

### 1. Schema Changes
- Remove `PUBLISHER` from `UserRole` enum
- Move subscription fields from `Publisher` to `User`
- Change `TelegramGroup.publisherId` → `TelegramGroup.userId`
- Change `Subscription.publisherId` → `Subscription.userId`
- Change `CreditRequest.publisherId` → `CreditRequest.groupOwnerId` (user who owns the group)
- Remove `Publisher` model
- Remove `PublisherManagedUser` model (users grant credits directly per group)

### 2. Business Logic Changes
- Users need active subscription to add groups
- Users can set price per group in credits
- Users can grant credits to others for their specific groups
- Credits are still global, but prices are group-specific

### 3. UI/UX Changes
- Main page: Clear message about subscription requirement
- After registration: Show subscription options
- Remove "Become a Publisher" - all users can add groups with subscription
- Update navigation and permissions

## Migration Steps

1. ✅ Fix 404 for user details (done)
2. Update schema.prisma
3. Create migration
4. Update all API routes
5. Update all components
6. Update authentication logic
7. Update UI messaging

