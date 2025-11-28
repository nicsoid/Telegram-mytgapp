import { prisma } from "../lib/prisma"

async function fixCreditRequests() {
  console.log("🔧 Fixing credit requests with null publisherId...")

  try {
    // Use raw SQL since Prisma doesn't support null checks for required fields
    // Delete pending requests without publisherId
    const deletedPending = await prisma.$executeRaw`
      DELETE FROM "CreditRequest" 
      WHERE "publisherId" IS NULL AND "status" = 'PENDING'
    `
    console.log(`✅ Deleted ${deletedPending} pending requests without publisherId`)

    // Mark non-pending requests as rejected using raw SQL (for COALESCE)
    const updatedResult = await prisma.$executeRaw`
      UPDATE "CreditRequest" 
      SET 
        "status" = 'REJECTED',
        "notes" = COALESCE("notes", '') || ' [Auto-rejected: Admin credit granting removed]'
      WHERE "publisherId" IS NULL AND "status" != 'PENDING'
    `
    console.log(`✅ Updated ${updatedResult} non-pending requests to REJECTED`)

    // Delete any remaining null values
    const deletedRemaining = await prisma.$executeRaw`
      DELETE FROM "CreditRequest" 
      WHERE "publisherId" IS NULL
    `
    console.log(`✅ Deleted ${deletedRemaining} remaining requests without publisherId`)

    // Verify no null values remain using raw SQL
    const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM "CreditRequest" WHERE "publisherId" IS NULL
    `
    const nullCount = Number(result[0]?.count || 0)

    if (nullCount === 0) {
      console.log("✅ All credit requests fixed! No null publisherId values remaining.")
      console.log("🚀 You can now run: npx prisma migrate deploy")
    } else {
      console.log(`⚠️  Warning: ${nullCount} credit requests still have null publisherId`)
    }
  } catch (error) {
    console.error("❌ Error fixing credit requests:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

fixCreditRequests()

