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
  advertiserMessage: string | null
  isActive: boolean
  totalPostsScheduled: number
  totalPostsSent: number
  totalRevenue: number
  stickyPostsEnabled: boolean
  stickyPostPrice: number | null
  stickyPostPeriodDays: number | null
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
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [editFormData, setEditFormData] = useState({
    pricePerPost: "",
    freePostIntervalDays: "",
    advertiserMessage: "",
    isActive: true,
    stickyPostsEnabled: false,
    stickyPostPrice: "",
    stickyPostPeriodDays: "",
  })

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

  const handleEditClick = (group: Group) => {
    setEditingGroup(group)
    setEditFormData({
      pricePerPost: group.pricePerPost.toString(),
      freePostIntervalDays: group.freePostIntervalDays.toString(),
      advertiserMessage: group.advertiserMessage || "",
      isActive: group.isActive,
      stickyPostsEnabled: group.stickyPostsEnabled || false,
      stickyPostPrice: group.stickyPostPrice?.toString() || "",
      stickyPostPeriodDays: group.stickyPostPeriodDays?.toString() || "",
    })
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingGroup) return

    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/groups/${editingGroup.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          pricePerPost: parseInt(editFormData.pricePerPost),
          freePostIntervalDays: parseInt(editFormData.freePostIntervalDays),
          advertiserMessage: editFormData.advertiserMessage || null,
          isActive: editFormData.isActive,
          stickyPostsEnabled: editFormData.stickyPostsEnabled,
          stickyPostPrice: editFormData.stickyPostPrice ? parseInt(editFormData.stickyPostPrice) : null,
          stickyPostPeriodDays: editFormData.stickyPostPeriodDays ? parseInt(editFormData.stickyPostPeriodDays) : null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to update group")
        return
      }

      setSuccess("Group updated successfully!")
      setEditingGroup(null)
      fetchGroups()
      setTimeout(() => setSuccess(null), 5000)
    } catch (error) {
      setError("An error occurred. Please try again.")
    } finally {
      setSubmitting(false)
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
                id={`group-${group.id}`}
                key={group.id}
                className="rounded-lg border border-gray-200 bg-white p-6 shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
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
                  <div className="flex flex-col gap-2 sm:ml-4 sm:flex-shrink-0">
                    <button
                      onClick={() => handleEditClick(group)}
                      className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 text-center"
                    >
                      Edit
                    </button>
                    {!group.isVerified && group.verificationCode && (
                      <div className="rounded bg-gray-100 p-2 text-center w-full sm:max-w-[120px]">
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

      {/* Edit Group Modal */}
      {editingGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-2xl rounded-lg border border-gray-200 bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Edit Group: {editingGroup.name}</h2>
              <button
                onClick={() => setEditingGroup(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price per Post (credits)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={editFormData.pricePerPost}
                  onChange={(e) => setEditFormData({ ...editFormData, pricePerPost: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Free Post Interval (days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  required
                  value={editFormData.freePostIntervalDays}
                  onChange={(e) => setEditFormData({ ...editFormData, freePostIntervalDays: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Days between free posts for group owner
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message for Advertisers
                </label>
                <textarea
                  value={editFormData.advertiserMessage}
                  onChange={(e) => setEditFormData({ ...editFormData, advertiserMessage: e.target.value })}
                  rows={4}
                  maxLength={1000}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  placeholder="Optional message shown to advertisers when selecting this group..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  {editFormData.advertiserMessage.length}/1000 characters
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={editFormData.isActive}
                  onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="ml-2 text-sm font-medium text-gray-700">
                  Group is active (allow posts)
                </label>
              </div>

              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Sticky Post Settings</h3>
                
                <div className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    id="stickyPostsEnabled"
                    checked={editFormData.stickyPostsEnabled}
                    onChange={(e) => setEditFormData({ ...editFormData, stickyPostsEnabled: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="stickyPostsEnabled" className="ml-2 text-sm font-medium text-gray-700">
                    Enable sticky posts for this group
                  </label>
                </div>

                {editFormData.stickyPostsEnabled && (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sticky Post Price (credits per day)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={editFormData.stickyPostPrice}
                        onChange={(e) => setEditFormData({ ...editFormData, stickyPostPrice: e.target.value })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                        placeholder="e.g., 5"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Price per day for sticky posts. Total cost = price × number of days.
                      </p>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Default Sticky Post Period (days)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={editFormData.stickyPostPeriodDays}
                        onChange={(e) => setEditFormData({ ...editFormData, stickyPostPeriodDays: e.target.value })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                        placeholder="e.g., 7"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Default period shown to users (they can request different periods).
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingGroup(null)}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

