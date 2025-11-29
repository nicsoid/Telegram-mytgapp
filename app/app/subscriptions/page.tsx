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
    cancelAtPeriodEnd?: boolean
  } | null
}

type PricingInfo = {
  monthly: {
    amount: number
    currency: string
    interval: string
  } | null
}

export default function SubscriptionsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null)
  const [pricingInfo, setPricingInfo] = useState<PricingInfo | null>(null)
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
    loadPricingInfo()
  }, [session, status, router])

  const loadSubscriptionInfo = async () => {
    try {
      const res = await fetch("/api/subscriptions/me", { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setSubscriptionInfo(data)
      }
    } catch (error) {
      console.error("Failed to load subscription info", error)
    }
  }

  const loadPricingInfo = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/subscriptions/pricing", { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setPricingInfo(data.pricing)
      }
    } catch (error) {
      console.error("Failed to load pricing info", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async (tier: "MONTHLY") => {
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
  
  // Check if subscription is cancelled (either status is CANCELED or cancel_at_period_end is true)
  const isCancelled = subscriptionInfo?.activeSubscription?.status === "CANCELED" ||
    subscriptionInfo?.subscriptionStatus === "CANCELED" ||
    subscriptionInfo?.activeSubscription?.cancelAtPeriodEnd === true

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
              </div>
            )}

            {/* Cancellation Notice */}
            {isCancelled && subscriptionInfo.activeSubscription?.currentPeriodEnd && (
              <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <div className="flex items-start">
                  <svg className="h-5 w-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-yellow-900 mb-1">
                      Subscription Cancelled
                    </p>
                    <p className="text-sm text-yellow-800">
                      Your subscription has been cancelled and will remain active until{" "}
                      <strong>{new Date(subscriptionInfo.activeSubscription.currentPeriodEnd).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}</strong>.
                      After this date, you will lose access to subscription features.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-4 border-t border-gray-200">
              {isCancelled ? (
                <button
                  onClick={() => handleSubscribe("MONTHLY")}
                  className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-md"
                >
                  Resubscribe
                </button>
              ) : hasActiveSubscription ? (
                <button
                  onClick={handleCancel}
                  disabled={canceling}
                  className="w-full rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition-all hover:bg-red-100 disabled:opacity-50"
                >
                  {canceling ? "Canceling..." : "Cancel Subscription"}
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="text-gray-500">Loading subscription information...</div>
        )}
      </div>

      {/* Subscription Plans */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Available Plans</h2>
        <div className="max-w-md mx-auto">
          {/* Monthly Plan */}
          <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
            <div className="mb-6 text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Monthly Plan</h3>
              <p className="text-sm text-gray-600">
                Fixed monthly fee for unlimited post scheduling
              </p>
            </div>
            <div className="mb-6 text-center">
              <div className="text-4xl font-bold text-gray-900 mb-1">
                {pricingInfo?.monthly ? (
                  <>
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: pricingInfo.monthly.currency.toUpperCase() || "USD",
                    }).format(pricingInfo.monthly.amount)}
                  </>
                ) : (
                  "$9.99"
                )}
              </div>
              <div className="text-sm text-gray-500">per month</div>
            </div>
            <ul className="mb-8 space-y-3 text-sm text-gray-600">
              <li className="flex items-center">
                <svg className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Unlimited post scheduling
              </li>
              <li className="flex items-center">
                <svg className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Schedule posts to your groups
              </li>
              <li className="flex items-center">
                <svg className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Full group management features
              </li>
              <li className="flex items-center">
                <svg className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Earn from paid advertisements in your groups
              </li>
            </ul>
            <button
              onClick={() => handleSubscribe("MONTHLY")}
              disabled={hasActiveSubscription && !isCancelled}
              className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-lg transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {hasActiveSubscription && !isCancelled ? "Current Plan" : isCancelled ? "Resubscribe" : "Subscribe Now"}
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

