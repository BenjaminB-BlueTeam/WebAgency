"use client"

import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import {
  LayoutDashboard,
  Search,
  Users,
  Kanban,
  Mail,
  Settings,
  UserCheck,
  Menu,
  X,
  LogOut,
} from "lucide-react"

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/recherche", label: "Recherche", icon: Search },
  { href: "/prospects", label: "Prospects", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/emails", label: "Emails", icon: Mail },
  { href: "/clients", label: "Clients", icon: UserCheck },
  { href: "/parametres", label: "Parametres", icon: Settings },
]

function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/"
  return pathname.startsWith(href)
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [expanded] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
    router.refresh()
  }

  return (
    <>
      {/* ── Mobile hamburger button ─────────────────────────────────── */}
      <button
        className="md:hidden fixed top-3 left-3 z-50 p-2 rounded-[6px] bg-[#000000] border border-[#111111] text-[#555555] hover:text-[#fafafa] transition-colors"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
      >
        <Menu size={18} />
      </button>

      {/* ── Mobile overlay backdrop ─────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="md:hidden fixed inset-0 z-40 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Mobile sidebar (slide in from left) ────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            className="md:hidden fixed inset-y-0 left-0 z-50 w-[200px] bg-[#000000] border-r border-[#111111] flex flex-col"
            initial={{ x: -200 }}
            animate={{ x: 0 }}
            exit={{ x: -200 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {/* Mobile header */}
            <div className="flex items-center justify-between px-3 py-4 border-b border-[#111111]">
              {/* Logo */}
              <div className="w-7 h-7 bg-white rounded-[6px] flex items-center justify-center">
                <span className="text-black text-sm font-[800] leading-none">F</span>
              </div>
              <button
                className="p-1.5 rounded-[6px] text-[#555555] hover:text-[#fafafa] transition-colors"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
              >
                <X size={16} />
              </button>
            </div>

            {/* Mobile nav items */}
            <div className="flex-1 py-2 overflow-y-auto">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                const active = isActive(href, pathname)
                return (
                  <button
                    key={href}
                    onClick={() => {
                      router.push(href)
                      setMobileOpen(false)
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 mx-1 rounded-[6px] transition-colors text-left ${
                      active
                        ? "bg-[#111111] text-[#fafafa]"
                        : "text-[#555555] hover:text-[#fafafa] hover:bg-[#0a0a0a]"
                    }`}
                    style={{ width: "calc(100% - 8px)" }}
                  >
                    <Icon size={16} className="shrink-0" />
                    <span className="text-sm font-medium truncate">{label}</span>
                  </button>
                )
              })}
            </div>

            {/* Mobile logout */}
            <div className="p-2 border-t border-[#111111]">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[6px] text-[#555555] hover:text-[#f87171] hover:bg-[#0a0a0a] transition-colors text-left"
              >
                <LogOut size={16} className="shrink-0" />
                <span className="text-sm font-medium">Déconnexion</span>
              </button>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* ── Desktop sidebar (hover to expand) ──────────────────────── */}
      <nav
        className="hidden md:flex fixed inset-y-0 left-0 z-30 w-[200px] flex-col bg-[#000000] border-r border-[#111111]"
      >
        {/* Logo */}
        <div className="flex items-center px-[12px] py-4 border-b border-[#111111] shrink-0" style={{ height: 56 }}>
          <div className="w-7 h-7 shrink-0 bg-white rounded-[6px] flex items-center justify-center">
            <span className="text-black text-sm font-[800] leading-none">F</span>
          </div>
          <span className="ml-3 text-[#fafafa] text-sm font-semibold whitespace-nowrap">
            Flandre
          </span>
        </div>

        {/* Desktop nav items */}
        <div className="flex-1 py-2">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href, pathname)
            return (
              <button
                key={href}
                onClick={() => router.push(href)}
                className={`flex items-center w-full px-[14px] py-2.5 cursor-pointer transition-colors ${
                  active
                    ? "bg-[#111111] text-[#fafafa]"
                    : "text-[#555555] hover:text-[#fafafa] hover:bg-[#0a0a0a]"
                }`}
              >
                <Icon size={16} className="shrink-0" />
                <span className="ml-3 text-sm font-medium whitespace-nowrap">
                  {label}
                </span>
              </button>
            )
          })}
        </div>

        {/* Desktop logout */}
        <div className="border-t border-[#111111] shrink-0">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-[14px] py-3 cursor-pointer text-[#555555] hover:text-[#f87171] hover:bg-[#0a0a0a] transition-colors"
          >
            <LogOut size={16} className="shrink-0" />
            <span className="ml-3 text-sm font-medium whitespace-nowrap">
              Déconnexion
            </span>
          </button>
        </div>
      </nav>
    </>
  )
}
