"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import LandingPage from "@/components/LandingPage"
import TelegramMiniAppPage from "@/app/(telegram)/page"
import TelegramLayout from "@/app/(telegram)/layout"

// Root page that detects if we're in Telegram Mini App
// If yes, show Mini App with Telegram layout (auto-auth); if no, show landing page
export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isTelegram, setIsTelegram] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [scriptLoaded, setScriptLoaded] = useState(false)

  // Initialize and load Telegram script
  useEffect(() => {
    setIsClient(true)
    
    if (typeof window === "undefined") return
    
    // Check if Telegram is already available (script might be loaded by Telegram itself)
    if ((window as any).Telegram?.WebApp) {
      console.log('[HomePage] Telegram WebApp already available')
      setIsTelegram(true)
      setScriptLoaded(true)
      return
    }
    
    // Load script if not already present
    if (!document.querySelector('script[src*="telegram-web-app.js"]')) {
      const script = document.createElement('script')
      script.src = 'https://telegram.org/js/telegram-web-app.js'
      script.async = true
      script.onload = () => {
        console.log('[HomePage] Telegram WebApp script loaded')
        // Check for WebApp after script loads
        setTimeout(() => {
          const tg = (window as any).Telegram?.WebApp
          if (tg) {
            console.log('[HomePage] Telegram WebApp detected after script load')
            setIsTelegram(true)
            tg.ready()
          }
          setScriptLoaded(true)
        }, 100)
      }
      script.onerror = () => {
        console.warn('[HomePage] Failed to load Telegram WebApp script')
        setScriptLoaded(true) // Continue anyway
      }
      document.head.appendChild(script)
    } else {
      // Script tag exists, wait a bit and check
      setTimeout(() => {
        const tg = (window as any).Telegram?.WebApp
        if (tg) {
          console.log('[HomePage] Telegram WebApp detected (script was already loading)')
          setIsTelegram(true)
          tg.ready()
        }
        setScriptLoaded(true)
      }, 200)
    }
  }, [])

  // If user is logged in and not in Telegram, redirect to app
  useEffect(() => {
    if (isClient && !isTelegram && scriptLoaded && session?.user && status === "authenticated") {
      // User is logged in on web, redirect to app
      router.push("/app")
    }
  }, [isClient, isTelegram, scriptLoaded, session, status, router])

  // Show loading while detecting or while session is loading
  if (!isClient || !scriptLoaded || status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl">⏳</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // If in Telegram, show Mini App wrapped in Telegram layout (for auto-auth)
  // Otherwise show landing page
  if (isTelegram) {
    return (
      <TelegramLayout>
        <TelegramMiniAppPage />
      </TelegramLayout>
    )
  }

  return <LandingPage />
}

