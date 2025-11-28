"use client"

import { signIn } from "next-auth/react"
import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import TelegramLoginWidget from "@/components/TelegramLoginWidget"

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [initData, setInitData] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isWebApp, setIsWebApp] = useState(false)

  // Check if we're in Telegram WebApp
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp
      tg.ready()
      const data = tg.initData || tg.initDataUnsafe
      if (data) {
        setInitData(data)
        setIsWebApp(true)
      }
    }

    // Check for widget callback errors
    const errorParam = searchParams.get("error")
    if (errorParam) {
      switch (errorParam) {
        case "invalid_telegram_data":
          setError("Invalid Telegram authentication data. Please try again.")
          break
        case "expired_auth":
          setError("Authentication expired. Please sign in again.")
          break
        case "authentication_failed":
          setError("Authentication failed. Please try again.")
          break
        default:
          setError("An error occurred during authentication.")
      }
    }

    // Check for widget callback with token
    const widgetToken = searchParams.get("widget_token")
    if (widgetToken) {
      handleWidgetSignIn(widgetToken)
    }
  }, [searchParams])

  const handleWidgetSignIn = async (token: string) => {
    setLoading(true)
    setError(null)

    try {
      // Verify token and get user
      const res = await fetch("/api/auth/telegram/verify-widget-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        setError(errorData.error || "Authentication failed. Please try again.")
        return
      }

      const data = await res.json()
      const user = data.user

      // Create a session by signing in with NextAuth
      // We need to create a valid initData format for NextAuth
      // Since we already verified the user via widget, we'll create a special format
      const widgetInitData = `user=${encodeURIComponent(JSON.stringify({
        id: user.telegramId,
        first_name: user.name?.split(' ')[0] || '',
        last_name: user.name?.split(' ').slice(1).join(' ') || '',
        username: user.telegramUsername || '',
        photo_url: user.image || '',
        auth_date: Math.floor(Date.now() / 1000),
      }))}&hash=widget_verified`

      const result = await signIn("credentials", {
        initData: widgetInitData,
        redirect: false,
      })

      console.log('[signin] signIn result (widget):', result)

      if (result?.error) {
        setError("Failed to create session. Please try again.")
      } else if (result?.ok) {
        // Get callbackUrl and sanitize it to prevent redirect loops
        let callbackUrl = searchParams.get("callbackUrl") || "/"
        
        // Prevent redirect loops - if callbackUrl is the signin page or contains widget_token, use "/"
        try {
          const callbackUrlObj = new URL(callbackUrl, window.location.origin)
          if (callbackUrlObj.pathname.includes('/auth/signin') || callbackUrlObj.searchParams.has('widget_token')) {
            callbackUrl = "/"
          }
        } catch {
          // If URL parsing fails, check if it contains signin
          if (callbackUrl.includes('/auth/signin') || callbackUrl.includes('widget_token')) {
            callbackUrl = "/"
          }
        }
        
        // Clean up URL to prevent reprocessing
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('widget_token')
        newUrl.searchParams.delete('callbackUrl')
        window.history.replaceState({}, '', newUrl.toString())
        
        console.log('[signin] Redirecting to:', callbackUrl)
        router.push(callbackUrl)
        router.refresh()
      }
    } catch (err) {
      console.error("Widget sign-in error:", err)
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleTelegramSignIn = async () => {
    if (!initData) {
      setError("Telegram authentication not available. Please open this page in Telegram.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await signIn("credentials", {
        initData,
        redirect: false,
      })

      console.log('[signin] signIn result (webapp):', result)

      if (result?.error) {
        setError("Authentication failed. Please try again.")
      } else if (result?.ok) {
        const callbackUrl = searchParams.get("callbackUrl") || "/"
        router.push(callbackUrl)
        router.refresh()
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || ""

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">MyTgApp</h1>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to manage your Telegram groups
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Telegram WebApp Sign In (for Mini App) */}
          {isWebApp && initData && (
            <button
              onClick={handleTelegramSignIn}
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in with Telegram"}
            </button>
          )}

          {/* Telegram Login Widget (for Browser) */}
          {!isWebApp && botUsername && (
            <div className="space-y-3">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Sign in with your Telegram account
                </p>
                <TelegramLoginWidget
                  botName={botUsername}
                  size="large"
                  cornerRadius={8}
                  usePic={true}
                />
              </div>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Or</span>
                </div>
              </div>
              <p className="text-center text-xs text-gray-500">
                Open this page in Telegram Mini App for automatic sign-in
              </p>
            </div>
          )}

          {!isWebApp && !botUsername && (
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-4">
                Telegram bot username not configured. Please set NEXT_PUBLIC_TELEGRAM_BOT_USERNAME in your .env file.
              </p>
              <p className="text-xs text-gray-400">
                Open this page in Telegram to sign in
              </p>
            </div>
          )}
        </div>

        <div className="pt-4 text-center text-sm text-gray-600">
          <p>
            New to MyTgApp?{" "}
            <a href="/auth/publisher/signup" className="font-semibold text-blue-600 hover:text-blue-700">
              Sign up as Publisher
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <SignInForm />
    </Suspense>
  )
}
