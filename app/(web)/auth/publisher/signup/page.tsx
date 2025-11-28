"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession, signIn } from "next-auth/react"
import { Suspense } from "react"

function PublisherSignupForm() {
  const router = useRouter()
  const { data: session } = useSession()
  const [step, setStep] = useState<"telegram" | "email">("telegram")
  const [initData, setInitData] = useState<string>("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [telegramVerified, setTelegramVerified] = useState(false)
  const [emailVerified, setEmailVerified] = useState(false)

  useEffect(() => {
    // Check if we're in Telegram WebApp
    if (typeof window !== "undefined" && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp
      tg.ready()
      const data = tg.initData || tg.initDataUnsafe
      if (data) {
        setInitData(data)
      }
    }

    // Check if user is already signed in
    if (session?.user) {
      checkVerificationStatus()
    }
  }, [session])

  const checkVerificationStatus = async () => {
    try {
      const res = await fetch("/api/publishers/me", { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        if (data.publisher) {
          setTelegramVerified(data.publisher.telegramVerified)
          setEmailVerified(data.publisher.emailVerified)
          if (data.publisher.isVerified) {
            router.push("/dashboard")
          }
        }
      }
    } catch (error) {
      console.error("Failed to check status", error)
    }
  }

  const handleTelegramSignup = async () => {
    if (!initData) {
      setError("Telegram authentication not available. Please open this page in Telegram.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      // First sign in with Telegram
      const signInResult = await signIn("credentials", {
        initData,
        redirect: false,
      })

      if (signInResult?.error) {
        setError("Telegram authentication failed")
        return
      }

      // Then register as publisher
      const res = await fetch("/api/auth/publisher/signup/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ initData }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to register as publisher")
        return
      }

      setTelegramVerified(true)
      setStep("email")
    } catch (error) {
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleEmailVerification = async () => {
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/auth/publisher/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to verify email")
        return
      }

      setEmailVerified(true)
      setTimeout(() => {
        router.push("/dashboard")
      }, 2000)
    } catch (error) {
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Sign up as Publisher</h1>
          <p className="mt-2 text-sm text-gray-600">
            Verify your Telegram account and email to get started
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</div>
        )}

        {step === "telegram" && (
          <div className="space-y-4">
            {telegramVerified ? (
              <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800">
                ✓ Telegram account verified
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600">
                  Step 1: Verify your Telegram account
                </p>
                <button
                  onClick={handleTelegramSignup}
                  disabled={loading || !initData}
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Verify Telegram Account"}
                </button>
              </>
            )}
          </div>
        )}

        {step === "email" && (
          <div className="space-y-4">
            {emailVerified ? (
              <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800">
                ✓ Email verified! Redirecting to dashboard...
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600">Step 2: Verify your email address</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    placeholder="your@email.com"
                  />
                </div>
                <button
                  onClick={handleEmailVerification}
                  disabled={loading || !email}
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Verify Email"}
                </button>
              </>
            )}
          </div>
        )}

        <div className="pt-4 text-center text-sm text-gray-600">
          <p>
            Already have an account?{" "}
            <a href="/auth/signin" className="font-semibold text-blue-600 hover:text-blue-700">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function PublisherSignupPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <PublisherSignupForm />
    </Suspense>
  )
}

