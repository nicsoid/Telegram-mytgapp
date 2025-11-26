import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function createAdmin() {
  const args = process.argv.slice(2)
  
  if (args.length < 2) {
    console.error("Usage: tsx scripts/create-admin.ts <telegramId> <telegramUsername> [email] [name]")
    console.error("Example: tsx scripts/create-admin.ts 123456789 @admin admin@example.com Admin User")
    process.exit(1)
  }

  const telegramId = args[0]
  const telegramUsername = args[1].startsWith("@") ? args[1].slice(1) : args[1]
  const email = args[2] || null
  const name = args[3] || "Admin"

  try {
    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { telegramId },
    })

    if (user) {
      // Update existing user to admin
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          role: "ADMIN",
          email: email || user.email,
          name: name || user.name,
          telegramUsername: telegramUsername || user.telegramUsername,
        },
      })
      console.log(`✅ Updated existing user to ADMIN:`)
    } else {
      // Create new admin user
      user = await prisma.user.create({
        data: {
          telegramId,
          telegramUsername,
          email,
          name,
          role: "ADMIN",
          telegramVerifiedAt: new Date(),
        },
      })
      console.log(`✅ Created new ADMIN user:`)
    }

    console.log(`   ID: ${user.id}`)
    console.log(`   Telegram ID: ${user.telegramId}`)
    console.log(`   Username: @${user.telegramUsername}`)
    console.log(`   Email: ${user.email || "N/A"}`)
    console.log(`   Name: ${user.name}`)
    console.log(`   Role: ${user.role}`)
    console.log(`\n📝 To sign in:`)
    console.log(`   1. Open Telegram`)
    console.log(`   2. Go to your bot or use Telegram Web App`)
    console.log(`   3. Sign in with your Telegram account (ID: ${telegramId})`)
    console.log(`   4. You'll be redirected to /admin`)
  } catch (error) {
    console.error("❌ Error creating admin:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()

