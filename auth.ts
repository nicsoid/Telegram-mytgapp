import NextAuth, { NextAuthConfig } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import Credentials from "next-auth/providers/credentials"
import { verifyTelegramWebAppData, parseTelegramInitData } from "@/lib/telegram"

const authConfig = {
  trustHost: true, // Trust the host header (required for reverse proxy setups)
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    Credentials({
      name: "Telegram",
      credentials: {
        initData: { label: "Telegram Init Data", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.initData) return null

        const botToken = process.env.TELEGRAM_BOT_TOKEN
        if (!botToken) return null

        // Check if this is a widget-verified token
        if ((credentials.initData as string).includes('hash=widget_verified')) {
          // Extract user data from widget token
          try {
            const urlParams = new URLSearchParams(credentials.initData as string)
            const userStr = urlParams.get('user')
            if (!userStr) return null

            const userData = JSON.parse(decodeURIComponent(userStr))
            
            // Find user by telegramId
            const user = await prisma.user.findUnique({
              where: { telegramId: userData.id.toString() },
            })

            if (!user) return null
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
              role: user.role,
              telegramId: user.telegramId,
              telegramUsername: user.telegramUsername,
              telegramVerifiedAt: user.telegramVerifiedAt,
            }
          } catch {
            return null
          }
        }

        // Verify Telegram WebApp init data
        if (!verifyTelegramWebAppData(credentials.initData as string, botToken)) {
          return null
        }

        // Parse user data
        const telegramUser = parseTelegramInitData(credentials.initData as string)
        if (!telegramUser) return null

        // Find or create user
        let user = await prisma.user.findUnique({
          where: { telegramId: telegramUser.id.toString() },
        })

        if (!user) {
          user = await prisma.user.create({
            data: {
              telegramId: telegramUser.id.toString(),
              telegramUsername: telegramUser.username || null,
              name: `${telegramUser.first_name} ${telegramUser.last_name || ''}`.trim() || null,
              image: telegramUser.photo_url || null,
              telegramVerifiedAt: new Date(),
              role: "USER",
            },
          })
        } else {
          // Update user info
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              telegramUsername: telegramUser.username || user.telegramUsername,
              name: `${telegramUser.first_name} ${telegramUser.last_name || ''}`.trim() || user.name,
              image: telegramUser.photo_url || user.image,
              telegramVerifiedAt: user.telegramVerifiedAt || new Date(),
            },
          })
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          telegramId: user.telegramId,
          telegramUsername: user.telegramUsername,
          telegramVerifiedAt: user.telegramVerifiedAt,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.telegramId = (user as any).telegramId
        token.telegramUsername = (user as any).telegramUsername
        token.telegramVerifiedAt = (user as any).telegramVerifiedAt
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id
        ;(session.user as any).role = token.role
        ;(session.user as any).telegramId = token.telegramId
        ;(session.user as any).telegramUsername = token.telegramUsername
        ;(session.user as any).telegramVerifiedAt = token.telegramVerifiedAt
      }
      return session
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
} satisfies NextAuthConfig

export const { auth, signIn, signOut, handlers } = NextAuth(authConfig)

