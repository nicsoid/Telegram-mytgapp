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
                } else if (result?.ok) {
                  console.log('[TelegramLayout] Auto-sign in successful')
                }
              })
              .catch((error) => {
                console.error('[TelegramLayout] Auto-sign in error:', error)
              })
          } else {
            console.warn('[TelegramLayout] Telegram WebApp detected but no initData available')
          }
        }
      }
    }
  }, [status, session, autoSignInAttempted])

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

