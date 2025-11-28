"use client"

import { useEffect, useState } from "react"
import LandingPage from "@/components/LandingPage"
import TelegramMiniAppPage from "@/app/(telegram)/page"

// Root page that detects if we're in Telegram Mini App
// If yes, show Mini App; if no, show landing page
export default function HomePage() {
  const [isTelegram, setIsTelegram] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    // Check if we're in Telegram WebApp
    if (typeof window !== "undefined") {
      const tg = (window as any).Telegram?.WebApp
      if (tg) {
        setIsTelegram(true)
        tg.ready()
      }
    }
  }, [])

  // Show loading while detecting
  if (!isClient) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl">⏳</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // If in Telegram, show Mini App (which has its own layout with auto-auth)
  // Otherwise show landing page
  if (isTelegram) {
    return <TelegramMiniAppPage />
  }

  return <LandingPage />
}

