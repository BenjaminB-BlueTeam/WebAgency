"use client";

import {
  LayoutDashboard,
  Users,
  UserCheck,
  Palette,
  Search,
  FileText,
  Receipt,
  TrendingUp,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  X,
} from "lucide-react";
import { useLayout } from "./layout-provider";
import { SidebarItem } from "./sidebar-item";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/prospects", icon: Users, label: "Prospects" },
  { href: "/clients", icon: UserCheck, label: "Clients" },
  { href: "/maquettes", icon: Palette, label: "Maquettes" },
  { href: "/prospection", icon: Search, label: "Prospection" },
  { href: "/devis", icon: FileText, label: "Devis" },
  { href: "/factures", icon: Receipt, label: "Factures" },
  { href: "/analytics", icon: TrendingUp, label: "Analytics" },
  { href: "/parametres", icon: Settings, label: "Paramètres" },
] as const;

export function Sidebar() {
  const { collapsed, toggle, mobileOpen, closeMobile } = useLayout();

  return (
    <>
      {/* Backdrop (mobile only) */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          mobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={closeMobile}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col transition-[transform,width] duration-300 ease-in-out
          md:z-30 md:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{
          width: collapsed && !mobileOpen ? 64 : 240,
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderRight: "1px solid rgba(124,58,237,0.12)",
        }}
      >
        {/* Logo */}
        <div
          className="flex h-14 items-center gap-3 px-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div
            className="flex size-8 shrink-0 items-center justify-center rounded-lg font-bold text-white"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
              boxShadow:
                "0 0 16px rgba(124,58,237,0.5), inset 0 1px 0 rgba(255,255,255,0.2)",
            }}
          >
            W
          </div>
          {(!collapsed || mobileOpen) && (
            <span className="text-base font-semibold tracking-tight text-white">
              WebAgency
            </span>
          )}
          <button
            onClick={closeMobile}
            className="ml-auto flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-white/10 text-white/50 hover:text-white md:hidden"
            aria-label="Fermer le menu"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {navItems.map((item) => (
            <SidebarItem key={item.href} {...item} />
          ))}
        </nav>

        {/* Footer */}
        <div
          className="px-3 py-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          {(!collapsed || mobileOpen) && (
            <div className="mb-3 flex items-center gap-2.5 px-2">
              <div
                className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
                }}
              >
                B
              </div>
              <div>
                <p className="text-xs font-medium text-white/80">
                  Benjamin Bourger
                </p>
                <p className="text-xs text-white/35">Steenvoorde</p>
              </div>
            </div>
          )}
          {collapsed && !mobileOpen && (
            <div className="mb-3 flex justify-center">
              <div
                className="flex size-7 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
                }}
              >
                B
              </div>
            </div>
          )}
          <button
            onClick={toggle}
            className="hidden w-full items-center justify-center rounded-lg p-2 transition-colors duration-200 text-white/40 hover:text-white/80 md:flex"
            aria-label={collapsed ? "Ouvrir le menu" : "Réduire le menu"}
          >
            {collapsed ? (
              <ChevronsRight className="size-5" />
            ) : (
              <ChevronsLeft className="size-5" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
