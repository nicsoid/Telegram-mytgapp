"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"

type Customer = {
  userId: string
  userName: string | null
  userTelegramUsername: string | null
  totalCreditsGranted: number
  totalCreditsSpent: number
  remainingCredits: number
  groups: Array<{
    id: string
    name: string
    username: string | null
    pricePerPost: number
  }>
}

export default function CustomersPage() {
  const { data: session, status } = useSession()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [grantingCredits, setGrantingCredits] = useState<string | null>(null)
  const [grantAmount, setGrantAmount] = useState("")
  const [grantNotes, setGrantNotes] = useState("")
  const [deductingCredits, setDeductingCredits] = useState<string | null>(null)
  const [deductAmount, setDeductAmount] = useState("")
  const [deductNotes, setDeductNotes] = useState("")
  const [showGrantModal, setShowGrantModal] = useState(false)
  const [showDeductModal, setShowDeductModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [searchUsername, setSearchUsername] = useState("")
  const [searching, setSearching] = useState(false)
  const [foundUser, setFoundUser] = useState<any>(null)

  useEffect(() => {
    if (session?.user) {
      loadCustomers()
    } else if (status === "unauthenticated") {
      setLoading(false)
    }
  }, [session, status])

  const loadCustomers = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/credits/customers", { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setCustomers(data.customers || [])
      }
    } catch (error) {
      console.error("Failed to load customers", error)
    } finally {
      setLoading(false)
    }
  }

  const searchUserByUsername = async () => {
    if (!searchUsername.trim()) {
      alert("Please enter a Telegram username")
      return
    }

    setSearching(true)
    try {
      const username = searchUsername.trim().replace(/^@/, "")
      const res = await fetch(`/api/users/search?username=${encodeURIComponent(username)}`, {
        credentials: "include",
      })
      if (res.ok) {
        const data = await res.json()
        if (data.user) {
          setFoundUser(data.user)
        } else {
          alert("User not found")
          setFoundUser(null)
        }
      } else {
        alert("Failed to search user")
      }
    } catch (error) {
      console.error("Failed to search user", error)
      alert("An error occurred")
    } finally {
      setSearching(false)
    }
  }

  const handleGrantCredits = async (userId: string) => {
    if (!grantAmount || isNaN(parseInt(grantAmount)) || parseInt(grantAmount) <= 0) {
      alert("Please enter a valid credit amount")
      return
    }

    setGrantingCredits(userId)
    try {
      const res = await fetch(`/api/credits/grant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId,
          amount: parseInt(grantAmount),
          notes: grantNotes || undefined,
        }),
      })

      if (res.ok) {
        setGrantAmount("")
        setGrantNotes("")
        setShowGrantModal(false)
        setSelectedCustomer(null)
        loadCustomers()
        alert("Credits granted successfully")
      } else {
        const data = await res.json()
        alert(data.error || "Failed to grant credits")
      }
    } catch (error) {
      console.error("Failed to grant credits", error)
      alert("An error occurred")
    } finally {
      setGrantingCredits(null)
    }
  }

  const handleDeductCredits = async (userId: string) => {
    if (!deductAmount || isNaN(parseInt(deductAmount)) || parseInt(deductAmount) <= 0) {
      alert("Please enter a valid credit amount")
      return
    }

    setDeductingCredits(userId)
    try {
      const res = await fetch(`/api/credits/deduct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId,
          amount: parseInt(deductAmount),
          notes: deductNotes || undefined,
        }),
      })

      if (res.ok) {
        setDeductAmount("")
        setDeductNotes("")
        setShowDeductModal(false)
        setSelectedCustomer(null)
        loadCustomers()
        alert("Credits deducted successfully")
      } else {
        const data = await res.json()
        alert(data.error || "Failed to deduct credits")
      }
    } catch (error) {
      console.error("Failed to deduct credits", error)
      alert("An error occurred")
    } finally {
      setDeductingCredits(null)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl">⏳</div>
          <p className="text-gray-600">Loading customers...</p>
        </div>
      </div>
    )
  }

  if (!session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please sign in to view your customers</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Customers</h1>
            <p className="text-gray-600">Manage users who have credits from you</p>
          </div>
        </div>

        {/* Grant Credits by Username */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Grant Credits by Telegram Username</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={searchUsername}
              onChange={(e) => setSearchUsername(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  searchUserByUsername()
                }
              }}
              placeholder="@username"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
            <button
              onClick={searchUserByUsername}
              disabled={searching}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {searching ? "Searching..." : "Search"}
            </button>
          </div>
          {foundUser && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {foundUser.name || foundUser.telegramUsername || "Unknown"}
                  </p>
                  {foundUser.telegramUsername && (
                    <p className="text-sm text-gray-600">@{foundUser.telegramUsername}</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelectedCustomer({
                      userId: foundUser.id,
                      userName: foundUser.name,
                      userTelegramUsername: foundUser.telegramUsername,
                      totalCreditsGranted: 0,
                      totalCreditsSpent: 0,
                      remainingCredits: foundUser.credits || 0,
                      groups: [],
                    })
                    setShowGrantModal(true)
                  }}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Grant Credits
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Customers List */}
        {customers.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
            <div className="text-4xl mb-4">👥</div>
            <p className="text-sm font-medium text-gray-900">No customers yet</p>
            <p className="mt-1 text-xs text-gray-500">
              Users who receive credits from you will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {customers.map((customer) => (
              <div
                key={customer.userId}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {customer.userName || customer.userTelegramUsername || "Unknown User"}
                    </h3>
                    {customer.userTelegramUsername && (
                      <p className="text-sm text-gray-500">@{customer.userTelegramUsername}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Remaining Credits</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {customer.remainingCredits.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Granted: {customer.totalCreditsGranted.toLocaleString()} | Spent:{" "}
                      {customer.totalCreditsSpent.toLocaleString()}
                    </p>
                  </div>
                </div>

                {customer.groups.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Available Groups ({customer.groups.length}):
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {customer.groups.map((group) => (
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
                )}

                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={() => {
                      setSelectedCustomer(customer)
                      setShowGrantModal(true)
                    }}
                    className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 transition-colors"
                  >
                    Add Credits
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCustomer(customer)
                      setShowDeductModal(true)
                    }}
                    className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 transition-colors"
                  >
                    Deduct Credits
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Grant Credits Modal */}
        {showGrantModal && selectedCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-xl">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Grant Credits</h2>
              <p className="text-sm text-gray-600 mb-4">
                User: {selectedCustomer.userName || selectedCustomer.userTelegramUsername || "Unknown"}
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={grantAmount}
                    onChange={(e) => setGrantAmount(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    placeholder="Enter credit amount"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (optional)
                  </label>
                  <textarea
                    value={grantNotes}
                    onChange={(e) => setGrantNotes(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    placeholder="Add notes..."
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowGrantModal(false)
                      setSelectedCustomer(null)
                      setGrantAmount("")
                      setGrantNotes("")
                    }}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleGrantCredits(selectedCustomer.userId)}
                    disabled={grantingCredits === selectedCustomer.userId}
                    className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
                  >
                    {grantingCredits === selectedCustomer.userId ? "Granting..." : "Grant Credits"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Deduct Credits Modal */}
        {showDeductModal && selectedCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-xl">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Deduct Credits</h2>
              <p className="text-sm text-gray-600 mb-4">
                User: {selectedCustomer.userName || selectedCustomer.userTelegramUsername || "Unknown"}
                <br />
                Current balance: {selectedCustomer.remainingCredits} credits
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedCustomer.remainingCredits}
                    value={deductAmount}
                    onChange={(e) => setDeductAmount(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    placeholder="Enter credit amount"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (optional)
                  </label>
                  <textarea
                    value={deductNotes}
                    onChange={(e) => setDeductNotes(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    placeholder="Add notes..."
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowDeductModal(false)
                      setSelectedCustomer(null)
                      setDeductAmount("")
                      setDeductNotes("")
                    }}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeductCredits(selectedCustomer.userId)}
                    disabled={deductingCredits === selectedCustomer.userId}
                    className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
                  >
                    {deductingCredits === selectedCustomer.userId ? "Deducting..." : "Deduct Credits"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

