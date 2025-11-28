#!/bin/bash

# Quick fix script for production - minimal output
# Run this on your production server

set -e

echo "Fixing production migration..."

# Fix credit requests
npm run fix-credit-requests > /dev/null 2>&1 || true

# Resolve failed migration
npx prisma migrate resolve --rolled-back 20250101000000_restructure_business_model 2>&1 || true

# Apply migrations
npx prisma migrate deploy

# Regenerate client
npx prisma generate > /dev/null 2>&1

echo "✅ Done! Restart your app server."

