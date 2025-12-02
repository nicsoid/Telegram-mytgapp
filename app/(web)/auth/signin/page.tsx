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

  // Check if we're in Telegram WebApp and auto-sign in
  useEffect(() => {
    const checkAndSignIn = () => {
      if (typeof window === "undefined") return
      
      const tg = (window as any).Telegram?.WebApp
      if (!tg) {
        // Check again after delay
        setTimeout(checkAndSignIn, 500)
        return
      }
      
      tg.ready()
      tg.expand()
      
      // Get initData from multiple sources
      let data = tg.initData
      if (!data && tg.initDataUnsafe) {
        try {
          const params = new URLSearchParams()
          if (tg.initDataUnsafe.user) params.set('user', JSON.stringify(tg.initDataUnsafe.user))
          if (tg.initDataUnsafe.auth_date) params.set('auth_date', tg.initDataUnsafe.auth_date.toString())
          if (tg.initDataUnsafe.hash) params.set('hash', tg.initDataUnsafe.hash)
          if (tg.initDataUnsafe.query_id) params.set('query_id', tg.initDataUnsafe.query_id)
          if (tg.initDataUnsafe.start_param) params.set('start_param', tg.initDataUnsafe.start_param)
          data = params.toString()
        } catch (e) {
          console.error('[SignIn] Error converting initDataUnsafe:', e)
        }
      }
      
      if (data && data.length > 0) {
        setInitData(data)
        setIsWebApp(true)
        
        // Auto-sign in immediately when Telegram WebApp is detected
        console.log('[SignIn] Telegram WebApp detected, auto-signing in...')
        handleTelegramSignInAuto(data)
      } else {
        // No initData yet, try again
        setTimeout(checkAndSignIn, 1000)
      }
    }
    
    // Start checking immediately
    checkAndSignIn()
    
    // Also check after delays
    setTimeout(checkAndSignIn, 500)
    setTimeout(checkAndSignIn, 1000)
    setTimeout(checkAndSignIn, 2000)

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
        
        // Use hard redirect to ensure session cookie is read and session is fully established
        // This prevents the "Please sign in" loop after widget authentication
        window.location.href = callbackUrl
      }
    } catch (err) {
      console.error("Widget sign-in error:", err)
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Auto-sign in function (called automatically when Telegram WebApp is detected)
  const handleTelegramSignInAuto = async (initDataValue: string) => {
    if (!initDataValue) {
      console.log('[SignIn] No initData available for auto-sign-in')
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log('[SignIn] Attempting auto-sign-in with initData length:', initDataValue.length)
      
      // Clear any NextAuth cookies that might block sign-in
      if (typeof document !== "undefined") {
        document.cookie.split(";").forEach((c) => {
          const cookieName = c.trim().split("=")[0]
          if (cookieName.includes("next-auth") || cookieName.includes("authjs")) {
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`
          }
        })
      }
      
      const result = await signIn("credentials", {
        initData: initDataValue,
        redirect: false,
      })

      console.log('[SignIn] Auto-sign-in result:', JSON.stringify(result))

      if (result?.error) {
        console.error('[SignIn] Auto-sign-in failed:', result.error)
        setError("Authentication failed. Please try again.")
        setLoading(false)
      } else if (result?.ok) {
        console.log('[SignIn] Auto-sign-in successful!')
        const callbackUrl = searchParams.get("callbackUrl") || "/"
        // Use hard redirect to ensure session cookie is read and session is fully established
        window.location.href = callbackUrl
      } else {
        console.warn('[SignIn] Unexpected sign-in result:', result)
        setLoading(false)
      }
    } catch (err) {
      console.error('[SignIn] Auto-sign-in error:', err)
      setError("An error occurred. Please try again.")
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

      if (result?.error) {
        setError("Authentication failed. Please try again.")
      } else if (result?.ok) {
        const callbackUrl = searchParams.get("callbackUrl") || "/"
        // Use hard redirect to ensure session cookie is read and session is fully established
        // This prevents the "Please sign in" loop after widget authentication
        window.location.href = callbackUrl
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || ""

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-100 px-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-gray-200 bg-white p-8 shadow-xl">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-2xl font-bold shadow-lg">
              M
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">MyTgApp</h1>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to manage your Telegram groups and post ads
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
            <>
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 mb-4">
                <p className="text-sm text-blue-900">
                  ✅ Telegram Mini App detected! Signing you in automatically...
                </p>
              </div>
              <button
                onClick={handleTelegramSignIn}
                disabled={loading}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign In Now (Manual)"}
              </button>
            </>
          )}
          
          {/* Show manual sign-in button if in Telegram but auto-sign-in hasn't worked */}
          {typeof window !== "undefined" && (window as any).Telegram?.WebApp && !isWebApp && (
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
              <p className="text-sm text-yellow-900 mb-3">
                ⚠️ Telegram Mini App detected but authentication data not available yet.
              </p>
              <button
                onClick={async () => {
                  const tg = (window as any).Telegram?.WebApp
                  if (!tg) {
                    alert('Not in Telegram mini app')
                    return
                  }
                  
                  tg.ready()
                  
                  // Clear cookies
                  document.cookie.split(";").forEach((c) => {
                    const cookieName = c.trim().split("=")[0]
                    if (cookieName.includes("next-auth") || cookieName.includes("authjs")) {
                      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
                    }
                  })
                  
                  // Wait a bit for initData
                  await new Promise(resolve => setTimeout(resolve, 500))
                  
                  let data = tg.initData
                  if (!data && tg.initDataUnsafe) {
                    try {
                      const params = new URLSearchParams()
                      if (tg.initDataUnsafe.user) params.set('user', JSON.stringify(tg.initDataUnsafe.user))
                      if (tg.initDataUnsafe.auth_date) params.set('auth_date', tg.initDataUnsafe.auth_date.toString())
                      if (tg.initDataUnsafe.hash) params.set('hash', tg.initDataUnsafe.hash)
                      data = params.toString()
                    } catch (e) {
                      // Error
                    }
                  }
                  
                  if (data) {
                    setInitData(data)
                    setIsWebApp(true)
                    handleTelegramSignInAuto(data)
                  } else {
                    alert('Unable to get Telegram authentication data. Please reopen the mini app from Telegram.')
                  }
                }}
                className="w-full rounded-lg bg-yellow-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-yellow-700"
              >
                Try Sign In Again
              </button>
            </div>
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

        {/* Information Section */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-blue-900">What you can do:</h3>
          <ul className="text-xs text-blue-800 space-y-2">
            <li className="flex items-start">
              <svg className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span><strong>Add your Telegram groups</strong> - Connect and verify your groups to start managing them</span>
            </li>
            <li className="flex items-start">
              <svg className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span><strong>Let users post ads</strong> - Grant credits to users so they can post advertisements in your groups</span>
            </li>
            <li className="flex items-start">
              <svg className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span><strong>Subscribe to schedule posts</strong> - With an active subscription, you can schedule unlimited posts to your groups</span>
            </li>
            <li className="flex items-start">
              <svg className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span><strong>Earn from paid ads</strong> - Set prices for posting to your groups and earn revenue</span>
            </li>
          </ul>
        </div>

        <div className="pt-2 text-center text-xs text-gray-500">
          <p>
            New users get 3 free scheduled posts. Subscribe to unlock unlimited scheduling.
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
