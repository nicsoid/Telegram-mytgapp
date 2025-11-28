import { Telegraf } from "telegraf"
import { prisma } from "../lib/prisma"
import { isChatAdmin } from "../lib/telegram"

const botToken = process.env.TELEGRAM_BOT_TOKEN
if (!botToken) {
  throw new Error("TELEGRAM_BOT_TOKEN is not set")
}

const bot = new Telegraf(botToken)

// Verify group command
bot.command("verify", async (ctx) => {
  try {
    const chatId = ctx.chat.id.toString()
    const userId = ctx.from.id.toString()
    const code = ctx.message.text.split(" ")[1]

    if (!code) {
      await ctx.reply("Usage: /verify <code>\n\nGet the verification code from your MyTgApp dashboard.")
      return
    }

    // Find group by chat ID and verification code
    const group = await prisma.telegramGroup.findFirst({
      where: {
        telegramChatId: chatId,
        verificationCode: code.toUpperCase(),
      },
      include: {
        publisher: {
          include: {
            user: true,
          },
        },
      },
    })

    if (!group) {
      await ctx.reply("❌ Group not found or invalid verification code.\n\nMake sure you:\n1. Added the bot to the group as admin\n2. Used the correct verification code from your dashboard")
      return
    }

    // Verify user is the publisher
    if (group.publisher.user.telegramId !== userId) {
      await ctx.reply("❌ You are not the owner of this group in MyTgApp.\n\nOnly the publisher who added this group can verify it.")
      return
    }

    // Verify user is admin in the group
    const userIsAdmin = await isChatAdmin(chatId, userId)
    if (!userIsAdmin) {
      await ctx.reply("❌ You must be an admin in this group to verify it.\n\nMake sure you have admin privileges in this group.")
      return
    }

    // Verify bot is admin
    const botIsAdmin = await isChatAdmin(chatId, botToken.split(":")[0]) // Bot user ID from token
    if (!botIsAdmin) {
      await ctx.reply("❌ The bot must be an admin in this group.\n\nPlease add the bot as an admin and try again.")
      return
    }

    // Update group as verified
    await prisma.telegramGroup.update({
      where: { id: group.id },
      data: {
        isVerified: true,
        verifiedByBot: true,
        verifiedAt: new Date(),
        verificationCode: null, // Clear code after verification
      },
    })

    await ctx.reply(
      `✅ Group verified successfully!\n\n` +
      `Group: ${group.name}\n` +
      `You can now manage this group in your MyTgApp dashboard.`
    )
  } catch (error) {
    console.error("Verify command error:", error)
    await ctx.reply("❌ An error occurred while verifying the group. Please try again later.")
  }
})

// Start command
bot.command("start", async (ctx) => {
  try {
    const code = ctx.startPayload?.trim()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mytgapp.com"

    await ctx.reply(
      "👋 Welcome to MyTgApp Bot!\n\n" +
        "This bot helps you verify your Telegram identity and manage your groups.\n\n" +
        "To verify a group:\n" +
        "1. Add this bot to your group as admin\n" +
        "2. Get the verification code from your dashboard\n" +
        "3. Send /verify <code> in the group\n\n" +
        `Visit ${appUrl} to get started!`
    )

    if (code) {
      const verificationCode = code.toUpperCase()
      const user = await prisma.user.findFirst({
        where: { telegramVerificationCode: verificationCode },
        select: {
          id: true,
          telegramVerificationExpires: true,
          telegramVerificationTelegramId: true,
        },
      })

      if (
        !user ||
        !user.telegramVerificationExpires ||
        user.telegramVerificationExpires.getTime() < Date.now()
      ) {
        await ctx.reply("⚠️ Verification code is invalid or expired. Generate a new one in the MyTgApp dashboard.")
        return
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          telegramVerificationTelegramId: ctx.from?.id ? String(ctx.from.id) : null,
          telegramVerificationTelegramUsername: ctx.from?.username ?? null,
          telegramId:
            user.telegramVerificationTelegramId == null && ctx.from?.id
              ? String(ctx.from.id)
              : undefined,
        },
      })

      await ctx.reply(
        "✅ Telegram account detected!\n\nReturn to MyTgApp and press “Confirm verification” to finish linking your account."
      )
    }
  } catch (error) {
    console.error("Start command error:", error)
    await ctx.reply("❌ Something went wrong. Please try again later.")
  }
})

// Help command
bot.command("help", async (ctx) => {
  await ctx.reply(
    "📖 MyTgApp Bot Commands:\n\n" +
    "/start - Get started with MyTgApp\n" +
    "/verify <code> - Verify a group (get code from dashboard)\n" +
    "/help - Show this help message\n\n" +
    "For more information, visit https://mytgapp.com"
  )
})

// Error handling
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err)
})

// Start bot
console.log("🤖 Starting Telegram bot...")
bot.launch().then(() => {
  console.log("✅ Telegram bot is running!")
})

// Graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"))
process.once("SIGTERM", () => bot.stop("SIGTERM"))

