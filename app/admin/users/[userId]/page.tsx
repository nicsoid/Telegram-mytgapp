import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import UserDetails from "@/components/admin/UserDetails"

export default async function UserDetailsPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const session = await auth()

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/auth/signin")
  }

  const { userId } = await params
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      groups: {
        select: {
          id: true,
          name: true,
          username: true,
          isVerified: true,
          isActive: true,
          pricePerPost: true,
        },
      },
      subscriptions: {
        orderBy: { createdAt: "desc" },
      },
      advertiserPosts: {
        include: {
          group: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
        orderBy: { scheduledAt: "desc" },
        take: 10,
      },
      creditTransactions: {
        orderBy: { createdAt: "desc" },
        take: 20,
        // Note: relatedGroupId is stored but no relation exists - would need to fetch separately if needed
      },
      _count: {
        select: {
          advertiserPosts: true,
          creditTransactions: true,
        },
      },
    },
  })

  if (!user) {
    redirect("/admin")
  }

  return <UserDetails user={user} />
}

