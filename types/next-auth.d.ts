import { UserRole } from "@prisma/client"
import "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email?: string | null
      name?: string | null
      image?: string | null
      role: UserRole
      telegramId?: string | null
      telegramUsername?: string | null
      telegramVerifiedAt?: string | null
    }
  }

  interface User {
    id: string
    email?: string | null
    name?: string | null
    image?: string | null
    role: UserRole
    telegramId?: string | null
    telegramUsername?: string | null
    telegramVerifiedAt?: Date | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: UserRole
    telegramId?: string | null
    telegramUsername?: string | null
    telegramVerifiedAt?: string | null
  }
}

