# CRM Redesign — Glassmorphism Violet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le design system plat amber/zinc par un glassmorphism violet sur les 7 fichiers du CRM Next.js, sans toucher à la structure des pages ni aux API routes.

**Architecture:** CSS custom properties overrides dans `globals.css` (tokens + classes utilitaires `.glass`, `.glass-violet`, `.glass-danger`) + réécriture ciblée de 6 composants partagés qui adoptent ces classes. Le dashboard layout reçoit le fond gradient + ambient blobs. Tous les autres pages héritent automatiquement via les tokens.

**Tech Stack:** Next.js 16, Tailwind CSS v4, CSS custom properties (OkLCH), inline styles pour les box-shadows/glows (non supportés par Tailwind sans config)

---

## File Map

| Fichier | Action | Rôle |
|---|---|---|
| `crm/src/app/globals.css` | Modifier | Tokens dark mode + classes utilitaires glass |
| `crm/src/app/(dashboard)/layout.tsx` | Modifier | Fond gradient + ambient blobs |
| `crm/src/components/layout/sidebar.tsx` | Modifier | Logo glass violet, avatar user, fond glass |
| `crm/src/components/dashboard/stat-card.tsx` | Modifier | Variantes glass neutral/violet/danger |
| `crm/src/components/dashboard/pipeline-bar.tsx` | Modifier | Segments glowing + dot legend + container glass |
| `crm/src/components/dashboard/recent-activity.tsx` | Modifier | Container glass + dots colorés avec glow |
| `crm/src/components/dashboard/alerts-relance.tsx` | Modifier | Container glass + badges priorité dark-mode |

---

## Task 1 : Tokens CSS + classes utilitaires glass (`globals.css`)

**Files:**
- Modify: `crm/src/app/globals.css`

- [ ] **Step 1 : Remplacer les tokens dark mode**

Dans `globals.css`, remplacer le bloc `.dark { ... }` (lignes 95–147) par :

```css
.dark {
  /* Background : quasi-noir teinté bleu */
  --background: oklch(0.06 0.02 260);
  --foreground: oklch(0.985 0 0);
  /* Card : légèrement plus clair que bg */
  --card: oklch(0.10 0.01 260);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.10 0.01 260);
  --popover-foreground: oklch(0.985 0 0);
  /* Primary : violet #7c3aed */
  --primary: oklch(0.55 0.25 280);
  --primary-foreground: oklch(0.985 0 0);
  /* Secondary */
  --secondary: oklch(0.18 0.01 260);
  --secondary-foreground: oklch(0.985 0 0);
  /* Muted */
  --muted: oklch(0.18 0.01 260);
  --muted-foreground: oklch(0.65 0 0);
  /* Accent */
  --accent: oklch(0.18 0.01 260);
  --accent-foreground: oklch(0.985 0 0);
  /* Destructive */
  --destructive: oklch(0.63 0.24 25);
  /* Border / Input */
  --border: oklch(0.20 0.01 260);
  --input: oklch(0.10 0.01 260);
  /* Ring focus : violet */
  --ring: oklch(0.55 0.25 280);
  /* Chart colors (inchangés) */
  --chart-1: oklch(0.77 0.17 75);
  --chart-2: oklch(0.65 0.17 160);
  --chart-3: oklch(0.7 0.15 250);
  --chart-4: oklch(0.8 0.15 85);
  --chart-5: oklch(0.63 0.24 25);
  /* Sidebar */
  --sidebar: oklch(0.07 0.02 265);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.55 0.25 280);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.14 0.01 260);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(0.16 0.02 265);
  --sidebar-ring: oklch(0.55 0.25 280);
  /* Semantic */
  --success: oklch(0.65 0.17 160);
  --warning: oklch(0.8 0.15 85);
  --info: oklch(0.7 0.15 250);
  /* Glow variables (utilisées dans les composants via inline styles) */
  --glow-primary: rgba(124, 58, 237, 0.3);
  --glow-danger: rgba(239, 68, 68, 0.2);
}
```

- [ ] **Step 2 : Ajouter les classes utilitaires glass après le bloc `@layer base`**

Ajouter à la fin de `globals.css` :

```css
@layer utilities {
  /* Glass neutre */
  .glass {
    background: rgba(255, 255, 255, 0.04);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3),
                inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }

  /* Glass violet (card mise en valeur : CA Potentiel, item actif sidebar) */
  .glass-violet {
    background: rgba(124, 58, 237, 0.1);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(124, 58, 237, 0.25);
    box-shadow: 0 4px 24px rgba(124, 58, 237, 0.15),
                inset 0 1px 0 rgba(167, 139, 250, 0.12);
  }

  /* Glass danger (card À relancer quand urgences présentes) */
  .glass-danger {
    background: rgba(239, 68, 68, 0.07);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(239, 68, 68, 0.2);
    box-shadow: 0 4px 24px rgba(239, 68, 68, 0.08),
                inset 0 1px 0 rgba(252, 165, 165, 0.08);
  }

  /* Ligne de reflet haut de card */
  .glow-line::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(167, 139, 250, 0.3), transparent);
    pointer-events: none;
  }

  /* Glow line variante danger */
  .glow-line-danger::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.4), transparent);
    pointer-events: none;
  }
}
```

- [ ] **Step 3 : Vérifier dans le navigateur**

Le CRM doit déjà changer d'apparence : fond légèrement bleuté, boutons et focus rings violets. Les cards existantes doivent avoir un border plus discret.

- [ ] **Step 4 : Commit**

```bash
cd crm && git add src/app/globals.css && git commit -m "feat(crm): redesign tokens — violet primary + blueish dark bg"
```

---

## Task 2 : Fond gradient + ambient blobs (`(dashboard)/layout.tsx`)

**Files:**
- Modify: `crm/src/app/(dashboard)/layout.tsx`

- [ ] **Step 1 : Ajouter le fond gradient et les blobs d'ambiance**

Remplacer la fonction `DashboardLayout` :

```tsx
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LayoutProvider>
      <div
        className="relative flex min-h-screen overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #0a0814 0%, #090b18 50%, #080d14 100%)",
        }}
      >
        {/* Ambient blob violet — haut droite */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed right-0 top-0 h-96 w-96 -translate-y-1/2 translate-x-1/2"
          style={{
            background:
              "radial-gradient(circle, rgba(124,58,237,0.08), transparent 70%)",
          }}
        />
        {/* Ambient blob bleu — bas gauche */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed bottom-0 left-60 h-72 w-72 translate-y-1/2"
          style={{
            background:
              "radial-gradient(circle, rgba(59,130,246,0.05), transparent 70%)",
          }}
        />
        <Sidebar />
        <MainContent>{children}</MainContent>
      </div>
    </LayoutProvider>
  );
}
```

- [ ] **Step 2 : Vérifier dans le navigateur**

Le fond doit afficher un gradient sombre légèrement bleuté avec des halos lumineux subtils.

- [ ] **Step 3 : Commit**

```bash
git add src/app/\(dashboard\)/layout.tsx && git commit -m "feat(crm): add gradient background + ambient glow blobs to dashboard layout"
```

---

## Task 3 : Sidebar glass violet (`sidebar.tsx` + `sidebar-item.tsx`)

**Files:**
- Modify: `crm/src/components/layout/sidebar.tsx`
- Modify: `crm/src/components/layout/sidebar-item.tsx`

- [ ] **Step 1 : Mettre à jour `sidebar.tsx` — logo glow + fond glass + avatar utilisateur**

Remplacer le contenu complet de `sidebar.tsx` :

```tsx
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
        <div className="flex h-14 items-center gap-3 px-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div
            className="flex size-8 shrink-0 items-center justify-center rounded-lg font-bold text-white"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
              boxShadow: "0 0 16px rgba(124,58,237,0.5), inset 0 1px 0 rgba(255,255,255,0.2)",
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
        <div className="px-3 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {(!collapsed || mobileOpen) && (
            <div className="mb-3 flex items-center gap-2.5 px-2">
              <div
                className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{ background: "linear-gradient(135deg, #7c3aed, #a78bfa)" }}
              >
                B
              </div>
              <div>
                <p className="text-xs font-medium text-white/80">Benjamin Bourger</p>
                <p className="text-xs text-white/35">Steenvoorde</p>
              </div>
            </div>
          )}
          {collapsed && !mobileOpen && (
            <div className="mb-3 flex justify-center">
              <div
                className="flex size-7 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{ background: "linear-gradient(135deg, #7c3aed, #a78bfa)" }}
              >
                B
              </div>
            </div>
          )}
          <button
            onClick={toggle}
            className="hidden w-full items-center justify-center rounded-lg p-2 transition-colors duration-200 text-white/40 hover:text-white/80 hover:bg-white/08 md:flex"
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
```

- [ ] **Step 2 : Mettre à jour `sidebar-item.tsx` — item actif glass violet**

Remplacer le contenu complet de `sidebar-item.tsx` :

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayout } from "./layout-provider";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import type { LucideIcon } from "lucide-react";

interface SidebarItemProps {
  href: string;
  icon: LucideIcon;
  label: string;
}

export function SidebarItem({ href, icon: Icon, label }: SidebarItemProps) {
  const pathname = usePathname();
  const { collapsed, mobileOpen, closeMobile } = useLayout();

  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
  const isCollapsed = collapsed && !mobileOpen;

  const baseClasses =
    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200";

  const activeStyle = {
    background: "rgba(124,58,237,0.15)",
    border: "1px solid rgba(124,58,237,0.25)",
    boxShadow: "0 0 12px rgba(124,58,237,0.1), inset 0 1px 0 rgba(167,139,250,0.1)",
    color: "#a78bfa",
  };

  const inactiveClasses =
    "text-white/50 hover:text-white/90 hover:bg-white/05 border border-transparent";

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Link
              href={href}
              className={`${baseClasses} justify-center px-0 ${isActive ? "" : inactiveClasses}`}
              style={isActive ? activeStyle : undefined}
              onClick={closeMobile}
            >
              <Icon className="size-5 shrink-0" />
            </Link>
          }
        />
        <TooltipContent side="right" sideOffset={8}>
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link
      href={href}
      className={`${baseClasses} ${isActive ? "" : inactiveClasses}`}
      style={isActive ? activeStyle : undefined}
      onClick={closeMobile}
    >
      <Icon className="size-5 shrink-0" />
      <span>{label}</span>
    </Link>
  );
}
```

- [ ] **Step 3 : Vérifier dans le navigateur**

La sidebar doit afficher : fond glass translucide, logo violet avec glow, item actif en verre violet, avatar "B" en bas.

- [ ] **Step 4 : Commit**

```bash
git add src/components/layout/sidebar.tsx src/components/layout/sidebar-item.tsx && git commit -m "feat(crm): sidebar glass effect — violet logo glow + active item glass + user avatar"
```

---

## Task 4 : Stat cards glass (`stat-card.tsx`)

**Files:**
- Modify: `crm/src/components/dashboard/stat-card.tsx`

- [ ] **Step 1 : Ajouter le support des variantes glass**

La `StatCard` existante ne supporte pas de variantes. On ajoute une prop `variant` et on remplace le rendu :

```tsx
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  subtitleColor?: string;
  variant?: "default" | "violet" | "danger";
}

export function StatCard({
  label,
  value,
  subtitle,
  subtitleColor,
  variant = "default",
}: StatCardProps) {
  const glassClass =
    variant === "violet"
      ? "glass-violet"
      : variant === "danger"
        ? "glass-danger"
        : "glass";

  const glowLineClass =
    variant === "danger" ? "glow-line-danger" : "glow-line";

  return (
    <div
      className={cn(
        "relative rounded-xl p-4 overflow-hidden",
        glassClass,
        glowLineClass
      )}
    >
      <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-white/40">
        {label}
      </p>
      <p className="mt-2 text-[2rem] font-bold leading-none tracking-tight text-white">
        {value}
      </p>
      {subtitle && (
        <p className={cn("mt-1.5 text-[10px]", subtitleColor ?? "text-white/35")}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2 : Mettre à jour les appels dans `page.tsx` du dashboard**

Ouvrir `crm/src/app/(dashboard)/page.tsx` et trouver les 4 `<StatCard>`. Ajouter `variant` sur celles qui le nécessitent :

```tsx
<StatCard
  label="Prospects"
  value={totalProspects}
  subtitle={`${hauteCount} haute priorité`}
  subtitleColor="text-violet-400"
/>
<StatCard
  label="Maquettes"
  value={maquettesCount}
  subtitle="envoyées ou validées"
/>
<StatCard
  label="CA potentiel"
  value={`${caPotentiel.toLocaleString("fr-FR")} €`}
  subtitle={`${hauteCount} prospects × 400 €`}
  subtitleColor="text-emerald-400"
  variant="violet"
/>
<StatCard
  label="À relancer"
  value={relances.length}
  subtitle={relances.length === 0 ? "tout est à jour" : "urgents"}
  subtitleColor={relances.length === 0 ? "text-emerald-400" : "text-red-400"}
  variant={relances.length > 0 ? "danger" : "default"}
/>
```

- [ ] **Step 3 : Vérifier dans le navigateur**

Les 4 cards doivent afficher : glass neutre, glass violet pour CA, glass rouge si relances urgentes. La ligne de reflet doit être visible en haut de chaque card.

- [ ] **Step 4 : Commit**

```bash
git add src/components/dashboard/stat-card.tsx src/app/\(dashboard\)/page.tsx && git commit -m "feat(crm): stat-card glass variants — neutral/violet/danger with glow line"
```

---

## Task 5 : Pipeline bar glass + glow (`pipeline-bar.tsx`)

**Files:**
- Modify: `crm/src/components/dashboard/pipeline-bar.tsx`

- [ ] **Step 1 : Réécrire `pipeline-bar.tsx`**

Remplacer le contenu complet :

```tsx
const PIPELINE_COLORS: Record<string, { from: string; to: string; glow: string; dot: string }> = {
  PROSPECT: { from: "#ef4444", to: "#dc2626", glow: "rgba(239,68,68,0.4)", dot: "#ef4444" },
  CONTACTE: { from: "#eab308", to: "#ca8a04", glow: "rgba(234,179,8,0.4)", dot: "#eab308" },
  RDV:      { from: "#3b82f6", to: "#2563eb", glow: "rgba(59,130,246,0.4)", dot: "#3b82f6" },
  DEVIS:    { from: "#a855f7", to: "#9333ea", glow: "rgba(168,85,247,0.4)", dot: "#a855f7" },
  SIGNE:    { from: "#22c55e", to: "#16a34a", glow: "rgba(34,197,94,0.4)",  dot: "#22c55e" },
  LIVRE:    { from: "#10b981", to: "#059669", glow: "rgba(16,185,129,0.4)", dot: "#10b981" },
};

const PIPELINE_LABELS: Record<string, string> = {
  PROSPECT: "Prospect",
  CONTACTE: "Contacté",
  RDV: "RDV",
  DEVIS: "Devis",
  SIGNE: "Signé",
  LIVRE: "Livré",
};

interface PipelineBarProps {
  segments: { status: string; count: number }[];
}

export function PipelineBar({ segments }: PipelineBarProps) {
  const total = segments.reduce((sum, s) => sum + s.count, 0);
  const visible = segments.filter((s) => s.count > 0);

  return (
    <div className="glass relative overflow-hidden rounded-xl p-4 glow-line">
      <p className="mb-3 text-[9px] font-medium uppercase tracking-[0.12em] text-white/40">
        Pipeline
      </p>
      {total === 0 ? (
        <p className="text-sm text-white/30">Aucun prospect</p>
      ) : (
        <>
          {/* Barre segmentée */}
          <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full mb-3">
            {visible.map((seg) => {
              const c = PIPELINE_COLORS[seg.status] ?? { from: "#94a3b8", to: "#64748b", glow: "rgba(148,163,184,0.3)", dot: "#94a3b8" };
              const pct = (seg.count / total) * 100;
              return (
                <div
                  key={seg.status}
                  style={{
                    width: `${pct}%`,
                    minWidth: "1.5rem",
                    background: `linear-gradient(90deg, ${c.from}, ${c.to})`,
                    boxShadow: `0 0 8px ${c.glow}`,
                  }}
                />
              );
            })}
          </div>

          {/* Légende dots */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {visible.map((seg) => {
              const c = PIPELINE_COLORS[seg.status] ?? { from: "#94a3b8", to: "#64748b", glow: "rgba(148,163,184,0.3)", dot: "#94a3b8" };
              return (
                <span
                  key={seg.status}
                  className="flex items-center gap-1.5 text-[9px] text-white/50 uppercase tracking-[0.08em]"
                >
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: c.dot,
                      boxShadow: `0 0 4px ${c.glow}`,
                    }}
                  />
                  {PIPELINE_LABELS[seg.status] ?? seg.status} · {seg.count}
                </span>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2 : Vérifier dans le navigateur**

La pipeline bar doit afficher : container glass, segments avec glow coloré, dots lumineux en légende.

- [ ] **Step 3 : Commit**

```bash
git add src/components/dashboard/pipeline-bar.tsx && git commit -m "feat(crm): pipeline-bar glass container + glowing segments + dot legend"
```

---

## Task 6 : Activité récente + Alertes relance glass

**Files:**
- Modify: `crm/src/components/dashboard/recent-activity.tsx`
- Modify: `crm/src/components/dashboard/alerts-relance.tsx`

- [ ] **Step 1 : Réécrire `recent-activity.tsx`**

Remplacer le contenu complet :

```tsx
interface ActivityItem {
  id: string;
  type: string;
  description: string;
  date: Date;
}

interface RecentActivityProps {
  activites: ActivityItem[];
}

const TYPE_DOT_COLORS: Record<string, { bg: string; glow: string }> = {
  CREATION: { bg: "#3b82f6", glow: "rgba(59,130,246,0.5)" },
  CONTACT:  { bg: "#eab308", glow: "rgba(234,179,8,0.4)" },
  MAQUETTE: { bg: "#a78bfa", glow: "rgba(167,139,250,0.5)" },
  DEVIS:    { bg: "#34d399", glow: "rgba(52,211,153,0.4)" },
  RELANCE:  { bg: "#fb923c", glow: "rgba(251,146,60,0.4)" },
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function RecentActivity({ activites }: RecentActivityProps) {
  return (
    <div className="glass relative overflow-hidden rounded-xl p-4 glow-line">
      <p className="mb-3 text-[9px] font-medium uppercase tracking-[0.12em] text-white/40">
        Activité récente
      </p>
      {activites.length === 0 ? (
        <p className="text-sm text-white/25 italic">Aucune activité</p>
      ) : (
        <ul className="space-y-2.5">
          {activites.map((a) => {
            const dot = TYPE_DOT_COLORS[a.type] ?? { bg: "#71717a", glow: "rgba(113,113,122,0.3)" };
            return (
              <li key={a.id} className="flex items-center gap-3">
                <span
                  className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: dot.bg, boxShadow: `0 0 6px ${dot.glow}` }}
                />
                <p className="flex-1 min-w-0 truncate text-[10px] leading-snug text-white/70">
                  {a.description}
                </p>
                <span className="shrink-0 text-[9px] text-white/25">
                  {formatDate(a.date)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2 : Réécrire `alerts-relance.tsx`**

Remplacer le contenu complet :

```tsx
import Link from "next/link";

interface RelanceItem {
  id: string;
  nom: string;
  ville: string;
  priorite: string;
  daysSinceContact: number;
}

interface AlertsRelanceProps {
  relances: RelanceItem[];
}

const PRIORITE_STYLES: Record<string, { badge: string; border: string }> = {
  HAUTE:   { badge: "bg-red-500/15 text-red-400",    border: "border border-red-500/30" },
  MOYENNE: { badge: "bg-yellow-500/15 text-yellow-400", border: "border border-yellow-500/30" },
  BASSE:   { badge: "bg-zinc-500/15 text-zinc-400",  border: "border border-zinc-500/20" },
};

export function AlertsRelance({ relances }: AlertsRelanceProps) {
  const hasUrgent = relances.length > 0;

  return (
    <div
      className={`relative overflow-hidden rounded-xl p-4 ${hasUrgent ? "glass-danger glow-line-danger" : "glass glow-line"}`}
    >
      <p className="mb-3 text-[9px] font-medium uppercase tracking-[0.12em] text-white/40">
        À relancer ({relances.length})
      </p>
      {relances.length === 0 ? (
        <p className="text-sm text-white/25 italic">Aucune relance nécessaire</p>
      ) : (
        <ul className="space-y-2.5">
          {relances.map((r) => {
            const style = PRIORITE_STYLES[r.priorite] ?? PRIORITE_STYLES.BASSE;
            const daysColor =
              r.daysSinceContact >= 14
                ? "text-red-400"
                : r.daysSinceContact >= 7
                  ? "text-yellow-400"
                  : "text-white/40";
            return (
              <li key={r.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/prospects/${r.id}`}
                    className="text-[10px] font-medium text-white/80 hover:text-violet-300 transition-colors"
                  >
                    {r.nom}
                  </Link>
                  <p className="text-[9px] text-white/35">{r.ville}</p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-medium ${style.badge} ${style.border}`}
                >
                  {r.priorite}
                </span>
                <span className={`shrink-0 text-[10px] font-medium ${daysColor}`}>
                  {r.daysSinceContact}j
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 3 : Vérifier dans le navigateur**

Dashboard complet : tous les composants en glass, dots colorés avec glow, badges priorité en dark-mode correct.

- [ ] **Step 4 : Commit final**

```bash
git add src/components/dashboard/recent-activity.tsx src/components/dashboard/alerts-relance.tsx && git commit -m "feat(crm): dashboard glass — activity dots glow + alerts relance dark-mode badges"
```
