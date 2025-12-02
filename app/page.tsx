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
  const [isTelegram, setIsTelegram] = useState<boolean | null>(null) // null = checking, true = telegram, false = not telegram
  const [isClient, setIsClient] = useState(false)

  // Initialize and detect Telegram WebApp
  useEffect(() => {
    setIsClient(true)
    
    if (typeof window === "undefined") return
    
    // Telegram injects Telegram.WebApp automatically when in Mini App
    // We need to check for actual Telegram data, not just script loading
    // The script can load in browser but won't have initData
    const checkTelegram = (): boolean => {
      const tg = (window as any).Telegram?.WebApp
      if (!tg) {
        return false
      }
      
      // Check for actual Telegram data - initData or initDataUnsafe must be present
      // OR platform must be set (Telegram sets this when in mini app)
      const hasInitData = !!(tg.initData || tg.initDataUnsafe?.user)
      const platform = tg.platform || ''
      const isTelegramPlatform = platform === 'tdesktop' || platform === 'web' || platform === 'ios' || 
                                  platform === 'android' || platform === 'macos' || platform === 'linux' || 
                                  platform === 'windows'
      
      console.log('[HomePage] 🔍 Checking Telegram WebApp...')
      console.log('[HomePage] Telegram.WebApp exists:', !!tg)
      console.log('[HomePage] platform:', platform || 'not set')
      console.log('[HomePage] initData:', tg.initData ? '✅ present' : '❌ missing')
      console.log('[HomePage] initDataUnsafe:', tg.initDataUnsafe ? '✅ present' : '❌ missing')
      
      // Only consider it Telegram if:
      // 1. We have initData/initDataUnsafe (actual Telegram data), OR
      // 2. Platform is set (Telegram sets this in mini app), OR
      // 3. version is set (Telegram sets this in mini app)
      const hasVersion = !!tg.version
      
      // This prevents false positives when script loads in regular browser
      if (hasInitData || (isTelegramPlatform && platform) || hasVersion) {
        console.log('[HomePage] ✅ Telegram WebApp detected!')
        console.log('[HomePage] Reason:', hasInitData ? 'hasInitData' : (isTelegramPlatform ? 'platform set' : 'version set'))
        tg.ready()
        tg.expand()
        setIsTelegram(true)
        return true
      }
      
      // If script loaded but no Telegram data, we're not in Telegram
      if (tg && !hasInitData && !isTelegramPlatform && !hasVersion) {
        console.log('[HomePage] ❌ Telegram script loaded but no Telegram data - not in mini app')
        return false
      }
      
      return false
    }
    
    // Don't load script in regular browser - only check if Telegram already injected it
    // Telegram injects the script automatically when opening mini app
    
    // Check immediately
    if (checkTelegram()) {
      return
    }
    
    // If not found immediately, wait and check again multiple times
    // Telegram might inject it asynchronously
    const timeouts: NodeJS.Timeout[] = []
    
    timeouts.push(setTimeout(() => {
      if (checkTelegram()) return
    }, 100))
    
    timeouts.push(setTimeout(() => {
      if (checkTelegram()) return
    }, 300))
    
    timeouts.push(setTimeout(() => {
      if (checkTelegram()) return
    }, 500))
    
    timeouts.push(setTimeout(() => {
      if (checkTelegram()) return
      console.log('[HomePage] ❌ Telegram WebApp not detected after delays, showing landing page')
      setIsTelegram(false)
    }, 1000))
    
    return () => {
      timeouts.forEach(clearTimeout)
    }
  }, [])

  // Show loading while detecting or while session is loading
  if (!isClient || isTelegram === null || status === "loading") {
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

