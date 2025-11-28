#!/bin/bash

# Script to resolve failed migration on production server
# This script helps diagnose and fix the failed migration state

echo "🔍 Diagnosing failed migration..."

# Check migration status
echo "📊 Current migration status:"
npx prisma migrate status

echo ""
echo "🔧 Options to resolve:"
echo ""
echo "Option 1: If the migration partially applied, mark it as rolled back:"
echo "  npx prisma migrate resolve --rolled-back 20250101000000_restructure_business_model"
echo ""
echo "Option 2: If the migration fully applied but marked as failed, mark it as applied:"
echo "  npx prisma migrate resolve --applied 20250101000000_restructure_business_model"
echo ""
echo "Option 3: Check database state manually:"
echo "  Check if these columns exist:"
echo "    - Publisher.freePostsUsed"
echo "    - Publisher.freePostsLimit"
echo "    - Publisher.pricePerCredit"
echo "    - SubscriptionTierConfig table"
echo "    - CreditRequest.publisherId (should be NOT NULL if migration succeeded)"
echo ""
echo "💡 Recommendation:"
echo "  1. First, check if the migration changes were actually applied"
echo "  2. If yes, mark as applied. If no, mark as rolled back and re-apply"
echo ""

