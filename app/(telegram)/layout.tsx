"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { signIn } from "next-auth/react"
import Script from "next/script"

export default function TelegramLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const [isTelegramWebApp, setIsTelegramWebApp] = useState(false)
  const [autoSignInAttempted, setAutoSignInAttempted] = useState(false)

  useEffect(() => {
    // Check if we're in Telegram WebApp
    if (typeof window !== "undefined") {
      const tg = (window as any).Telegram?.WebApp
      if (tg) {
        setIsTelegramWebApp(true)
        tg.ready()
        
        // Auto-authenticate if in Telegram Mini App and not signed in
        // Wait a bit for session to initialize, then try auth
        const checkAndAuth = () => {
          if (status === "unauthenticated" && !autoSignInAttempted) {
            const initData = tg.initData || tg.initDataUnsafe
            if (initData) {
              console.log('[TelegramLayout] Auto-authenticating with Telegram WebApp initData')
              setAutoSignInAttempted(true)
              
              // Auto-sign in with Telegram WebApp data
              signIn("credentials", {
                initData,
                redirect: false,
              })
                .then((result) => {
                  if (result?.error) {
                    console.error('[TelegramLayout] Auto-sign in failed:', result.error)
                    // Reset to try again
                    setAutoSignInAttempted(false)
                  } else if (result?.ok) {
                    console.log('[TelegramLayout] Auto-sign in successful')
                  }
                })
                .catch((error) => {
                  console.error('[TelegramLayout] Auto-sign in error:', error)
                  // Reset to try again
                  setAutoSignInAttempted(false)
                })
            } else {
              console.warn('[TelegramLayout] Telegram WebApp detected but no initData available')
              console.log('[TelegramLayout] Available WebApp properties:', Object.keys(tg))
            }
          }
        }
        
        // Try immediately
        checkAndAuth()
        
        // Also try after a short delay in case session is still initializing
        const timeout = setTimeout(checkAndAuth, 500)
        return () => clearTimeout(timeout)
      }
    }
  }, [status, autoSignInAttempted])

  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
        onLoad={() => {
          // Script loaded, check for Telegram WebApp again
          if (typeof window !== "undefined") {
            const tg = (window as any).Telegram?.WebApp
            if (tg) {
              setIsTelegramWebApp(true)
              tg.ready()
            }
          }
        }}
      />
      {children}
    </>
  )
}

