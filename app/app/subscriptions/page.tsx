"use client"

import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

type SubscriptionInfo = {
  subscriptionTier: string
  subscriptionStatus: string
  subscriptionExpiresAt: string | null
  activeSubscription: {
    id: string
    tier: string
    status: string
    currentPeriodStart: string | null
    currentPeriodEnd: string | null
    monthlyFee: number | null
    revenueSharePercent: number | null
    stripeSubscriptionId: string | null
  } | null
}

export default function SubscriptionsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [canceling, setCanceling] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (status === "loading") return
    if (!session?.user) {
      router.push("/auth/signin")
      return
    }
    loadSubscriptionInfo()
  }, [session, status, router])

  const loadSubscriptionInfo = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/subscriptions/me", { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setSubscriptionInfo(data)
      }
    } catch (error) {
      console.error("Failed to load subscription info", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async (tier: "MONTHLY" | "REVENUE_SHARE") => {
    try {
      const res = await fetch("/api/subscriptions/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          tier,
          successUrl: `${window.location.origin}/app/subscriptions?success=true`,
          cancelUrl: `${window.location.origin}/app/subscriptions?canceled=true`,
        }),
      })

      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else if (data.success) {
        // Free tier activated
        loadSubscriptionInfo()
        setMessage("Free tier activated successfully!")
      } else {
        setMessage(data.error || "Failed to create checkout session")
      }
    } catch (error) {
      setMessage("An error occurred while creating checkout session")
    }
  }

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel your subscription? It will remain active until the end of the current billing period.")) {
      return
    }

    setCanceling(true)
    setMessage(null)
    try {
      const res = await fetch("/api/subscriptions/cancel", {
        method: "POST",
        credentials: "include",
      })

      const data = await res.json()
      if (res.ok) {
        setMessage("Subscription canceled successfully. It will remain active until the end of the current billing period.")
        loadSubscriptionInfo()
      } else {
        setMessage(data.error || "Failed to cancel subscription")
      }
    } catch (error) {
      setMessage("An error occurred while canceling subscription")
    } finally {
      setCanceling(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="text-center">
          <div className="mb-4 text-4xl">⏳</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session?.user) {
    return null
  }

  const hasActiveSubscription = subscriptionInfo?.activeSubscription?.status === "ACTIVE" ||
    (subscriptionInfo?.subscriptionStatus === "ACTIVE" &&
     subscriptionInfo?.subscriptionTier !== "FREE" &&
     (!subscriptionInfo?.subscriptionExpiresAt || new Date(subscriptionInfo.subscriptionExpiresAt) > new Date()))

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Subscription Management</h1>
            <p className="mt-2 text-blue-100">
              Manage your subscription to schedule posts to your groups
            </p>
          </div>
          <div className="hidden md:block">
            <div className="rounded-full bg-white/20 p-4 text-4xl">💳</div>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`rounded-lg border p-4 ${
            message.includes("success") || message.includes("activated")
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message}
        </div>
      )}

      {/* Current Subscription Status */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Current Subscription</h2>
        {subscriptionInfo ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-700">Tier</div>
                <div className="text-lg font-bold text-gray-900">
                  {subscriptionInfo.subscriptionTier.replace("_", " ")}
                </div>
              </div>
              <div>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
                    hasActiveSubscription
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {subscriptionInfo.subscriptionStatus}
                </span>
              </div>
            </div>

            {subscriptionInfo.activeSubscription && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                {subscriptionInfo.activeSubscription.currentPeriodStart && (
                  <div>
                    <div className="text-xs text-gray-500">Current Period Start</div>
                    <div className="text-sm font-medium text-gray-900">
                      {new Date(subscriptionInfo.activeSubscription.currentPeriodStart).toLocaleDateString()}
                    </div>
                  </div>
                )}
                {subscriptionInfo.activeSubscription.currentPeriodEnd && (
                  <div>
                    <div className="text-xs text-gray-500">Current Period End</div>
                    <div className="text-sm font-medium text-gray-900">
                      {new Date(subscriptionInfo.activeSubscription.currentPeriodEnd).toLocaleDateString()}
                    </div>
                  </div>
                )}
                {subscriptionInfo.activeSubscription.monthlyFee && (
                  <div>
                    <div className="text-xs text-gray-500">Monthly Fee</div>
                    <div className="text-sm font-medium text-gray-900">
                      ${(subscriptionInfo.activeSubscription.monthlyFee / 100).toFixed(2)}/month
                    </div>
                  </div>
                )}
                {subscriptionInfo.activeSubscription.revenueSharePercent && (
                  <div>
                    <div className="text-xs text-gray-500">Revenue Share</div>
                    <div className="text-sm font-medium text-gray-900">
                      {(subscriptionInfo.activeSubscription.revenueSharePercent * 100).toFixed(0)}%
                    </div>
                  </div>
                )}
              </div>
            )}

            {hasActiveSubscription && (
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={handleCancel}
                  disabled={canceling}
                  className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition-all hover:bg-red-100 disabled:opacity-50"
                >
                  {canceling ? "Canceling..." : "Cancel Subscription"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-500">Loading subscription information...</div>
        )}
      </div>

      {/* Subscription Plans */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Available Plans</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Monthly Plan */}
          <div className="rounded-xl border-2 border-gray-200 bg-white p-6">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-gray-900">Monthly Plan</h3>
              <p className="mt-1 text-sm text-gray-600">
                Fixed monthly fee for unlimited post scheduling
              </p>
            </div>
            <div className="mb-4">
              <div className="text-3xl font-bold text-gray-900">$9.99</div>
              <div className="text-sm text-gray-500">per month</div>
            </div>
            <ul className="mb-6 space-y-2 text-sm text-gray-600">
              <li className="flex items-center">
                <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Unlimited post scheduling
              </li>
              <li className="flex items-center">
                <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Schedule posts to your groups
              </li>
              <li className="flex items-center">
                <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Full group management features
              </li>
            </ul>
            <button
              onClick={() => handleSubscribe("MONTHLY")}
              disabled={hasActiveSubscription}
              className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {hasActiveSubscription ? "Current Plan" : "Subscribe Now"}
            </button>
          </div>

          {/* Revenue Share Plan */}
          <div className="rounded-xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 p-6">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-gray-900">Revenue Share Plan</h3>
              <p className="mt-1 text-sm text-gray-600">
                Earn from paid ads in your groups
              </p>
            </div>
            <div className="mb-4">
              <div className="text-3xl font-bold text-gray-900">20%</div>
              <div className="text-sm text-gray-500">revenue share</div>
            </div>
            <ul className="mb-6 space-y-2 text-sm text-gray-600">
              <li className="flex items-center">
                <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Unlimited post scheduling
              </li>
              <li className="flex items-center">
                <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Earn from paid advertisements
              </li>
              <li className="flex items-center">
                <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Full group management features
              </li>
            </ul>
            <button
              onClick={() => handleSubscribe("REVENUE_SHARE")}
              disabled={hasActiveSubscription}
              className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:from-purple-700 hover:to-indigo-700 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {hasActiveSubscription ? "Current Plan" : "Subscribe Now"}
            </button>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-900">
          <strong>Note:</strong> An active subscription is required to schedule posts to your groups. 
          Users can still post paid ads to your groups using credits, but you need a subscription to schedule your own posts.
        </p>
      </div>
    </div>
  )
}

