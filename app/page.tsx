"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import LandingPage from "@/components/LandingPage"
import TelegramMiniAppPage from "@/app/(telegram)/page"
import TelegramLayout from "@/app/(telegram)/layout"

// Root page that detects if we're in Telegram Mini App
// If yes, show Mini App with Telegram layout (auto-auth); if no, show landing page
export default function HomePage() {
  const { data: session, status } = useSession()
  const [isTelegram, setIsTelegram] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [scriptLoaded, setScriptLoaded] = useState(false)

  // Initialize and detect Telegram WebApp
  useEffect(() => {
    setIsClient(true)
    
    if (typeof window === "undefined") return
    
    // Check if Telegram WebApp is available (only in actual Telegram Mini App)
    const checkTelegram = () => {
      const tg = (window as any).Telegram?.WebApp
      if (tg && tg.initData && tg.initDataUnsafe?.user) {
        // Only consider it Telegram if we have actual initData (not just the script loaded)
        console.log('[HomePage] Telegram WebApp detected with initData')
        setIsTelegram(true)
        tg.ready()
        return true
      }
      return false
    }
    
    // Check immediately
    if (checkTelegram()) {
      setScriptLoaded(true)
      return
    }
    
    // If not found, wait a bit and check again (script might be loading)
    const timeout = setTimeout(() => {
      if (!checkTelegram()) {
        console.log('[HomePage] Not in Telegram Mini App, showing landing page')
      }
      setScriptLoaded(true)
    }, 300)
    
    return () => clearTimeout(timeout)
  }, [])

  // Don't redirect - always show landing page in browser
  // Users can navigate to /app for user area or /admin for admin area

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

