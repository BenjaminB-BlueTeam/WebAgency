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
  const { collapsed, toggle } = useLayout();

  return (
    <aside
      className="fixed inset-y-0 left-0 z-30 flex flex-col border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar))] transition-[width] duration-200 ease-in-out"
      style={{ width: collapsed ? 64 : 240 }}
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-3 border-b border-[hsl(var(--sidebar-border))] px-4">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--sidebar-primary))] font-bold text-[hsl(var(--sidebar-primary-foreground))]">
          W
        </div>
        {!collapsed && (
          <span className="text-lg font-semibold text-[hsl(var(--sidebar-primary))]">
            WebAgency
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => (
          <SidebarItem key={item.href} {...item} />
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-[hsl(var(--sidebar-border))] px-3 py-3">
        {!collapsed && (
          <div className="mb-3 px-3">
            <p className="text-xs font-medium text-[hsl(var(--sidebar-foreground))]/80">
              Benjamin Bourger
            </p>
            <p className="text-xs text-[hsl(var(--sidebar-foreground))]/40">
              Steenvoorde
            </p>
          </div>
        )}
        <button
          onClick={toggle}
          className="flex w-full items-center justify-center rounded-lg p-2 text-[hsl(var(--sidebar-foreground))]/60 transition-colors duration-200 hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]"
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
  );
}
