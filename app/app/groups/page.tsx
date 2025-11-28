"use client"

import { useSession } from "next-auth/react"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

type TelegramGroup = {
  id: string
  name: string
  telegramChatId: string
  username: string | null
  description: string | null
  pricePerPost: number
  freePostIntervalDays: number
  isVerified: boolean
  verificationCode: string | null
  createdAt: string
}

const initialForm = {
  name: "",
  username: "",
  description: "",
  pricePerPost: 10,
  freePostIntervalDays: 7,
}

export default function GroupsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [groups, setGroups] = useState<TelegramGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null)
  const [verificationError, setVerificationError] = useState<string | null>(null)
  const [verification, setVerification] = useState<{
    loading: boolean
    verifiedAt: string | null
    code: string | null
    expiresAt: string | null
    botUsername: string | null
    deepLink: string | null
  }>({
    loading: true,
    verifiedAt: session?.user?.telegramVerifiedAt ?? null,
    code: null,
    expiresAt: null,
    botUsername: null,
    deepLink: null,
  })
  const [form, setForm] = useState(initialForm)

  useEffect(() => {
    if (session?.user) {
      loadGroups()
      loadVerificationStatus()
    }
  }, [session])

  const canManageGroups = useMemo(() => Boolean(verification.verifiedAt), [verification.verifiedAt])
  const verifiedCount = useMemo(() => groups.filter((g) => g.isVerified).length, [groups])

  const loadGroups = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/groups", { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setGroups(data.groups || [])
      }
    } finally {
      setLoading(false)
    }
  }

  const loadVerificationStatus = async () => {
    try {
      setVerification((prev) => ({ ...prev, loading: true }))
      const res = await fetch("/api/profile/telegram/status", { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setVerification({
          loading: false,
          verifiedAt: data.verifiedAt,
          code: data.code,
          expiresAt: data.expiresAt,
          botUsername: data.botUsername,
          deepLink: data.deepLink,
        })
      } else {
        setVerification((prev) => ({ ...prev, loading: false }))
      }
    } catch {
      setVerification((prev) => ({ ...prev, loading: false }))
    }
  }

  const handleGenerateCode = async () => {
    setVerificationMessage(null)
    setVerificationError(null)
    try {
      const res = await fetch("/api/profile/telegram/start", {
        method: "POST",
        credentials: "include",
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate code")
      }
      setVerification({
        loading: false,
        verifiedAt: null,
        code: data.code,
        expiresAt: data.expiresAt,
        botUsername: data.botUsername,
        deepLink: data.deepLink,
      })
      setVerificationMessage("Code generated. Open Telegram and send the code to the bot, then confirm below.")
    } catch (error: any) {
      setVerificationError(error.message || "Failed to generate code")
    }
  }

  const handleConfirmVerification = async () => {
    if (!verification.code) {
      setVerificationError("Generate a code first.")
      return
    }
    setVerificationMessage(null)
    setVerificationError(null)
    try {
      const res = await fetch("/api/profile/telegram/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: verification.code }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Verification failed")
      }
      setVerification({
        loading: false,
        verifiedAt: data.verifiedAt,
        code: null,
        expiresAt: null,
        botUsername: verification.botUsername,
        deepLink: null,
      })
      setVerificationMessage("Telegram account verified successfully.")
      router.refresh()
      loadGroups()
    } catch (error: any) {
      setVerificationError(error.message || "Failed to confirm verification")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canManageGroups) {
      setMessage("Verify your Telegram account before adding groups.")
      return
    }
    setSubmitting(true)
    setMessage(null)
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: form.name.trim(),
          username: form.username.trim() || undefined,
          description: form.description.trim() || undefined,
          pricePerPost: Number(form.pricePerPost),
          freePostIntervalDays: Number(form.freePostIntervalDays),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setForm(initialForm)
        setMessage(
          data.message ||
            "Group added successfully. Add the bot to your group and send the verification command."
        )
        loadGroups()
      } else {
        setMessage(data.error || "Failed to add group")
      }
    } catch (error) {
      setMessage("An error occurred while saving the group.")
    } finally {
      setSubmitting(false)
    }
  }

  if (!session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-600">
        Please sign in to manage your groups.
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Telegram Groups</h1>
          <p className="mt-2 text-gray-600">Manage your groups and track verification status</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="rounded-lg bg-gradient-to-br from-purple-50 to-indigo-50 px-4 py-2">
            <div className="text-xs font-medium text-gray-500">Verified</div>
            <div className="text-lg font-bold text-purple-700">
              {verifiedCount} / {groups.length}
            </div>
          </div>
          <button
            onClick={loadGroups}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50"
          >
            🔄 Refresh
          </button>
        </div>
      </div>
      {/* Telegram Verification Section */}
      <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Telegram identity
                </p>
                <h2 className="text-xl font-semibold text-gray-900">
                  {verification.verifiedAt ? "Verified" : "Verification required"}
                </h2>
                <p className="text-sm text-gray-500">
                  {verification.verifiedAt
                    ? `Verified on ${new Date(verification.verifiedAt).toLocaleString()}`
                    : "Verify your Telegram account to add or manage groups."}
                </p>
              </div>
              {verification.verifiedAt && (
                <div className="flex items-center space-x-2 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 px-4 py-2">
                  <span className="text-green-600">✓</span>
                  <span className="text-sm font-semibold text-green-800">Verified</span>
                </div>
              )}
            </div>
            {verificationMessage && (
              <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">{verificationMessage}</div>
            )}
            {verificationError && (
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{verificationError}</div>
            )}
            {!verification.verifiedAt && (
              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-900">Step 1: Generate code</p>
                  <p className="text-sm text-gray-500">
                    Generate a one-time code and open Telegram to send it to the bot.
                  </p>
                  <button
                    onClick={handleGenerateCode}
                    className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg disabled:opacity-60"
                    disabled={verification.loading}
                  >
                    {verification.loading ? "Generating..." : "Generate Code"}
                  </button>
                  {verification.code && (
                    <div className="rounded-xl border-2 border-dashed border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 text-center">
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Verification Code</p>
                      <p className="mt-3 text-4xl font-mono font-bold text-gray-900 tracking-wider">
                        {verification.code}
                      </p>
                      {verification.expiresAt && (
                        <p className="mt-3 text-xs text-gray-600">
                          ⏰ Expires {new Date(verification.expiresAt).toLocaleTimeString()}
                        </p>
                      )}
                      {verification.deepLink && (
                        <a
                          href={verification.deepLink}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-4 inline-flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md"
                        >
                          <span>📱</span>
                          <span>Open Telegram Bot</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-900">Step 2: Confirm</p>
                  <p className="text-sm text-gray-500">
                    After sending the code to the bot, click confirm to complete verification.
                  </p>
                  <button
                    onClick={handleConfirmVerification}
                    className="w-full rounded-lg border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-3 text-sm font-semibold text-green-700 transition-all hover:from-green-100 hover:to-emerald-100 hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={!verification.code}
                  >
                    ✓ Confirm Verification
                  </button>
                </div>
              </div>
            )}
          </section>

      <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
        {/* Groups List */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Your Groups</h2>
              <p className="mt-1 text-sm text-gray-500">
                {verifiedCount} verified of {groups.length} total
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-400">Loading groups…</div>
              </div>
            ) : groups.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
                <div className="text-4xl mb-4">👥</div>
                <p className="text-sm font-medium text-gray-900">No groups yet</p>
                <p className="mt-1 text-xs text-gray-500">Add your first group using the form</p>
              </div>
            ) : (
              groups.map((group) => (
                <div
                  key={group.id}
                  className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 text-white font-bold">
                          {group.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                          <p className="text-sm text-gray-500">
                            {group.username ? `@${group.username}` : group.telegramChatId}
                          </p>
                        </div>
                      </div>
                      {group.description && (
                        <p className="mt-3 text-sm text-gray-600 line-clamp-2">{group.description}</p>
                      )}
                      <div className="mt-4 flex flex-wrap items-center gap-4">
                        <div className="flex items-center space-x-1 text-sm text-gray-600">
                          <span>💶</span>
                          <span className="font-medium">€{group.pricePerPost}</span>
                          <span className="text-gray-400">/ post</span>
                        </div>
                        <div className="flex items-center space-x-1 text-sm text-gray-600">
                          <span>🆓</span>
                          <span>Free every {group.freePostIntervalDays} days</span>
                        </div>
                      </div>
                      {group.isVerified && group.telegramChatId && (
                        <div className="mt-4 rounded-lg bg-green-50 border border-green-200 p-3">
                          <p className="text-xs font-medium text-green-800">Chat ID (auto-detected)</p>
                          <p className="mt-1 text-xs text-green-700 font-mono break-all">
                            {group.telegramChatId}
                          </p>
                        </div>
                      )}
                      {!group.isVerified && group.verificationCode && (
                        <div className="mt-4 rounded-lg bg-yellow-50 border border-yellow-200 p-3">
                          <p className="text-xs font-medium text-yellow-800">Verification Required</p>
                          <p className="mt-1 text-xs text-yellow-700">
                            Add the bot to your group as admin, then send:
                          </p>
                          <p className="mt-1 text-xs text-yellow-800 font-mono bg-yellow-100 px-2 py-1 rounded">
                            /verify {group.verificationCode}
                          </p>
                          <p className="mt-2 text-xs text-yellow-700">
                            The chat ID will be automatically detected during verification.
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                          group.isVerified
                            ? "bg-gradient-to-r from-green-100 to-emerald-100 text-green-800"
                            : "bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800"
                        }`}
                      >
                        {group.isVerified ? "✓ Verified" : "⏳ Pending"}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Add Group Form */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">Add New Group</h2>
            <p className="mt-1 text-sm text-gray-500">
              {canManageGroups
                ? "Add the bot to your group as admin, then verify. Chat ID will be auto-detected."
                : "Verify your Telegram account first"}
            </p>
          </div>

          {message && (
            <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Group Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50 disabled:cursor-not-allowed"
                    placeholder="My Awesome Group"
                    disabled={!canManageGroups}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Username <span className="text-gray-500 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50 disabled:cursor-not-allowed"
                    placeholder="@channel_username (for public groups)"
                    disabled={!canManageGroups}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Leave empty for private groups. Chat ID will be automatically detected when you verify the group.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Description <span className="text-gray-500 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="channel_username"
                    disabled={!canManageGroups}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Description (optional)</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50 disabled:cursor-not-allowed resize-none"
                    rows={3}
                    placeholder="Brief description of your group..."
                    disabled={!canManageGroups}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Price per Post (€)</label>
                    <input
                      type="number"
                      min={0}
                      value={form.pricePerPost}
                      onChange={(e) => setForm((prev) => ({ ...prev, pricePerPost: Number(e.target.value) }))}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50 disabled:cursor-not-allowed"
                      disabled={!canManageGroups}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Free Post Interval (days)</label>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={form.freePostIntervalDays}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, freePostIntervalDays: Number(e.target.value) }))
                      }
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50 disabled:cursor-not-allowed"
                      disabled={!canManageGroups}
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submitting || !canManageGroups}
                  className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? "⏳ Adding..." : canManageGroups ? "➕ Add Group" : "🔒 Verify Telegram First"}
                </button>
          </form>
        </section>
      </div>
    </div>
  )
}

