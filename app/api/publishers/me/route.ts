import { NextRequest, NextResponse } from "next/server"
import { requireActiveSubscription } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const guard = await requireActiveSubscription()
  if ("response" in guard) return guard.response

  // Defensive query - try with all fields, fallback if migration not applied
  let user: any
  try {
    user = await prisma.user.findUnique({
      where: { id: guard.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        telegramUsername: true,
        credits: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        subscriptionExpiresAt: true,
        telegramVerified: true,
        isVerified: true,
        totalEarnings: true,
        totalSpent: true,
        freePostsUsed: true,
        freePostsLimit: true,
        groups: {
          select: {
            id: true,
            name: true,
            isVerified: true,
            isActive: true,
            totalPostsScheduled: true,
            totalPostsSent: true,
            totalRevenue: true,
          },
        },
        subscriptions: {
          where: { status: "ACTIVE" },
          select: {
            id: true,
            tier: true,
            status: true,
          },
        },
        _count: {
          select: {
            groups: true,
            ownerPosts: true,
          },
        },
      },
    })
  } catch (error: any) {
    // If subscription columns don't exist yet, fetch without them
    if (error?.code === 'P2022' || error?.message?.includes('does not exist')) {
      console.warn('[publishers/me] Subscription columns not yet migrated, fetching without subscription fields')
      user = await prisma.user.findUnique({
        where: { id: guard.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          telegramUsername: true,
          credits: true,
          telegramVerified: true,
          isVerified: true,
          groups: {
            select: {
              id: true,
              name: true,
              isVerified: true,
              isActive: true,
              totalPostsScheduled: true,
              totalPostsSent: true,
              totalRevenue: true,
            },
          },
          subscriptions: {
            where: { status: "ACTIVE" },
            select: {
              id: true,
              tier: true,
              status: true,
            },
          },
          _count: {
            select: {
              groups: true,
              ownerPosts: true,
            },
          },
        },
      })
      // Add default values for subscription fields
      if (user) {
        user = {
          ...user,
          subscriptionTier: 'FREE',
          subscriptionStatus: 'ACTIVE',
          subscriptionExpiresAt: null,
          totalEarnings: 0,
          totalSpent: 0,
          freePostsUsed: 0,
          freePostsLimit: 3,
        }
      }
    } else {
      throw error
    }
  }

  return NextResponse.json({ user })
}

