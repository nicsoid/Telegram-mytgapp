import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { SessionProvider } from "@/components/providers/SessionProvider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "MyTgApp - Telegram Group Management Platform",
  description: "Monetize your Telegram groups with scheduled posts and paid advertisements",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="light">
      <body className={`${inter.className} bg-white text-gray-900`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}

