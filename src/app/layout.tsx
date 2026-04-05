import type { Metadata } from "next"
import { Toaster } from "sonner"
import "./globals.css"

export const metadata: Metadata = {
  title: "CRM — Flandre Web Agency",
  description: "CRM interne Flandre Web Agency",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className="dark">
      <body className="antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
