"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"

type CreditsByOwner = {
  ownerId: string
  ownerName: string | null
  ownerUsername: string | null
  totalCredits: number
  remainingCredits: number
  groups: Array<{
    id: string
    name: string
    username: string | null
    pricePerPost: number
  }>
  transactions: Array<{
    id: string
    amount: number
    createdAt: string
    description: string | null
    relatedGroupId: string | null
  }>
}

export default function CreditsPage() {
  const { data: session, status } = useSession()
  const [creditsByOwner, setCreditsByOwner] = useState<CreditsByOwner[]>([])
  const [totalCredits, setTotalCredits] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user) {
      loadCredits()
    } else if (status === "unauthenticated") {
      setLoading(false)
    }
  }, [session, status])

  const loadCredits = async () => {
    setLoading(true)
    try {
      // Load credits by owner
      const creditsRes = await fetch("/api/credits/by-owner", { credentials: "include" })
      if (creditsRes.ok) {
        const creditsData = await creditsRes.json()
        setCreditsByOwner(creditsData.creditsByOwner || [])
      }

      // Load total credits
      const balanceRes = await fetch("/api/credits/balance", { credentials: "include" })
      if (balanceRes.ok) {
        const balanceData = await balanceRes.json()
        setTotalCredits(balanceData.credits || 0)
      }
    } catch (error) {
      console.error("Failed to load credits", error)
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl">⏳</div>
          <p className="text-gray-600">Loading credits...</p>
        </div>
      </div>
    )
  }

  if (!session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please sign in to view your credits</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Credits</h1>
        <p className="text-gray-600 mb-8">View your credits grouped by group owner</p>

        {/* Total Credits Card */}
        <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 mb-8 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Credits Balance</p>
              <p className="mt-2 text-4xl font-bold text-gray-900">{totalCredits.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Credits by Owner */}
        {creditsByOwner.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
            <div className="text-4xl mb-4">💳</div>
            <p className="text-sm font-medium text-gray-900">No credits from group owners yet</p>
            <p className="mt-1 text-xs text-gray-500">
              Request credits from group owners to start posting ads in their groups
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {creditsByOwner.map((ownerCredits) => (
              <div
                key={ownerCredits.ownerId}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {ownerCredits.ownerName || ownerCredits.ownerUsername || "Unknown Owner"}
                    </h3>
                    {ownerCredits.ownerUsername && (
                      <p className="text-sm text-gray-500">@{ownerCredits.ownerUsername}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Remaining Credits</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {ownerCredits.remainingCredits.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Total granted: {ownerCredits.totalCredits.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Groups */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Available Groups ({ownerCredits.groups.length}):
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {ownerCredits.groups.map((group) => (
                      <div
                        key={group.id}
                        className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{group.name}</p>
                            {group.username && (
                              <p className="text-xs text-gray-500">@{group.username}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-600">Price per post</p>
                            <p className="text-sm font-semibold text-blue-600">
                              {group.pricePerPost} credits
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Transactions */}
                {ownerCredits.transactions.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Recent Transactions:</p>
                    <div className="space-y-2">
                      {ownerCredits.transactions.slice(0, 5).map((transaction) => (
                        <div
                          key={transaction.id}
                          className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-2 text-sm"
                        >
                          <div>
                            <p className="text-gray-900">
                              {transaction.amount > 0 ? "+" : ""}
                              {transaction.amount} credits
                            </p>
                            {transaction.description && (
                              <p className="text-xs text-gray-500">{transaction.description}</p>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            {new Date(transaction.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

