import "dotenv/config"
import { prisma } from "../lib/prisma"

async function checkDatabaseState() {
  console.log("🔍 Checking database state after failed migration...\n")

  try {
    // Check Publisher columns
    console.log("1. Checking Publisher table for new columns...")
    try {
      const publisherSample = await prisma.publisher.findFirst({
        select: {
          id: true,
          freePostsUsed: true,
          freePostsLimit: true,
          pricePerCredit: true,
        },
      })
      if (publisherSample !== null) {
        console.log("   ✅ New columns exist: freePostsUsed, freePostsLimit, pricePerCredit")
      } else {
        // Table might be empty, check schema directly
        const result = await prisma.$queryRaw<Array<{ column_name: string }>>`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'Publisher' 
            AND column_name IN ('freePostsUsed', 'freePostsLimit', 'pricePerCredit')
        `
        if (result.length > 0) {
          console.log(`   ✅ New columns exist: ${result.map(r => r.column_name).join(', ')}`)
        } else {
          console.log("   ❌ New columns DO NOT exist - migration was not applied")
        }
      }
    } catch (error: any) {
      if (error.message?.includes('freePostsUsed') || error.message?.includes('freePostsLimit')) {
        console.log("   ❌ New columns DO NOT exist - migration was not applied")
      } else {
        console.log("   ⚠️  Could not check columns:", error.message)
      }
    }

    // Check SubscriptionTierConfig table
    console.log("\n2. Checking SubscriptionTierConfig table...")
    try {
      const count = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = 'SubscriptionTierConfig'
      `
      if (Number(count[0]?.count || 0) > 0) {
        console.log("   ✅ SubscriptionTierConfig table exists")
      } else {
        console.log("   ❌ SubscriptionTierConfig table DOES NOT exist")
      }
    } catch (error: any) {
      console.log("   ⚠️  Could not check table:", error.message)
    }

    // Check CreditRequest.publisherId constraint
    console.log("\n3. Checking CreditRequest.publisherId constraint...")
    try {
      const result = await prisma.$queryRaw<Array<{ is_nullable: string }>>`
        SELECT is_nullable 
        FROM information_schema.columns
        WHERE table_name = 'CreditRequest' 
          AND column_name = 'publisherId'
      `
      if (result.length > 0) {
        const isNullable = result[0].is_nullable === 'YES'
        if (isNullable) {
          console.log("   ⚠️  publisherId is still nullable (NOT NULL constraint not applied)")
        } else {
          console.log("   ✅ publisherId is NOT NULL (constraint applied)")
        }
      }
    } catch (error: any) {
      console.log("   ⚠️  Could not check constraint:", error.message)
    }

    // Check for null publisherId values
    console.log("\n4. Checking for credit requests with null publisherId...")
    try {
      const nullCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM "CreditRequest" 
        WHERE "publisherId" IS NULL
      `
      const count = Number(nullCount[0]?.count || 0)
      if (count > 0) {
        console.log(`   ⚠️  Found ${count} credit requests with null publisherId`)
        console.log("   💡 Run: npm run fix-credit-requests")
      } else {
        console.log("   ✅ No null publisherId values found")
      }
    } catch (error: any) {
      console.log("   ⚠️  Could not check null values:", error.message)
    }

    // Check enum values
    console.log("\n5. Checking CreditTransactionType enum...")
    try {
      const enumValues = await prisma.$queryRaw<Array<{ enum_value: string }>>`
        SELECT unnest(enum_range(NULL::"CreditTransactionType"))::text as enum_value
        ORDER BY enum_value
      `
      const values = enumValues.map(e => e.enum_value)
      const hasPublisherGrant = values.includes('PUBLISHER_GRANT')
      const hasFreePost = values.includes('FREE_POST')
      const hasAdminGrant = values.includes('ADMIN_GRANT')
      
      if (hasPublisherGrant && hasFreePost && !hasAdminGrant) {
        console.log("   ✅ Enum updated correctly (PUBLISHER_GRANT and FREE_POST exist, ADMIN_GRANT removed)")
      } else {
        console.log(`   ⚠️  Enum state: ${values.join(', ')}`)
        if (hasAdminGrant) {
          console.log("   ⚠️  ADMIN_GRANT still exists - enum not fully updated")
        }
        if (!hasPublisherGrant) {
          console.log("   ⚠️  PUBLISHER_GRANT missing - enum not updated")
        }
      }
    } catch (error: any) {
      console.log("   ⚠️  Could not check enum:", error.message)
    }

    console.log("\n" + "=".repeat(60))
    console.log("📋 Summary and Next Steps:")
    console.log("=".repeat(60))
    console.log("\nIf migration changes were NOT applied:")
    console.log("  1. npx prisma migrate resolve --rolled-back 20250101000000_restructure_business_model")
    console.log("  2. npm run fix-credit-requests")
    console.log("  3. npx prisma migrate deploy")
    console.log("\nIf migration changes WERE applied:")
    console.log("  1. npx prisma migrate resolve --applied 20250101000000_restructure_business_model")
    console.log("  2. npx prisma migrate deploy")
    console.log("")

  } catch (error) {
    console.error("❌ Error checking database state:", error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDatabaseState()

