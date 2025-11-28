"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { signIn } from "next-auth/react"
import Script from "next/script"

export default function TelegramLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()

  useEffect(() => {
    // Auto-authenticate if in Telegram Mini App and not signed in
    if (status === "unauthenticated" && typeof window !== "undefined") {
      const tg = (window as any).Telegram?.WebApp
      if (tg) {
        tg.ready()
        const initData = tg.initData || tg.initDataUnsafe
        if (initData && !session) {
          // Auto-sign in with Telegram WebApp data
          signIn("credentials", {
            initData,
            redirect: false,
          }).catch((error) => {
            console.error("Auto-sign in failed:", error)
          })
        }
      }
    }
  }, [status, session])

  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
      />
      {children}
    </>
  )
}

