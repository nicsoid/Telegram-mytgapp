"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Script from "next/script"
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
    
    // Check if we're in Telegram by multiple methods
    const checkTelegram = () => {
      // Method 1: Check for Telegram.WebApp object (most reliable)
      const tg = (window as any).Telegram?.WebApp
      if (tg) {
        console.log('[HomePage] Telegram WebApp detected')
        console.log('[HomePage] initData:', tg.initData ? 'present' : 'missing')
        console.log('[HomePage] initDataUnsafe:', tg.initDataUnsafe ? 'present' : 'missing')
        setIsTelegram(true)
        tg.ready()
        tg.expand()
        return true
      }
      
      // Method 2: Check user agent (Telegram WebView)
      const userAgent = navigator.userAgent || ''
      if (userAgent.includes('Telegram') || userAgent.includes('WebView')) {
        console.log('[HomePage] Telegram user agent detected:', userAgent)
        // Wait a bit more for WebApp to initialize
        return false
      }
      
      // Method 3: Check referrer (Telegram sometimes sets this)
      const referrer = document.referrer || ''
      if (referrer.includes('telegram.org') || referrer.includes('t.me')) {
        console.log('[HomePage] Telegram referrer detected:', referrer)
        // Wait a bit more for WebApp to initialize
        return false
      }
      
      return false
    }
    
    // Check immediately (in case script was already loaded)
    if (checkTelegram()) {
      setScriptLoaded(true)
      return
    }
    
    // If not found, wait for script to load and check multiple times
    let attempts = 0
    const maxAttempts = 50 // 5 seconds total (50 * 100ms)
    
    const checkInterval = setInterval(() => {
      attempts++
      if (checkTelegram()) {
        setScriptLoaded(true)
        clearInterval(checkInterval)
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval)
        console.log('[HomePage] Not in Telegram Mini App, showing landing page')
        setScriptLoaded(true)
      }
    }, 100)
    
    return () => {
      clearInterval(checkInterval)
    }
  }, [])


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

