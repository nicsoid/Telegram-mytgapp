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
  telegramChatId: "",
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
          telegramChatId: form.telegramChatId.trim(),
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs text-gray-500">MyTgApp</p>
            <h1 className="text-3xl font-semibold text-gray-900">My Telegram Groups</h1>
            <p className="text-sm text-gray-500">Add new groups and track verification status.</p>
          </div>
          <Link
            href="/app"
            className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            ← Back to overview
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
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
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                  Verified
                </span>
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
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                    disabled={verification.loading}
                  >
                    Generate code
                  </button>
                  {verification.code && (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-center">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Verification code</p>
                      <p className="mt-1 text-3xl font-mono font-semibold text-gray-900">
                        {verification.code}
                      </p>
                      {verification.expiresAt && (
                        <p className="mt-2 text-xs text-gray-500">
                          Expires {new Date(verification.expiresAt).toLocaleTimeString()}
                        </p>
                      )}
                      {verification.deepLink && (
                        <a
                          href={verification.deepLink}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex items-center justify-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800"
                        >
                          Open Telegram bot
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
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-60"
                    disabled={!verification.code}
                  >
                    Confirm verification
                  </button>
                </div>
              </div>
            )}
          </section>

          <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Active Groups</h2>
                  <p className="text-sm text-gray-500">
                    {verifiedCount} / {groups.length} verified
                  </p>
                </div>
                <button
                  onClick={loadGroups}
                  className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
                >
                  Refresh
                </button>
              </div>

              <div className="mt-6 space-y-4">
                {loading ? (
                  <p className="text-sm text-gray-500">Loading groups…</p>
                ) : groups.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No groups yet. Add your first group using the form.
                  </p>
                ) : (
                  groups.map((group) => (
                    <div
                      key={group.id}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold text-gray-900">{group.name}</p>
                          <p className="text-sm text-gray-500">
                            {group.username ? `@${group.username}` : group.telegramChatId}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            group.isVerified
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {group.isVerified ? "Verified" : "Pending"}
                        </span>
                      </div>
                      {group.description && (
                        <p className="mt-3 text-sm text-gray-600">{group.description}</p>
                      )}
                      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <span>€{group.pricePerPost} / post</span>
                        <span>Free interval: {group.freePostIntervalDays} days</span>
                        {!group.isVerified && group.verificationCode && (
                          <span className="font-medium text-blue-600">
                            Verification code: /verify {group.verificationCode}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Add a new group</h2>
              <p className="text-sm text-gray-500">
                {canManageGroups
                  ? "You must verify the group ownership via the Telegram bot."
                  : "Verify your Telegram account to unlock group management."}
              </p>

              {message && (
                <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">{message}</div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Group Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    disabled={!canManageGroups}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Telegram Chat ID</label>
                  <input
                    type="text"
                    value={form.telegramChatId}
                    onChange={(e) => setForm((prev) => ({ ...prev, telegramChatId: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="-1001234567890"
                    disabled={!canManageGroups}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Username (optional)</label>
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
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    rows={3}
                    disabled={!canManageGroups}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Price per Post (€)</label>
                    <input
                      type="number"
                      min={0}
                      value={form.pricePerPost}
                      onChange={(e) => setForm((prev) => ({ ...prev, pricePerPost: Number(e.target.value) }))}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      disabled={!canManageGroups}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Free Post Interval (days)</label>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={form.freePostIntervalDays}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, freePostIntervalDays: Number(e.target.value) }))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      disabled={!canManageGroups}
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submitting || !canManageGroups}
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {submitting ? "Saving…" : canManageGroups ? "Add group" : "Verify Telegram to continue"}
                </button>
              </form>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}

