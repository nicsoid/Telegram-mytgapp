import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function requireAdminSession() {
  const session = await auth()
  
  if (!session?.user) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }

  if (session.user.role !== "ADMIN") {
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    }
  }

  return { session }
}

export async function requirePublisherSession() {
  const session = await auth()
  
  if (!session?.user) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }

  if (session.user.role !== "PUBLISHER") {
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    }
  }

  // Get publisher profile
  const publisher = await prisma.publisher.findUnique({
    where: { userId: session.user.id },
  })

  if (!publisher) {
    return {
      response: NextResponse.json({ error: "Publisher profile not found" }, { status: 404 }),
    }
  }

  return { session, publisher }
}

