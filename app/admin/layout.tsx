import AppLayout from "@/components/app/AppLayout"
import { SessionProvider } from "next-auth/react"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AppLayout>{children}</AppLayout>
    </SessionProvider>
  )
}

