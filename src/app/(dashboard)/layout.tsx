import { Sidebar } from "@/components/sidebar"
import { Toaster } from "sonner"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="md:ml-[200px] p-6 pt-14 md:pt-6">
        {children}
      </main>
      <Toaster
        theme="dark"
        toastOptions={{
          style: {
            background: "#0a0a0a",
            border: "1px solid #1a1a1a",
            color: "#fafafa",
          },
        }}
      />
    </div>
  )
}
