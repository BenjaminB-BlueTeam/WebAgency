"use client";

import {
  LayoutDashboard,
  Users,
  UserCheck,
  Palette,
  Search,
  FileText,
  Receipt,
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
  { href: "/parametres", icon: Settings, label: "Paramètres" },
] as const;

export function Sidebar() {
  const { collapsed, toggle, mobileOpen, closeMobile } = useLayout();

  return (
    <>
      {/* Backdrop (mobile only) */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden ${
          mobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={closeMobile}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar transition-[transform,width] duration-300 ease-in-out
          md:z-30 md:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{ width: collapsed && !mobileOpen ? 64 : 240 }}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-3 border-b border-sidebar-border px-4">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary font-bold text-sidebar-primary-foreground">
            W
          </div>
          {(!collapsed || mobileOpen) && (
            <span className="text-lg font-semibold text-sidebar-primary">
              WebAgency
            </span>
          )}
          {/* Close button (mobile only) */}
          <button
            onClick={closeMobile}
            className="ml-auto flex size-8 items-center justify-center rounded-lg text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground md:hidden"
            aria-label="Fermer le menu"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => (
            <SidebarItem key={item.href} {...item} />
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border px-3 py-3">
          {(!collapsed || mobileOpen) && (
            <div className="mb-3 px-3">
              <p className="text-xs font-medium text-sidebar-foreground/80">
                Benjamin Bourger
              </p>
              <p className="text-xs text-sidebar-foreground/40">
                Steenvoorde
              </p>
            </div>
          )}
          <button
            onClick={toggle}
            className="hidden w-full items-center justify-center rounded-lg p-2 text-sidebar-foreground/60 transition-colors duration-200 hover:bg-sidebar-accent hover:text-sidebar-foreground md:flex"
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
