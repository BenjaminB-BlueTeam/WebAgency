# Prospects UI (Liste + Fiche) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete prospects UI — filterable/sortable list page with expandable rows, and a detail page with tabbed interface.

**Architecture:** Server components fetch data via internal API, pass to client components for interactivity. Framer Motion for all animations. shadcn/ui for form controls and tabs. Design system "Noir Absolu" strictly enforced.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS v4, Framer Motion (motion package), shadcn/ui, Lucide React icons, Sonner toasts

**Spec:** `docs/superpowers/specs/2026-04-04-prospects-ui-design.md`

---

### Task 1: Install shadcn components + add expandCollapse animation

**Files:**
- Modify: `src/lib/animations.ts` (add expandCollapse variant)
- Create: `src/components/ui/select.tsx` (via shadcn CLI)
- Create: `src/components/ui/slider.tsx` (via shadcn CLI)
- Create: `src/components/ui/skeleton.tsx` (via shadcn CLI)

- [ ] **Step 1: Install shadcn components**

Run:
```bash
npx shadcn@latest add select slider skeleton -y
```

- [ ] **Step 2: Add expandCollapse animation variant**

In `src/lib/animations.ts`, add after the `hoverLift` export (around line 30):

```typescript
/** Expand/collapse pour panneaux inline */
export const expandCollapse: Variants = {
  initial: { height: 0, opacity: 0, overflow: "hidden" },
  animate: {
    height: "auto",
    opacity: 1,
    overflow: "hidden",
    transition: { height: { duration: 0.3, ease: "easeOut" }, opacity: { duration: 0.2, ease: "easeOut" } },
  },
  exit: {
    height: 0,
    opacity: 0,
    overflow: "hidden",
    transition: { height: { duration: 0.2, ease: "easeIn" }, opacity: { duration: 0.15, ease: "easeIn" } },
  },
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/select.tsx src/components/ui/slider.tsx src/components/ui/skeleton.tsx src/lib/animations.ts
git commit -m "chore: add shadcn select/slider/skeleton + expandCollapse animation"
```

---

### Task 2: Shared UI components (status-badge, score-bar, empty-state)

**Files:**
- Create: `src/components/prospects/status-badge.tsx`
- Create: `src/components/prospects/score-bar.tsx`
- Create: `src/components/prospects/empty-state.tsx`

- [ ] **Step 1: Create status-badge.tsx**

Create `src/components/prospects/status-badge.tsx`:

```tsx
"use client"

import type { StatutPipeline } from "@/lib/validation"

const STATUT_CONFIG: Record<StatutPipeline, { label: string; color: string }> = {
  A_DEMARCHER: { label: "A démarcher", color: "#737373" },
  CONTACTE: { label: "Contacté", color: "#fafafa" },
  RDV_PLANIFIE: { label: "RDV planifié", color: "#fbbf24" },
  MAQUETTE_ENVOYEE: { label: "Maquette envoyée", color: "#fbbf24" },
  RELANCE: { label: "Relance", color: "#fafafa" },
  SIGNE: { label: "Signé", color: "#4ade80" },
  PERDU: { label: "Perdu", color: "#f87171" },
}

export function StatusBadge({ statut }: { statut: string }) {
  const config = STATUT_CONFIG[statut as StatutPipeline] ?? {
    label: statut,
    color: "#737373",
  }

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: "#1a1a1a",
        color: config.color,
        borderRadius: "9999px",
      }}
    >
      {config.label}
    </span>
  )
}
```

- [ ] **Step 2: Create score-bar.tsx**

Create `src/components/prospects/score-bar.tsx`:

```tsx
"use client"

import { motion } from "motion/react"
import { progressBar } from "@/lib/animations"

interface ScoreBarProps {
  label: string
  value: number | null | undefined
}

export function ScoreBar({ label, value }: ScoreBarProps) {
  const displayValue = value ?? null
  const percentage = displayValue !== null ? displayValue * 10 : 0

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[#737373] w-24 shrink-0">{label}</span>
      <div className="flex-1 h-1 rounded-full" style={{ backgroundColor: "#1a1a1a" }}>
        {displayValue !== null && (
          <motion.div
            className="h-full rounded-full bg-white"
            variants={progressBar(percentage)}
            initial="initial"
            animate="animate"
          />
        )}
      </div>
      <span className="text-xs text-[#737373] w-8 text-right">
        {displayValue !== null ? `${displayValue}/10` : "\u2014"}
      </span>
    </div>
  )
}
```

- [ ] **Step 3: Create empty-state.tsx**

Create `src/components/prospects/empty-state.tsx`:

```tsx
"use client"

import Link from "next/link"
import { Users } from "lucide-react"
import { motion } from "motion/react"
import { fadeInUp } from "@/lib/animations"
import { Button } from "@/components/ui/button"

export function EmptyState() {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-20 text-center"
      variants={fadeInUp}
      initial="initial"
      animate="animate"
    >
      <Users size={48} className="text-[#555555] mb-4" />
      <h2 className="text-lg font-semibold text-[#fafafa] mb-2">
        Commencez par rechercher des prospects
      </h2>
      <p className="text-sm text-[#737373] max-w-md mb-6">
        Utilisez la recherche pour trouver des entreprises dans votre zone,
        {" "}évaluez leur potentiel et démarrez votre prospection.
      </p>
      <Button asChild>
        <Link href="/recherche">Lancer une recherche</Link>
      </Button>
    </motion.div>
  )
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 5: Commit**

```bash
git add src/components/prospects/
git commit -m "feat: add status-badge, score-bar, empty-state components"
```

---

### Task 3: Prospect types + date utility

**Files:**
- Create: `src/types/prospect.ts`
- Create: `src/lib/date.ts`

- [ ] **Step 1: Create prospect types**

Create `src/types/prospect.ts`:

```typescript
export interface Prospect {
  id: string
  nom: string
  activite: string
  ville: string
  adresse: string | null
  telephone: string | null
  email: string | null
  siteUrl: string | null
  placeId: string | null
  noteGoogle: number | null
  nbAvisGoogle: number | null
  scorePresenceWeb: number | null
  scoreSEO: number | null
  scoreDesign: number | null
  scoreFinancier: number | null
  scorePotentiel: number | null
  scoreGlobal: number | null
  statutPipeline: string
  dateContact: string | null
  dateRdv: string | null
  dateMaquetteEnvoi: string | null
  dateSignature: string | null
  raisonPerte: string | null
  derniereRelance: string | null
  prochaineRelance: string | null
  createdAt: string
  updatedAt: string
}

export interface ProspectWithRelations extends Prospect {
  maquettes: Maquette[]
  analyses: Analyse[]
  emails: Email[]
  notes: Note[]
  activites: Activite[]
}

export interface Maquette {
  id: string
  prospectId: string
  html: string
  demoUrl: string | null
  version: number
  statut: string
  createdAt: string
}

export interface Analyse {
  id: string
  prospectId: string
  concurrents: string
  recommandations: string
  createdAt: string
}

export interface Email {
  id: string
  prospectId: string
  type: string
  sujet: string
  contenu: string
  statut: string
  dateEnvoi: string | null
  createdAt: string
}

export interface Note {
  id: string
  prospectId: string
  contenu: string
  createdAt: string
}

export interface Activite {
  id: string
  prospectId: string | null
  type: string
  description: string
  createdAt: string
}
```

- [ ] **Step 2: Create date utility**

Create `src/lib/date.ts`:

```typescript
const SECONDS = 1
const MINUTES = 60 * SECONDS
const HOURS = 60 * MINUTES
const DAYS = 24 * HOURS
const MONTHS = 30 * DAYS

export function timeAgo(dateString: string): string {
  const now = Date.now()
  const date = new Date(dateString).getTime()
  const diff = Math.floor((now - date) / 1000)

  if (diff < MINUTES) return "à l'instant"
  if (diff < HOURS) {
    const m = Math.floor(diff / MINUTES)
    return `il y a ${m} min`
  }
  if (diff < DAYS) {
    const h = Math.floor(diff / HOURS)
    return `il y a ${h}h`
  }
  if (diff < MONTHS) {
    const d = Math.floor(diff / DAYS)
    return `il y a ${d}j`
  }
  const mo = Math.floor(diff / MONTHS)
  return `il y a ${mo} mois`
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/types/prospect.ts src/lib/date.ts
git commit -m "feat: add prospect types and date utility"
```

---

### Task 4: Prospect filters

**Files:**
- Create: `src/components/prospects/prospect-filters.tsx`

- [ ] **Step 1: Create prospect-filters.tsx**

Create `src/components/prospects/prospect-filters.tsx`:

```tsx
"use client"

import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { STATUT_PIPELINE_VALUES } from "@/lib/validation"

const STATUT_LABELS: Record<string, string> = {
  A_DEMARCHER: "A démarcher",
  CONTACTE: "Contacté",
  RDV_PLANIFIE: "RDV planifié",
  MAQUETTE_ENVOYEE: "Maquette envoyée",
  RELANCE: "Relance",
  SIGNE: "Signé",
  PERDU: "Perdu",
}

interface ProspectFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  statut: string
  onStatutChange: (value: string) => void
  scoreMin: number
  onScoreMinChange: (value: number) => void
}

export function ProspectFilters({
  search,
  onSearchChange,
  statut,
  onStatutChange,
  scoreMin,
  onScoreMinChange,
}: ProspectFiltersProps) {
  return (
    <div className="flex flex-col md:flex-row gap-3 mb-6">
      <div className="relative flex-1">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555555]"
        />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher un prospect..."
          className="pl-9 bg-[#0a0a0a] border-[#1a1a1a]"
        />
      </div>
      <Select value={statut} onValueChange={onStatutChange}>
        <SelectTrigger className="w-full md:w-[180px] bg-[#0a0a0a] border-[#1a1a1a]">
          <SelectValue placeholder="Tous les statuts" />
        </SelectTrigger>
        <SelectContent className="bg-[#0a0a0a] border-[#1a1a1a]">
          <SelectItem value="all">Tous les statuts</SelectItem>
          {STATUT_PIPELINE_VALUES.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUT_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex items-center gap-2 min-w-[180px]">
        <span className="text-xs text-[#737373] whitespace-nowrap">
          Score min: {scoreMin}
        </span>
        <Slider
          value={[scoreMin]}
          onValueChange={([v]) => onScoreMinChange(v)}
          min={0}
          max={10}
          step={1}
          className="flex-1"
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/prospects/prospect-filters.tsx
git commit -m "feat: add prospect filters (search, statut, score slider)"
```

---

### Task 5: Score pastille + prospect row + expand panel

**Files:**
- Create: `src/components/prospects/score-pastille.tsx`
- Create: `src/components/prospects/prospect-row.tsx`
- Create: `src/components/prospects/prospect-expand.tsx`

- [ ] **Step 1: Create score-pastille.tsx**

Create `src/components/prospects/score-pastille.tsx`:

```tsx
export function ScorePastille({
  score,
  size = 24,
}: {
  score: number | null | undefined
  size?: number
}) {
  const displayScore = score ?? null

  let bgColor = "#737373"
  if (displayScore !== null) {
    if (displayScore >= 7) bgColor = "#4ade80"
    else if (displayScore >= 4) bgColor = "#fbbf24"
    else bgColor = "#f87171"
  }

  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-bold"
      style={{
        width: size,
        height: size,
        backgroundColor: bgColor,
        color: displayScore !== null && displayScore >= 4 ? "#000" : "#fff",
        fontSize: size * 0.45,
      }}
    >
      {displayScore !== null ? displayScore : "\u2014"}
    </span>
  )
}
```

- [ ] **Step 2: Create prospect-expand.tsx**

Create `src/components/prospects/prospect-expand.tsx`:

```tsx
"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { Phone, Mail, MapPin, Globe, ExternalLink } from "lucide-react"
import { expandCollapse } from "@/lib/animations"
import { Button } from "@/components/ui/button"
import { ScoreBar } from "@/components/prospects/score-bar"
import type { Prospect } from "@/types/prospect"

export function ProspectExpand({ prospect }: { prospect: Prospect }) {
  return (
    <motion.div
      variants={expandCollapse}
      initial="initial"
      animate="animate"
      exit="exit"
      className="border-t border-[#1a1a1a] bg-[#0a0a0a]"
    >
      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contact info */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-[#737373] uppercase tracking-wider mb-2">
            Contact
          </h4>
          <div className="flex items-center gap-2 text-sm">
            <Phone size={14} className="text-[#555555]" />
            <span className="text-[#fafafa]">
              {prospect.telephone ?? "\u2014"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Mail size={14} className="text-[#555555]" />
            {prospect.email ? (
              <a
                href={`mailto:${prospect.email}`}
                className="text-[#fafafa] hover:underline"
              >
                {prospect.email}
              </a>
            ) : (
              <span className="text-[#555555]">{"\u2014"}</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin size={14} className="text-[#555555]" />
            <span className="text-[#fafafa]">
              {prospect.adresse ?? "\u2014"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Globe size={14} className="text-[#555555]" />
            {prospect.siteUrl ? (
              <a
                href={prospect.siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#fafafa] hover:underline flex items-center gap-1"
              >
                Site web <ExternalLink size={12} />
              </a>
            ) : (
              <span className="text-[#555555]">Aucun site</span>
            )}
          </div>
          {/* Google */}
          {prospect.noteGoogle !== null && (
            <div className="text-sm text-[#fafafa] mt-2">
              {"⭐"} {prospect.noteGoogle}/5
              {prospect.nbAvisGoogle !== null && (
                <span className="text-[#737373]">
                  {" "}({prospect.nbAvisGoogle} avis)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Scoring */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-[#737373] uppercase tracking-wider mb-2">
            Scoring
          </h4>
          <ScoreBar label="Présence Web" value={prospect.scorePresenceWeb} />
          <ScoreBar label="SEO" value={prospect.scoreSEO} />
          <ScoreBar label="Design" value={prospect.scoreDesign} />
          <ScoreBar label="Financier" value={prospect.scoreFinancier} />
          <ScoreBar label="Potentiel" value={prospect.scorePotentiel} />
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-medium text-[#737373] uppercase tracking-wider mb-2">
            Actions
          </h4>
          <Button asChild size="sm">
            <Link href={`/prospects/${prospect.id}`}>Voir fiche</Link>
          </Button>
          <Button variant="outline" size="sm" disabled className="opacity-50">
            Analyser concurrence
          </Button>
          <Button variant="outline" size="sm" disabled className="opacity-50">
            Démarcher
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 3: Create prospect-row.tsx**

Create `src/components/prospects/prospect-row.tsx`:

```tsx
"use client"

import { motion } from "motion/react"
import { Star } from "lucide-react"
import { staggerItem } from "@/lib/animations"
import { StatusBadge } from "@/components/prospects/status-badge"
import { ScorePastille } from "@/components/prospects/score-pastille"
import { timeAgo } from "@/lib/date"
import type { Prospect } from "@/types/prospect"

interface ProspectRowProps {
  prospect: Prospect
  isExpanded: boolean
  onToggle: () => void
}

export function ProspectRow({ prospect, isExpanded, onToggle }: ProspectRowProps) {
  return (
    <motion.tr
      variants={staggerItem}
      onClick={onToggle}
      className={`cursor-pointer border-b border-[#1a1a1a] transition-colors hover:bg-[#0a0a0a] ${
        isExpanded ? "bg-[#0a0a0a]" : ""
      }`}
    >
      <td className="py-3 px-4 text-sm text-[#fafafa] font-medium">
        {prospect.nom}
      </td>
      <td className="py-3 px-4 text-sm text-[#737373] hidden lg:table-cell">
        {prospect.activite}
      </td>
      <td className="py-3 px-4 text-sm text-[#737373] hidden md:table-cell">
        {prospect.ville}
      </td>
      <td className="py-3 px-4">
        <ScorePastille score={prospect.scoreGlobal} />
      </td>
      <td className="py-3 px-4 text-sm hidden lg:table-cell">
        {prospect.noteGoogle !== null ? (
          <span className="flex items-center gap-1 text-[#fafafa]">
            <Star size={12} className="text-[#fbbf24] fill-[#fbbf24]" />
            {prospect.noteGoogle}
          </span>
        ) : (
          <span className="text-[#555555]">{"\u2014"}</span>
        )}
      </td>
      <td className="py-3 px-4 text-sm hidden xl:table-cell">
        {prospect.siteUrl ? (
          <span className="text-[#4ade80]">Oui</span>
        ) : (
          <span className="text-[#555555]">Non</span>
        )}
      </td>
      <td className="py-3 px-4">
        <StatusBadge statut={prospect.statutPipeline} />
      </td>
      <td className="py-3 px-4 text-sm text-[#737373] hidden md:table-cell">
        {timeAgo(prospect.createdAt)}
      </td>
    </motion.tr>
  )
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 5: Commit**

```bash
git add src/components/prospects/score-pastille.tsx src/components/prospects/prospect-row.tsx src/components/prospects/prospect-expand.tsx
git commit -m "feat: add prospect row, expand panel, score pastille"
```

---

### Task 6: Mobile card component

**Files:**
- Create: `src/components/prospects/prospect-card-mobile.tsx`

- [ ] **Step 1: Create prospect-card-mobile.tsx**

Create `src/components/prospects/prospect-card-mobile.tsx`:

```tsx
"use client"

import { motion } from "motion/react"
import { staggerItem, hoverLift } from "@/lib/animations"
import { StatusBadge } from "@/components/prospects/status-badge"
import { ScorePastille } from "@/components/prospects/score-pastille"
import type { Prospect } from "@/types/prospect"

interface ProspectCardMobileProps {
  prospect: Prospect
  isExpanded: boolean
  onToggle: () => void
}

export function ProspectCardMobile({
  prospect,
  isExpanded,
  onToggle,
}: ProspectCardMobileProps) {
  return (
    <motion.div
      variants={staggerItem}
      {...hoverLift}
      onClick={onToggle}
      className={`cursor-pointer rounded-[6px] border border-[#1a1a1a] p-3 ${
        isExpanded ? "bg-[#0a0a0a]" : "bg-[#0a0a0a]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[#fafafa] truncate">
            {prospect.nom}
          </p>
          <p className="text-xs text-[#737373] truncate">{prospect.activite}</p>
        </div>
        <ScorePastille score={prospect.scoreGlobal} />
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs text-[#555555]">{prospect.ville}</span>
        <StatusBadge statut={prospect.statutPipeline} />
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/prospects/prospect-card-mobile.tsx
git commit -m "feat: add prospect mobile card component"
```

---

### Task 7: Prospect list (main client component)

**Files:**
- Create: `src/components/prospects/prospect-list.tsx`

This is the core client component that assembles filters, table/cards, expand, loading, and empty states.

- [ ] **Step 1: Create prospect-list.tsx**

Create `src/components/prospects/prospect-list.tsx`:

```tsx
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "motion/react"
import { ChevronUp, ChevronDown } from "lucide-react"
import { staggerContainer } from "@/lib/animations"
import { Skeleton } from "@/components/ui/skeleton"
import { ProspectFilters } from "@/components/prospects/prospect-filters"
import { ProspectRow } from "@/components/prospects/prospect-row"
import { ProspectCardMobile } from "@/components/prospects/prospect-card-mobile"
import { ProspectExpand } from "@/components/prospects/prospect-expand"
import { EmptyState } from "@/components/prospects/empty-state"
import type { Prospect } from "@/types/prospect"

type SortField = "nom" | "scoreGlobal" | "createdAt"

interface ProspectListProps {
  initialProspects: Prospect[]
}

export function ProspectList({ initialProspects }: ProspectListProps) {
  const [prospects, setProspects] = useState<Prospect[]>(initialProspects)
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState("")
  const [statut, setStatut] = useState("all")
  const [scoreMin, setScoreMin] = useState(0)
  const [sort, setSort] = useState<SortField>("createdAt")
  const [order, setOrder] = useState<"asc" | "desc">("desc")

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchProspects = useCallback(
    async (params: {
      search: string
      statut: string
      scoreMin: number
      sort: SortField
      order: "asc" | "desc"
    }) => {
      setLoading(true)
      try {
        const query = new URLSearchParams()
        if (params.search) query.set("search", params.search)
        if (params.statut !== "all") query.set("statut", params.statut)
        if (params.scoreMin > 0) query.set("scoreMin", String(params.scoreMin))
        query.set("sort", params.sort)
        query.set("order", params.order)

        const res = await fetch(`/api/prospects?${query.toString()}`)
        const json = await res.json()
        if (json.data) setProspects(json.data)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Debounced search
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        fetchProspects({ search: value, statut, scoreMin, sort, order })
      }, 300)
    },
    [statut, scoreMin, sort, order, fetchProspects]
  )

  // Immediate filter changes
  const handleStatutChange = useCallback(
    (value: string) => {
      setStatut(value)
      fetchProspects({ search, statut: value, scoreMin, sort, order })
    },
    [search, scoreMin, sort, order, fetchProspects]
  )

  const handleScoreMinChange = useCallback(
    (value: number) => {
      setScoreMin(value)
      fetchProspects({ search, statut, scoreMin: value, sort, order })
    },
    [search, statut, sort, order, fetchProspects]
  )

  const handleSort = useCallback(
    (field: SortField) => {
      const newOrder = sort === field && order === "desc" ? "asc" : "desc"
      setSort(field)
      setOrder(newOrder)
      fetchProspects({ search, statut, scoreMin, sort: field, order: newOrder })
    },
    [search, statut, scoreMin, sort, order, fetchProspects]
  )

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }, [])

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sort !== field) return null
    return order === "asc" ? (
      <ChevronUp size={14} className="inline ml-1" />
    ) : (
      <ChevronDown size={14} className="inline ml-1" />
    )
  }

  // Loading skeleton
  if (loading && prospects.length === 0) {
    return (
      <div>
        <ProspectFilters
          search={search}
          onSearchChange={handleSearchChange}
          statut={statut}
          onStatutChange={handleStatutChange}
          scoreMin={scoreMin}
          onScoreMinChange={handleScoreMinChange}
        />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full bg-[#0a0a0a]" />
          ))}
        </div>
      </div>
    )
  }

  // Empty state (no prospects at all, no filters applied)
  if (
    prospects.length === 0 &&
    !search &&
    statut === "all" &&
    scoreMin === 0 &&
    !loading
  ) {
    return <EmptyState />
  }

  return (
    <div>
      <ProspectFilters
        search={search}
        onSearchChange={handleSearchChange}
        statut={statut}
        onStatutChange={handleStatutChange}
        scoreMin={scoreMin}
        onScoreMinChange={handleScoreMinChange}
      />

      {loading && (
        <div className="mb-4 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full bg-[#0a0a0a]" />
          ))}
        </div>
      )}

      {!loading && prospects.length === 0 && (
        <p className="text-center text-sm text-[#555555] py-12">
          Aucun prospect trouvé pour ces filtres
        </p>
      )}

      {!loading && prospects.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1a1a1a]">
                  <th
                    className="py-2 px-4 text-left text-xs font-medium text-[#737373] uppercase tracking-wider cursor-pointer hover:text-[#fafafa]"
                    onClick={() => handleSort("nom")}
                  >
                    Nom <SortIcon field="nom" />
                  </th>
                  <th className="py-2 px-4 text-left text-xs font-medium text-[#737373] uppercase tracking-wider hidden lg:table-cell">
                    Activité
                  </th>
                  <th className="py-2 px-4 text-left text-xs font-medium text-[#737373] uppercase tracking-wider">
                    Ville
                  </th>
                  <th
                    className="py-2 px-4 text-left text-xs font-medium text-[#737373] uppercase tracking-wider cursor-pointer hover:text-[#fafafa]"
                    onClick={() => handleSort("scoreGlobal")}
                  >
                    Score <SortIcon field="scoreGlobal" />
                  </th>
                  <th className="py-2 px-4 text-left text-xs font-medium text-[#737373] uppercase tracking-wider hidden lg:table-cell">
                    Note Google
                  </th>
                  <th className="py-2 px-4 text-left text-xs font-medium text-[#737373] uppercase tracking-wider hidden xl:table-cell">
                    Site
                  </th>
                  <th className="py-2 px-4 text-left text-xs font-medium text-[#737373] uppercase tracking-wider">
                    Statut
                  </th>
                  <th
                    className="py-2 px-4 text-left text-xs font-medium text-[#737373] uppercase tracking-wider cursor-pointer hover:text-[#fafafa]"
                    onClick={() => handleSort("createdAt")}
                  >
                    Date <SortIcon field="createdAt" />
                  </th>
                </tr>
              </thead>
              <motion.tbody
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                {prospects.map((prospect) => (
                  <motion.tr key={prospect.id} style={{ display: "contents" }}>
                    <ProspectRow
                      prospect={prospect}
                      isExpanded={expandedId === prospect.id}
                      onToggle={() => toggleExpand(prospect.id)}
                    />
                    <AnimatePresence>
                      {expandedId === prospect.id && (
                        <tr>
                          <td colSpan={8} className="p-0">
                            <ProspectExpand prospect={prospect} />
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <motion.div
            className="md:hidden space-y-2"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {prospects.map((prospect) => (
              <div key={prospect.id}>
                <ProspectCardMobile
                  prospect={prospect}
                  isExpanded={expandedId === prospect.id}
                  onToggle={() => toggleExpand(prospect.id)}
                />
                <AnimatePresence>
                  {expandedId === prospect.id && (
                    <ProspectExpand prospect={prospect} />
                  )}
                </AnimatePresence>
              </div>
            ))}
          </motion.div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/components/prospects/prospect-list.tsx
git commit -m "feat: add prospect list with filters, table, mobile cards, expand"
```

---

### Task 8: Prospects list page (server component)

**Files:**
- Modify: `src/app/(dashboard)/prospects/page.tsx`

- [ ] **Step 1: Replace the placeholder page**

Replace contents of `src/app/(dashboard)/prospects/page.tsx` with:

```tsx
import { cookies } from "next/headers"
import { ProspectList } from "@/components/prospects/prospect-list"

async function getProspects() {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  const cookieHeader = allCookies
    .map((c) => `${c.name}=${c.value}`)
    .join("; ")

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"
  const res = await fetch(`${baseUrl}/api/prospects?sort=createdAt&order=desc`, {
    headers: { Cookie: cookieHeader },
    cache: "no-store",
  })

  if (!res.ok) return []
  const json = await res.json()
  return json.data ?? []
}

export default async function ProspectsPage() {
  const prospects = await getProspects()

  return (
    <div>
      <h1 className="text-xl font-bold text-[#fafafa] mb-6">Prospects</h1>
      <ProspectList initialProspects={prospects} />
    </div>
  )
}
```

- [ ] **Step 2: Verify the dev server runs**

Run: `npm run build 2>&1 | tail -20` (check for compile errors)

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/prospects/page.tsx
git commit -m "feat: wire prospects list page with SSR data fetching"
```

---

### Task 9: Prospect notes component

**Files:**
- Create: `src/components/prospects/prospect-notes.tsx`

- [ ] **Step 1: Create prospect-notes.tsx**

Create `src/components/prospects/prospect-notes.tsx`:

```tsx
"use client"

import { useState } from "react"
import { motion } from "motion/react"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import { staggerContainer, staggerItem } from "@/lib/animations"
import { Button } from "@/components/ui/button"
import { timeAgo } from "@/lib/date"
import type { Note } from "@/types/prospect"

interface ProspectNotesProps {
  prospectId: string
  initialNotes: Note[]
}

export function ProspectNotes({ prospectId, initialNotes }: ProspectNotesProps) {
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [contenu, setContenu] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleAdd() {
    if (!contenu.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/prospects/${prospectId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contenu: contenu.trim() }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? "Erreur lors de l'ajout")
        return
      }
      setNotes((prev) => [json.data, ...prev])
      setContenu("")
      toast.success("Note ajoutée")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(noteId: string) {
    const res = await fetch(`/api/notes/${noteId}`, { method: "DELETE" })
    if (!res.ok) {
      toast.error("Erreur lors de la suppression")
      return
    }
    setNotes((prev) => prev.filter((n) => n.id !== noteId))
    toast.success("Note supprimée")
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-[#737373] uppercase tracking-wider mb-3">
        Notes
      </h3>

      {/* Add note form */}
      <div className="flex gap-2 mb-4">
        <textarea
          value={contenu}
          onChange={(e) => setContenu(e.target.value)}
          placeholder="Ajouter une note..."
          rows={2}
          className="flex-1 resize-none rounded-[6px] border border-[#1a1a1a] bg-[#0a0a0a] px-3 py-2 text-sm text-[#fafafa] placeholder:text-[#555555] focus:outline-none focus:ring-1 focus:ring-white/50"
        />
        <Button
          onClick={handleAdd}
          disabled={submitting || !contenu.trim()}
          size="sm"
          className="self-end"
        >
          Ajouter
        </Button>
      </div>

      {/* Notes list */}
      {notes.length === 0 ? (
        <p className="text-sm text-[#555555]">Aucune note</p>
      ) : (
        <motion.div
          className="space-y-2"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {notes.map((note) => (
            <motion.div
              key={note.id}
              variants={staggerItem}
              className="flex items-start justify-between gap-2 rounded-[6px] border border-[#1a1a1a] bg-[#0a0a0a] p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm text-[#fafafa] whitespace-pre-wrap">
                  {note.contenu}
                </p>
                <p className="text-xs text-[#555555] mt-1">
                  {timeAgo(note.createdAt)}
                </p>
              </div>
              <button
                onClick={() => handleDelete(note.id)}
                className="text-[#555555] hover:text-[#f87171] transition-colors p-1"
              >
                <Trash2 size={14} />
              </button>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/prospects/prospect-notes.tsx
git commit -m "feat: add prospect notes component (list + add + delete)"
```

---

### Task 10: Prospect info tab

**Files:**
- Create: `src/components/prospects/prospect-info-tab.tsx`

- [ ] **Step 1: Create prospect-info-tab.tsx**

Create `src/components/prospects/prospect-info-tab.tsx`:

```tsx
"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Phone, Mail, MapPin, Globe, ExternalLink } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScoreBar } from "@/components/prospects/score-bar"
import { ScorePastille } from "@/components/prospects/score-pastille"
import { ProspectNotes } from "@/components/prospects/prospect-notes"
import { STATUT_PIPELINE_VALUES } from "@/lib/validation"
import type { ProspectWithRelations } from "@/types/prospect"

const STATUT_LABELS: Record<string, string> = {
  A_DEMARCHER: "A démarcher",
  CONTACTE: "Contacté",
  RDV_PLANIFIE: "RDV planifié",
  MAQUETTE_ENVOYEE: "Maquette envoyée",
  RELANCE: "Relance",
  SIGNE: "Signé",
  PERDU: "Perdu",
}

export function ProspectInfoTab({
  prospect,
}: {
  prospect: ProspectWithRelations
}) {
  const [statutPipeline, setStatutPipeline] = useState(prospect.statutPipeline)

  async function handleStatutChange(value: string) {
    const previous = statutPipeline
    setStatutPipeline(value)
    try {
      const res = await fetch(`/api/prospects/${prospect.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statutPipeline: value }),
      })
      if (!res.ok) {
        setStatutPipeline(previous)
        toast.error("Erreur lors de la mise à jour du statut")
        return
      }
      toast.success("Statut mis à jour")
    } catch {
      setStatutPipeline(previous)
      toast.error("Erreur réseau")
    }
  }

  return (
    <div className="space-y-8">
      {/* Statut pipeline */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-[#737373]">Statut :</span>
        <Select value={statutPipeline} onValueChange={handleStatutChange}>
          <SelectTrigger className="w-[200px] bg-[#0a0a0a] border-[#1a1a1a]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#0a0a0a] border-[#1a1a1a]">
            {STATUT_PIPELINE_VALUES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUT_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Contact info */}
      <div className="rounded-[6px] border border-[#1a1a1a] bg-[#0a0a0a] p-4">
        <h3 className="text-sm font-medium text-[#737373] uppercase tracking-wider mb-4">
          Informations
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoField label="Activité" value={prospect.activite} />
          <InfoField label="Ville" value={prospect.ville} />
          <InfoField label="Adresse" value={prospect.adresse} icon={<MapPin size={14} />} />
          <InfoField
            label="Téléphone"
            value={prospect.telephone}
            icon={<Phone size={14} />}
            href={prospect.telephone ? `tel:${prospect.telephone}` : undefined}
          />
          <InfoField
            label="Email"
            value={prospect.email}
            icon={<Mail size={14} />}
            href={prospect.email ? `mailto:${prospect.email}` : undefined}
          />
          <InfoField
            label="Site web"
            value={prospect.siteUrl ? "Voir le site" : null}
            icon={<Globe size={14} />}
            href={prospect.siteUrl ?? undefined}
            external
          />
        </div>
        {prospect.noteGoogle !== null && (
          <div className="mt-4 text-sm text-[#fafafa]">
            {"⭐"} {prospect.noteGoogle}/5
            {prospect.nbAvisGoogle !== null && (
              <span className="text-[#737373]">
                {" "}({prospect.nbAvisGoogle} avis)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Scoring */}
      <div className="rounded-[6px] border border-[#1a1a1a] bg-[#0a0a0a] p-4">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-sm font-medium text-[#737373] uppercase tracking-wider">
            Scoring
          </h3>
          <ScorePastille score={prospect.scoreGlobal} size={40} />
        </div>
        <div className="space-y-3">
          <ScoreBar label="Présence Web" value={prospect.scorePresenceWeb} />
          <ScoreBar label="SEO" value={prospect.scoreSEO} />
          <ScoreBar label="Design" value={prospect.scoreDesign} />
          <ScoreBar label="Financier" value={prospect.scoreFinancier} />
          <ScoreBar label="Potentiel" value={prospect.scorePotentiel} />
        </div>
      </div>

      {/* Notes */}
      <div className="rounded-[6px] border border-[#1a1a1a] bg-[#0a0a0a] p-4">
        <ProspectNotes prospectId={prospect.id} initialNotes={prospect.notes} />
      </div>
    </div>
  )
}

function InfoField({
  label,
  value,
  icon,
  href,
  external,
}: {
  label: string
  value: string | null
  icon?: React.ReactNode
  href?: string
  external?: boolean
}) {
  return (
    <div>
      <p className="text-xs text-[#555555] mb-0.5">{label}</p>
      {value && href ? (
        <a
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer" : undefined}
          className="text-sm text-[#fafafa] hover:underline flex items-center gap-1"
        >
          {icon && <span className="text-[#555555]">{icon}</span>}
          {value}
          {external && <ExternalLink size={12} />}
        </a>
      ) : (
        <p className="text-sm text-[#fafafa] flex items-center gap-1">
          {icon && <span className="text-[#555555]">{icon}</span>}
          {value ?? "\u2014"}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/prospects/prospect-info-tab.tsx
git commit -m "feat: add prospect info tab (contact, scoring, status, notes)"
```

---

### Task 11: Prospect activity tab

**Files:**
- Create: `src/components/prospects/prospect-activity-tab.tsx`

- [ ] **Step 1: Create prospect-activity-tab.tsx**

Create `src/components/prospects/prospect-activity-tab.tsx`:

```tsx
"use client"

import { motion } from "motion/react"
import {
  ArrowRightLeft,
  StickyNote,
  Mail,
  Search,
  Activity,
} from "lucide-react"
import { staggerContainer, fadeInUp } from "@/lib/animations"
import { timeAgo } from "@/lib/date"
import type { Activite } from "@/types/prospect"

const TYPE_ICONS: Record<string, React.ReactNode> = {
  CHANGEMENT_STATUT: <ArrowRightLeft size={14} />,
  NOTE: <StickyNote size={14} />,
  EMAIL: <Mail size={14} />,
  RECHERCHE: <Search size={14} />,
}

export function ProspectActivityTab({
  activites,
}: {
  activites: Activite[]
}) {
  if (activites.length === 0) {
    return (
      <p className="text-center text-sm text-[#555555] py-12">
        Aucune activité enregistrée
      </p>
    )
  }

  return (
    <motion.div
      className="relative pl-6"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* Timeline line */}
      <div
        className="absolute left-[11px] top-2 bottom-2 w-px"
        style={{ backgroundColor: "#1a1a1a" }}
      />

      {activites.map((activite) => (
        <motion.div
          key={activite.id}
          variants={fadeInUp}
          className="relative pb-6 last:pb-0"
        >
          {/* Timeline dot */}
          <div
            className="absolute -left-6 top-1 w-2 h-2 rounded-full border"
            style={{
              backgroundColor: "#1a1a1a",
              borderColor: "#333",
            }}
          />

          <div className="flex items-start gap-2">
            <span className="text-[#555555] mt-0.5">
              {TYPE_ICONS[activite.type] ?? <Activity size={14} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-[#fafafa]">{activite.description}</p>
              <p className="text-xs text-[#737373] mt-0.5">
                {timeAgo(activite.createdAt)}
              </p>
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/prospects/prospect-activity-tab.tsx
git commit -m "feat: add prospect activity tab with timeline"
```

---

### Task 12: Prospect detail page (tabs + server component)

**Files:**
- Create: `src/components/prospects/prospect-detail.tsx`
- Create: `src/app/(dashboard)/prospects/[id]/page.tsx`

- [ ] **Step 1: Create prospect-detail.tsx**

Create `src/components/prospects/prospect-detail.tsx`:

```tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "motion/react"
import { ArrowLeft, Search, Palette } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { slideIn } from "@/lib/animations"
import { StatusBadge } from "@/components/prospects/status-badge"
import { ProspectInfoTab } from "@/components/prospects/prospect-info-tab"
import { ProspectActivityTab } from "@/components/prospects/prospect-activity-tab"
import type { ProspectWithRelations } from "@/types/prospect"

export function ProspectDetail({
  prospect,
}: {
  prospect: ProspectWithRelations
}) {
  const [activeTab, setActiveTab] = useState("informations")

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/prospects"
          className="text-sm text-[#737373] hover:text-[#fafafa] transition-colors flex items-center gap-1 mb-4"
        >
          <ArrowLeft size={14} />
          Prospects
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-[#fafafa]">{prospect.nom}</h1>
          <StatusBadge statut={prospect.statutPipeline} />
        </div>
        <p className="text-sm text-[#737373] mt-1">
          {prospect.activite} — {prospect.ville}
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#0a0a0a] border border-[#1a1a1a]">
          <TabsTrigger value="informations">Informations</TabsTrigger>
          <TabsTrigger value="analyse">Analyse</TabsTrigger>
          <TabsTrigger value="maquette">Maquette</TabsTrigger>
          <TabsTrigger value="activite">Activité</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              variants={slideIn}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <TabsContent value="informations" forceMount={activeTab === "informations" ? true : undefined}>
                {activeTab === "informations" && (
                  <ProspectInfoTab prospect={prospect} />
                )}
              </TabsContent>

              <TabsContent value="analyse" forceMount={activeTab === "analyse" ? true : undefined}>
                {activeTab === "analyse" && (
                  <PlaceholderTab
                    icon={<Search size={48} className="text-[#555555]" />}
                    title="Aucune analyse concurrentielle"
                    buttonLabel="Lancer l'analyse"
                  />
                )}
              </TabsContent>

              <TabsContent value="maquette" forceMount={activeTab === "maquette" ? true : undefined}>
                {activeTab === "maquette" && (
                  <PlaceholderTab
                    icon={<Palette size={48} className="text-[#555555]" />}
                    title="Aucune maquette générée"
                    buttonLabel="Générer une maquette"
                  />
                )}
              </TabsContent>

              <TabsContent value="activite" forceMount={activeTab === "activite" ? true : undefined}>
                {activeTab === "activite" && (
                  <ProspectActivityTab activites={prospect.activites} />
                )}
              </TabsContent>
            </motion.div>
          </AnimatePresence>
        </div>
      </Tabs>
    </div>
  )
}

function PlaceholderTab({
  icon,
  title,
  buttonLabel,
}: {
  icon: React.ReactNode
  title: string
  buttonLabel: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4">{icon}</div>
      <p className="text-sm text-[#737373] mb-4">{title}</p>
      <Button variant="outline" disabled className="opacity-50">
        {buttonLabel}
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Create the page server component**

Create `src/app/(dashboard)/prospects/[id]/page.tsx`:

```tsx
import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import { ProspectDetail } from "@/components/prospects/prospect-detail"

async function getProspect(id: string) {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  const cookieHeader = allCookies
    .map((c) => `${c.name}=${c.value}`)
    .join("; ")

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"
  const res = await fetch(`${baseUrl}/api/prospects/${id}`, {
    headers: { Cookie: cookieHeader },
    cache: "no-store",
  })

  if (!res.ok) return null
  const json = await res.json()
  return json.data ?? null
}

export default async function ProspectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const prospect = await getProspect(id)

  if (!prospect) {
    notFound()
  }

  return <ProspectDetail prospect={prospect} />
}
```

- [ ] **Step 3: Verify build compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add src/components/prospects/prospect-detail.tsx src/app/\(dashboard\)/prospects/\[id\]/page.tsx
git commit -m "feat: add prospect detail page with tabs (info, analyse, maquette, activity)"
```

---

### Task 13: Final verification

**Files:** None (verification only)

- [ ] **Step 1: TypeScript check**

Run: `npx tsc --noEmit --pretty`
Expected: No errors.

- [ ] **Step 2: Lint check**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 3: Run existing tests**

Run: `npm run test`
Expected: All 11 tests still pass (no regressions).

- [ ] **Step 4: Build check**

Run: `npm run build 2>&1 | tail -30`
Expected: Build succeeds.

- [ ] **Step 5: Fix any issues and commit**

If fixes needed:
```bash
git add -A
git commit -m "fix: resolve build/lint issues in prospects UI"
```
