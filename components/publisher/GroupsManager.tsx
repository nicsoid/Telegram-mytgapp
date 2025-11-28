"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

type Group = {
  id: string
  telegramChatId: string
  name: string
  username: string | null
  description: string | null
  isVerified: boolean
  verifiedAt: string | null
  verificationCode: string | null
  pricePerPost: number
  freePostIntervalDays: number
  isActive: boolean
  totalPostsScheduled: number
  totalPostsSent: number
  totalRevenue: number
  createdAt: string
}

export default function GroupsManager() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    name: "",
    description: "",
    pricePerPost: "1",
    freePostIntervalDays: "7",
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [verificationCode, setVerificationCode] = useState<string | null>(null)

  useEffect(() => {
    fetchGroups()
  }, [])

  const fetchGroups = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/groups", { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setGroups(data.groups || [])
      }
    } catch (error) {
      console.error("Failed to fetch groups", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: formData.username,
          name: formData.name || undefined,
          description: formData.description || undefined,
          pricePerPost: parseInt(formData.pricePerPost),
          freePostIntervalDays: parseInt(formData.freePostIntervalDays),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to add group")
        return
      }

      setSuccess("Group added successfully!")
      setVerificationCode(data.verificationCode)
      setFormData({
        username: "",
        name: "",
        description: "",
        pricePerPost: "1",
        freePostIntervalDays: "7",
      })
      setShowAddForm(false)
      fetchGroups()
    } catch (error) {
      setError("An error occurred. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Manage Groups</h1>
        <p className="mt-2 text-sm text-gray-600">Add and manage your Telegram groups</p>
      </div>
      
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-800">{success}</p>
          {verificationCode && (
            <div className="mt-2 rounded bg-white p-3">
              <p className="text-sm font-semibold text-gray-900">Verification Code:</p>
              <p className="mt-1 font-mono text-lg font-bold text-blue-600 break-all">{verificationCode}</p>
              <p className="mt-2 text-xs text-gray-600">
                1. Add the bot to your group as admin<br />
                2. Send <code className="rounded bg-gray-100 px-1 py-0.5">/verify {verificationCode}</code> in the group
              </p>
            </div>
          )}
        </div>
      )}

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="mb-6 flex justify-end">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {showAddForm ? "Cancel" : "+ Add Group"}
          </button>
        </div>

        {showAddForm && (
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow">
            <h2 className="text-lg font-semibold text-gray-900">Add New Group</h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Group Username or Link *
                </label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  placeholder="@mygroup or https://t.me/mygroup"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter the group username (e.g., @mygroup) or link (e.g., https://t.me/mygroup). 
                  The group name and chat ID will be automatically fetched from Telegram.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Group Name (optional)
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  placeholder="Will be auto-filled from Telegram if available"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Leave empty to auto-fill from Telegram, or enter a custom name
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price per Post (credits)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.pricePerPost}
                    onChange={(e) => setFormData({ ...formData, pricePerPost: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Free Post Interval (days)</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    required
                    value={formData.freePostIntervalDays}
                    onChange={(e) => setFormData({ ...formData, freePostIntervalDays: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "Adding..." : "Add Group"}
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <p className="text-center text-gray-500">Loading groups...</p>
        ) : groups.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
            <p className="text-gray-500">No groups yet. Add your first group to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <div
                key={group.id}
                className="rounded-lg border border-gray-200 bg-white p-6 shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                      {group.isVerified ? (
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                          ✓ Verified
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                          ⚠ Not Verified
                        </span>
                      )}
                      {!group.isActive && (
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800">
                          Inactive
                        </span>
                      )}
                    </div>
                    {group.username && (
                      <p className="mt-1 text-sm text-gray-500">@{group.username}</p>
                    )}
                    {group.description && (
                      <p className="mt-2 text-sm text-gray-600">{group.description}</p>
                    )}
                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Price per post:</span>{" "}
                        <span className="font-semibold">{group.pricePerPost} credits</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Free post interval:</span>{" "}
                        <span className="font-semibold">{group.freePostIntervalDays} days</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Posts scheduled:</span>{" "}
                        <span className="font-semibold">{group.totalPostsScheduled}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Total revenue:</span>{" "}
                        <span className="font-semibold">{group.totalRevenue} credits</span>
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 flex flex-col gap-2">
                    <Link
                      href="/dashboard/groups"
                      className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      Manage
                    </Link>
                    {!group.isVerified && group.verificationCode && (
                      <div className="mt-2 rounded bg-gray-100 p-2 text-center max-w-[120px]">
                        <p className="text-xs text-gray-600">Code:</p>
                        <p className="font-mono text-xs font-bold break-all">{group.verificationCode}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}

