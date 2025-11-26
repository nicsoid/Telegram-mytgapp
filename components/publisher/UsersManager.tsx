"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

type ManagedUser = {
  id: string
  userId: string
  creditsAdded: number
  notes: string | null
  user: {
    id: string
    name: string | null
    email: string | null
    telegramUsername: string | null
    credits: number
  }
}

export default function UsersManager() {
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [grantingCredits, setGrantingCredits] = useState<string | null>(null)
  const [grantAmount, setGrantAmount] = useState("")
  const [grantNotes, setGrantNotes] = useState("")

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/publishers/me/users", { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error("Failed to fetch users", error)
    } finally {
      setLoading(false)
    }
  }

  const handleGrantCredits = async (userId: string) => {
    if (!grantAmount || isNaN(parseInt(grantAmount))) {
      alert("Please enter a valid credit amount")
      return
    }

    setGrantingCredits(userId)
    try {
      const res = await fetch(`/api/publishers/me/users/${userId}/credits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amount: parseInt(grantAmount),
          notes: grantNotes || undefined,
        }),
      })

      if (res.ok) {
        setGrantAmount("")
        setGrantNotes("")
        setGrantingCredits(null)
        fetchUsers()
        alert("Credits granted successfully")
      } else {
        const data = await res.json()
        alert(data.error || "Failed to grant credits")
      }
    } catch (error) {
      alert("An error occurred")
    } finally {
      setGrantingCredits(null)
    }
  }

  const handleRemoveUser = async (userId: string) => {
    if (!confirm("Remove this user from your managed list?")) return

    try {
      const res = await fetch(`/api/publishers/me/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (res.ok) {
        fetchUsers()
      }
    } catch (error) {
      console.error("Failed to remove user", error)
    }
  }

  const filteredUsers = users.filter((mu) => {
    const query = searchQuery.toLowerCase()
    return (
      mu.user.name?.toLowerCase().includes(query) ||
      mu.user.email?.toLowerCase().includes(query) ||
      mu.user.telegramUsername?.toLowerCase().includes(query)
    )
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Manage Users</h1>
              <p className="mt-2 text-sm text-gray-600">
                Grant credits to users who post in your groups
              </p>
            </div>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          />
        </div>

        {loading ? (
          <p className="text-center text-gray-500">Loading users...</p>
        ) : filteredUsers.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
            <p className="text-gray-500">
              {searchQuery ? "No users found" : "No managed users yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredUsers.map((mu) => (
              <div
                key={mu.id}
                className="rounded-lg border border-gray-200 bg-white p-6 shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">
                      {mu.user.name || mu.user.telegramUsername || "Unknown User"}
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      {mu.user.email || mu.user.telegramUsername || mu.user.id}
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Credits:</span>{" "}
                        <span className="font-semibold">{mu.user.credits}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Credits Added:</span>{" "}
                        <span className="font-semibold">{mu.creditsAdded}</span>
                      </div>
                      {mu.notes && (
                        <div>
                          <span className="text-gray-500">Notes:</span>{" "}
                          <span className="font-semibold">{mu.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        placeholder="Amount"
                        value={grantingCredits === mu.user.id ? grantAmount : ""}
                        onChange={(e) => setGrantAmount(e.target.value)}
                        className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                        disabled={grantingCredits !== mu.user.id}
                      />
                      <button
                        onClick={() => {
                          if (grantingCredits === mu.user.id) {
                            handleGrantCredits(mu.user.id)
                          } else {
                            setGrantingCredits(mu.user.id)
                            setGrantAmount("")
                            setGrantNotes("")
                          }
                        }}
                        disabled={grantingCredits === mu.user.id && !grantAmount}
                        className="rounded bg-blue-600 px-3 py-1 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {grantingCredits === mu.user.id ? "Grant" : "Grant Credits"}
                      </button>
                    </div>
                    {grantingCredits === mu.user.id && (
                      <input
                        type="text"
                        placeholder="Notes (optional)"
                        value={grantNotes}
                        onChange={(e) => setGrantNotes(e.target.value)}
                        className="rounded border border-gray-300 px-2 py-1 text-sm"
                      />
                    )}
                    <button
                      onClick={() => handleRemoveUser(mu.user.id)}
                      className="rounded bg-red-600 px-3 py-1 text-sm font-semibold text-white hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

