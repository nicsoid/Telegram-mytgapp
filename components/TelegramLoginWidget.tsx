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

    // Clear container
    containerRef.current.innerHTML = ""

    // Create script element
    const script = document.createElement("script")
    script.src = "https://telegram.org/js/telegram-widget.js?22"
    script.setAttribute("data-telegram-login", botName)
    script.setAttribute("data-size", size)
    script.setAttribute("data-request-access", requestAccess)
    script.setAttribute("data-userpic", usePic.toString())
    script.setAttribute("data-lang", lang)
    if (cornerRadius > 0) {
      script.setAttribute("data-radius", cornerRadius.toString())
    }
    
    // Set callback function
    const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
    const widgetCallbackUrl = callbackUrl || `${baseUrl}/api/auth/telegram/widget`
    
    // Create wrapper function for callback
    ;(window as any).onTelegramAuth = (user: any) => {
      // Only include fields that actually exist
      const userData: Record<string, string> = {
        id: user.id.toString(),
        first_name: user.first_name,
        auth_date: user.auth_date.toString(),
        hash: user.hash,
      }

      // Optional fields - only add if they exist
      if (user.last_name) userData.last_name = user.last_name
      if (user.username) userData.username = user.username
      if (user.photo_url) userData.photo_url = user.photo_url

      const params = new URLSearchParams(userData)
      window.location.href = `${widgetCallbackUrl}?${params.toString()}`
    }
    
    script.setAttribute("data-onauth", "onTelegramAuth(user)")

    containerRef.current.appendChild(script)

    return () => {
      if ((window as any).onTelegramAuth) {
        delete (window as any).onTelegramAuth
      }
    }
  }, [botName, callbackUrl, requestAccess, size, cornerRadius, usePic, lang])

  return <div ref={containerRef} className="flex justify-center" />
}