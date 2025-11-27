"use client"

import { useEffect, useRef } from "react"

interface TelegramLoginWidgetProps {
  botName: string
  callbackUrl?: string
  requestAccess?: string
  size?: "large" | "medium" | "small"
  cornerRadius?: number
  usePic?: boolean
  lang?: string
}

export default function TelegramLoginWidget({
  botName,
  callbackUrl,
  requestAccess = "write",
  size = "large",
  cornerRadius = 0,
  usePic = true,
  lang = "en",
}: TelegramLoginWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || !botName) return

    // Log for debugging
    console.log('[TelegramLoginWidget] Initializing with bot:', botName)
    console.log('[TelegramLoginWidget] NEXT_PUBLIC_TELEGRAM_BOT_USERNAME:', process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME)

    // Clear container
    containerRef.current.innerHTML = ""

    // Create script element
    const script = document.createElement("script")
    script.src = "https://telegram.org/js/telegram-widget.js?22"
    script.setAttribute("data-telegram-login", botName)
    
    // Log the actual attribute value
    console.log('[TelegramLoginWidget] Script data-telegram-login attribute:', script.getAttribute("data-telegram-login"))
    script.setAttribute("data-size", size)
    script.setAttribute("data-request-access", requestAccess)
    script.setAttribute("data-userpic", usePic.toString())
    script.setAttribute("data-lang", lang)
    if (cornerRadius > 0) {
      script.setAttribute("data-radius", cornerRadius.toString())
    }
    
    // Set callback function - Telegram widget will call this with user data
    const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
    const widgetCallbackUrl = callbackUrl || `${baseUrl}/api/auth/telegram/widget`
    
    // Create wrapper function for callback
    ;(window as any).onTelegramAuth = (user: any) => {
      // Redirect to our callback handler with the user data
      const params = new URLSearchParams({
        id: user.id.toString(),
        first_name: user.first_name,
        last_name: user.last_name || "",
        username: user.username || "",
        photo_url: user.photo_url || "",
        auth_date: user.auth_date.toString(),
        hash: user.hash,
      })
      
      window.location.href = `${widgetCallbackUrl}?${params.toString()}`
    }
    
    script.setAttribute("data-onauth", "onTelegramAuth(user)")

    containerRef.current.appendChild(script)

    return () => {
      // Cleanup
      if ((window as any).onTelegramAuth) {
        delete (window as any).onTelegramAuth
      }
    }
  }, [botName, callbackUrl, requestAccess, size, cornerRadius, usePic, lang])

  return <div ref={containerRef} className="flex justify-center" />
}

