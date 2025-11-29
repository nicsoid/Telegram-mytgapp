"use client"

import { useState, useEffect } from "react"

interface CreditRequestModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (amount: number, reason?: string, groupOwnerId?: string, groupId?: string) => Promise<void>
  currentCredits?: number
  preselectedGroupOwnerId?: string // Pre-select a group owner
  preselectedGroupId?: string // Pre-select a group
  allowUsernameInput?: boolean // Allow typing username instead of selecting from dropdown
}

export default function CreditRequestModal({
  isOpen,
  onClose,
  onSubmit,
  currentCredits = 0,
  preselectedGroupOwnerId,
  preselectedGroupId,
  allowUsernameInput = false,
}: CreditRequestModalProps) {
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [groupOwnerId, setGroupOwnerId] = useState(preselectedGroupOwnerId || "")
  const [groupId, setGroupId] = useState(preselectedGroupId || "")
  const [usernameInput, setUsernameInput] = useState("")
  const [searchingUser, setSearchingUser] = useState(false)
  const [groupOwners, setGroupOwners] = useState<any[]>([])
  const [loadingGroupOwners, setLoadingGroupOwners] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [useUsernameInput, setUseUsernameInput] = useState(allowUsernameInput)

  useEffect(() => {
    if (isOpen) {
      setAmount("")
      setReason("")
      setGroupOwnerId(preselectedGroupOwnerId || "")
      setGroupId(preselectedGroupId || "")
      setUsernameInput("")
      setError(null)
      if (!preselectedGroupOwnerId && !useUsernameInput) {
        fetchGroupOwners()
      }
    }
  }, [isOpen, preselectedGroupOwnerId, preselectedGroupId, useUsernameInput])

  const searchUserByUsername = async (username: string) => {
    if (!username.trim()) {
      setError("Please enter a username")
      return
    }

    setSearchingUser(true)
    setError(null)
    try {
      // Remove @ if present
      const cleanUsername = username.replace(/^@/, "")
      
      // Search for user by telegram username
      const res = await fetch(`/api/users/search?username=${encodeURIComponent(cleanUsername)}`, {
        credentials: "include",
      })
      
      if (res.ok) {
        const data = await res.json()
        if (data.user) {
          setGroupOwnerId(data.user.id)
          setError(null)
        } else {
          setError("User not found. Please check the username and try again.")
        }
      } else {
        const data = await res.json()
        setError(data.error || "Failed to find user")
      }
    } catch (error) {
      setError("Failed to search for user")
    } finally {
      setSearchingUser(false)
    }
  }

  const fetchGroupOwners = async () => {
    setLoadingGroupOwners(true)
    try {
      const res = await fetch("/api/groups/browse", { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        // Get unique group owners from groups (using user.id)
        const ownerMap = new Map()
        data.groups?.forEach((group: any) => {
          if (group.user?.id) {
            const ownerId = group.user.id
            if (!ownerMap.has(ownerId)) {
              ownerMap.set(ownerId, {
                id: ownerId,
                name: group.user?.name || group.user?.telegramUsername || "Unknown Owner",
                groups: [group],
              })
            } else {
              ownerMap.get(ownerId).groups.push(group)
            }
          }
        })
        setGroupOwners(Array.from(ownerMap.values()))
        // Auto-select first owner if available
        const owners = Array.from(ownerMap.values())
        if (owners.length > 0) {
          setGroupOwnerId(owners[0].id)
        }
      }
    } catch (error) {
      console.error("Failed to fetch group owners", error)
    } finally {
      setLoadingGroupOwners(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const amountNum = parseInt(amount)
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid credit amount")
      return
    }

    if (!groupOwnerId) {
      setError("Please select a group owner to request credits from")
      return
    }

    setSubmitting(true)
    try {
      await onSubmit(amountNum, reason.trim() || undefined, groupOwnerId, groupId || undefined)
      onClose()
    } catch (err: any) {
      setError(err.message || "Failed to submit credit request")
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Request Credits</h2>
            <p className="mt-1 text-sm text-gray-500">
              Request credits from a group owner to post ads in their groups
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Current Credits Display */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Current Balance</span>
            <span className="text-2xl font-bold text-blue-700">{currentCredits.toLocaleString()}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700">
                Group Owner <span className="text-red-500">*</span>
              </label>
              {!preselectedGroupOwnerId && (
                <button
                  type="button"
                  onClick={() => {
                    setUseUsernameInput(!useUsernameInput)
                    setGroupOwnerId("")
                    setGroupId("")
                    setUsernameInput("")
                    setError(null)
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  {useUsernameInput ? "Select from list" : "Search by username"}
                </button>
              )}
            </div>
            
            {preselectedGroupOwnerId ? (
              <div className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                Pre-selected for this group
              </div>
            ) : useUsernameInput ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="@username or username"
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    disabled={submitting || searchingUser}
                  />
                  <button
                    type="button"
                    onClick={() => searchUserByUsername(usernameInput)}
                    disabled={submitting || searchingUser || !usernameInput.trim()}
                    className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {searchingUser ? "Searching..." : "Search"}
                  </button>
                </div>
                {groupOwnerId && (
                  <div className="rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
                    ✓ User found and selected
                  </div>
                )}
              </div>
            ) : (
              <>
                {loadingGroupOwners ? (
                  <div className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-500">
                    Loading group owners...
                  </div>
                ) : groupOwners.length === 0 ? (
                  <div className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
                    No group owners available. Users need to add groups first.
                  </div>
                ) : (
                  <select
                    value={groupOwnerId}
                    onChange={(e) => {
                      setGroupOwnerId(e.target.value)
                      setGroupId("") // Reset group selection when owner changes
                      setError(null)
                    }}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    required
                    disabled={submitting}
                  >
                    <option value="">Select a group owner...</option>
                    {groupOwners.map((owner) => (
                      <option key={owner.id} value={owner.id}>
                        {owner.name} ({owner.groups.length} group{owner.groups.length !== 1 ? 's' : ''})
                      </option>
                    ))}
                  </select>
                )}
              </>
            )}
          </div>

          {groupOwnerId && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Group (Optional)
              </label>
              <select
                value={groupId}
                onChange={(e) => {
                  setGroupId(e.target.value)
                  setError(null)
                }}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                disabled={submitting}
              >
                <option value="">All groups</option>
                {groupOwners
                  .find((o) => o.id === groupOwnerId)
                  ?.groups.map((group: any) => (
                    <option key={group.id} value={group.id}>
                      {group.name} ({group.pricePerPost} credits/post)
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Credit Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value)
                  setError(null)
                }}
                placeholder="Enter amount"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                required
                disabled={submitting}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                credits
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Minimum: 1 credit
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Reason (Optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why you need these credits..."
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none"
              disabled={submitting}
            />
            <p className="mt-1 text-xs text-gray-500">
              {reason.length} / 500 characters
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !amount || parseInt(amount) <= 0}
              className="flex-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Submitting...
                </span>
              ) : (
                "Submit Request"
              )}
            </button>
          </div>
        </form>

        {/* Footer Info */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-2xl">
          <p className="text-xs text-gray-500 text-center">
            Your request will be reviewed by the group owner. You'll be notified once it's processed.
          </p>
        </div>
      </div>
    </div>
  )
}

