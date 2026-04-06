# Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer la page Dashboard placeholder par un vrai tableau de bord avec 5 widgets stats, mini pipeline, widget relances, et timeline d'activités.

**Architecture:** `lib/dashboard.ts` contient 3 fonctions de requête Prisma appelées directement par la page serveur (SSR) et exposées aussi via 3 API routes thin wrappers. 4 composants client gèrent les animations. La page est un Server Component async qui passe les données aux composants.

**Tech Stack:** Next.js App Router (Server Component), Prisma groupBy, motion/react (countUp, stagger, progressBar), Vitest.

---

## File Map

| Statut | Fichier | Rôle |
|--------|---------|------|
| Créer | `src/lib/dashboard.ts` | getDashboardStats, getDashboardRelances, getDashboardActivites |
| Créer | `src/app/api/dashboard/stats/route.ts` | GET — thin wrapper requireAuth + getDashboardStats |
| Créer | `src/app/api/dashboard/relances/route.ts` | GET — thin wrapper requireAuth + getDashboardRelances |
| Créer | `src/app/api/dashboard/activites/route.ts` | GET — thin wrapper requireAuth + getDashboardActivites |
| Créer | `src/components/dashboard/stat-card.tsx` | Carte stat individuelle avec countUp animé |
| Créer | `src/components/dashboard/stats-grid.tsx` | Grille 5 cartes avec stagger |
| Créer | `src/components/dashboard/pipeline-bar.tsx` | Barre horizontale répartition pipeline |
| Créer | `src/components/dashboard/relances-widget.tsx` | Liste relances avec badge compteur |
| Créer | `src/components/dashboard/activity-timeline.tsx` | Timeline 10 dernières activités |
| Modifier | `src/app/(dashboard)/page.tsx` | Remplacer placeholder par dashboard complet |
| Créer | `src/__tests__/lib/dashboard.test.ts` | Tests des 3 fonctions lib |
| Créer | `src/__tests__/api/dashboard.test.ts` | Tests des 3 routes API |

---

## Task 1 — lib/dashboard.ts (TDD)

**Files:**
- Create: `src/lib/dashboard.ts`
- Test: `src/__tests__/lib/dashboard.test.ts`

**Contexte :** `prisma` vient de `@/lib/db`. Les statuts pipeline valides sont : `A_DEMARCHER`, `MAQUETTE_EMAIL_ENVOYES`, `REPONDU`, `RDV_PLANIFIE`, `NEGOCIATION`, `CLIENT`, `PERDU`. `getDashboardStats` utilise `prisma.prospect.groupBy`. `getDashboardRelances` filtre par `prochaineRelance <= now` et exclut CLIENT/PERDU. `getDashboardActivites` prend les 10 dernières activités avec le nom du prospect via `include`.

- [ ] **Step 1: Écrire les tests**

Créer `src/__tests__/lib/dashboard.test.ts` :

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  prisma: {
    prospect: {
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    activite: {
      findMany: vi.fn(),
    },
  },
}))

import { getDashboardStats, getDashboardRelances, getDashboardActivites } from "@/lib/dashboard"
import { prisma } from "@/lib/db"

describe("getDashboardStats", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns zero counts when no prospects", async () => {
    vi.mocked(prisma.prospect.groupBy).mockResolvedValue([] as any)
    const stats = await getDashboardStats()
    expect(stats.totalProspects).toBe(0)
    expect(stats.aDemarcher).toBe(0)
    expect(stats.maquettesEnvoyees).toBe(0)
    expect(stats.clientsSignes).toBe(0)
    expect(stats.tauxConversion).toBe(0)
  })

  it("calculates tauxConversion as percentage rounded", async () => {
    vi.mocked(prisma.prospect.groupBy).mockResolvedValue([
      { statutPipeline: "A_DEMARCHER", _count: { _all: 8 } },
      { statutPipeline: "CLIENT", _count: { _all: 2 } },
    ] as any)
    const stats = await getDashboardStats()
    expect(stats.totalProspects).toBe(10)
    expect(stats.clientsSignes).toBe(2)
    expect(stats.tauxConversion).toBe(20)
  })

  it("returns pipeline with 7 entries, zero-filling missing statuts", async () => {
    vi.mocked(prisma.prospect.groupBy).mockResolvedValue([
      { statutPipeline: "A_DEMARCHER", _count: { _all: 5 } },
    ] as any)
    const stats = await getDashboardStats()
    expect(stats.pipeline).toHaveLength(7)
    expect(stats.pipeline[0].statut).toBe("A_DEMARCHER")
    expect(stats.pipeline[0].count).toBe(5)
    expect(stats.pipeline[1].count).toBe(0)
  })

  it("counts maquettesEnvoyees from MAQUETTE_EMAIL_ENVOYES statut", async () => {
    vi.mocked(prisma.prospect.groupBy).mockResolvedValue([
      { statutPipeline: "MAQUETTE_EMAIL_ENVOYES", _count: { _all: 3 } },
    ] as any)
    const stats = await getDashboardStats()
    expect(stats.maquettesEnvoyees).toBe(3)
  })
})

describe("getDashboardRelances", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns count=0 when no relances due", async () => {
    vi.mocked(prisma.prospect.findMany).mockResolvedValue([] as any)
    const result = await getDashboardRelances()
    expect(result.count).toBe(0)
    expect(result.prospects).toHaveLength(0)
  })

  it("returns prospects due for relance", async () => {
    const past = new Date(Date.now() - 86400000)
    vi.mocked(prisma.prospect.findMany).mockResolvedValue([
      { id: "p1", nom: "Garage Martin", activite: "Garagiste", ville: "Steenvoorde", prochaineRelance: past },
    ] as any)
    const result = await getDashboardRelances()
    expect(result.count).toBe(1)
    expect(result.prospects[0].id).toBe("p1")
    expect(result.prospects[0].prochaineRelance).toBe(past.toISOString())
  })

  it("queries with lte:now and excludes CLIENT and PERDU", async () => {
    vi.mocked(prisma.prospect.findMany).mockResolvedValue([] as any)
    await getDashboardRelances()
    const call = vi.mocked(prisma.prospect.findMany).mock.calls[0][0] as any
    expect(call.where.prochaineRelance.lte).toBeInstanceOf(Date)
    expect(call.where.statutPipeline).toEqual({ notIn: ["CLIENT", "PERDU"] })
  })
})

describe("getDashboardActivites", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns activites with prospectNom", async () => {
    vi.mocked(prisma.activite.findMany).mockResolvedValue([
      {
        id: "a1",
        type: "EMAIL",
        description: "Email envoyé",
        createdAt: new Date("2024-01-01T10:00:00Z"),
        prospectId: "p1",
        prospect: { nom: "Garage Martin" },
      },
    ] as any)
    const result = await getDashboardActivites()
    expect(result).toHaveLength(1)
    expect(result[0].prospectNom).toBe("Garage Martin")
    expect(result[0].type).toBe("EMAIL")
    expect(result[0].createdAt).toBe("2024-01-01T10:00:00.000Z")
  })

  it("returns prospectNom=null for orphaned activites", async () => {
    vi.mocked(prisma.activite.findMany).mockResolvedValue([
      {
        id: "a2",
        type: "RECHERCHE",
        description: "Recherche Places",
        createdAt: new Date("2024-01-01T10:00:00Z"),
        prospectId: null,
        prospect: null,
      },
    ] as any)
    const result = await getDashboardActivites()
    expect(result[0].prospectNom).toBeNull()
  })

  it("fetches max 10 activites ordered by createdAt desc", async () => {
    vi.mocked(prisma.activite.findMany).mockResolvedValue([] as any)
    await getDashboardActivites()
    const call = vi.mocked(prisma.activite.findMany).mock.calls[0][0] as any
    expect(call.take).toBe(10)
    expect(call.orderBy).toEqual({ createdAt: "desc" })
  })
})
```

- [ ] **Step 2: Vérifier que les tests échouent**

```bash
npx vitest run src/__tests__/lib/dashboard.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/dashboard'`

- [ ] **Step 3: Implémenter lib/dashboard.ts**

Créer `src/lib/dashboard.ts` :

```typescript
import { prisma } from "@/lib/db"

const PIPELINE_ORDER = [
  "A_DEMARCHER",
  "MAQUETTE_EMAIL_ENVOYES",
  "REPONDU",
  "RDV_PLANIFIE",
  "NEGOCIATION",
  "CLIENT",
  "PERDU",
] as const

const PIPELINE_LABELS: Record<string, string> = {
  A_DEMARCHER: "À démarcher",
  MAQUETTE_EMAIL_ENVOYES: "Email envoyé",
  REPONDU: "Répondu",
  RDV_PLANIFIE: "RDV planifié",
  NEGOCIATION: "Négociation",
  CLIENT: "Client",
  PERDU: "Perdu",
}

const PIPELINE_COLORS: Record<string, string> = {
  A_DEMARCHER: "#737373",
  MAQUETTE_EMAIL_ENVOYES: "#60a5fa",
  REPONDU: "#fbbf24",
  RDV_PLANIFIE: "#fbbf24",
  NEGOCIATION: "#fafafa",
  CLIENT: "#4ade80",
  PERDU: "#f87171",
}

export interface PipelineSlice {
  statut: string
  label: string
  count: number
  color: string
}

export interface DashboardStats {
  totalProspects: number
  aDemarcher: number
  maquettesEnvoyees: number
  clientsSignes: number
  tauxConversion: number
  pipeline: PipelineSlice[]
}

export interface DashboardRelance {
  id: string
  nom: string
  activite: string
  ville: string
  prochaineRelance: string
}

export interface DashboardRelances {
  count: number
  prospects: DashboardRelance[]
}

export interface DashboardActivite {
  id: string
  type: string
  description: string
  createdAt: string
  prospectNom: string | null
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const rows = await prisma.prospect.groupBy({
    by: ["statutPipeline"],
    _count: { _all: true },
  })

  const countByStatut: Record<string, number> = {}
  let total = 0
  for (const row of rows) {
    countByStatut[row.statutPipeline] = row._count._all
    total += row._count._all
  }

  const clientsSignes = countByStatut["CLIENT"] ?? 0
  const tauxConversion = total > 0 ? Math.round((clientsSignes / total) * 100) : 0

  const pipeline: PipelineSlice[] = PIPELINE_ORDER.map((statut) => ({
    statut,
    label: PIPELINE_LABELS[statut] ?? statut,
    count: countByStatut[statut] ?? 0,
    color: PIPELINE_COLORS[statut] ?? "#737373",
  }))

  return {
    totalProspects: total,
    aDemarcher: countByStatut["A_DEMARCHER"] ?? 0,
    maquettesEnvoyees: countByStatut["MAQUETTE_EMAIL_ENVOYES"] ?? 0,
    clientsSignes,
    tauxConversion,
    pipeline,
  }
}

export async function getDashboardRelances(): Promise<DashboardRelances> {
  const now = new Date()
  const prospects = await prisma.prospect.findMany({
    where: {
      prochaineRelance: { lte: now },
      statutPipeline: { notIn: ["CLIENT", "PERDU"] },
    },
    select: {
      id: true,
      nom: true,
      activite: true,
      ville: true,
      prochaineRelance: true,
    },
    orderBy: { prochaineRelance: "asc" },
    take: 10,
  })

  return {
    count: prospects.length,
    prospects: prospects.map((p) => ({
      id: p.id,
      nom: p.nom,
      activite: p.activite,
      ville: p.ville,
      prochaineRelance: p.prochaineRelance!.toISOString(),
    })),
  }
}

export async function getDashboardActivites(): Promise<DashboardActivite[]> {
  const activites = await prisma.activite.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      prospect: { select: { nom: true } },
    },
  })

  return activites.map((a) => ({
    id: a.id,
    type: a.type,
    description: a.description,
    createdAt: a.createdAt.toISOString(),
    prospectNom: a.prospect?.nom ?? null,
  }))
}
```

- [ ] **Step 4: Vérifier que les tests passent**

```bash
npx vitest run src/__tests__/lib/dashboard.test.ts
```

Expected: 9 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/dashboard.ts src/__tests__/lib/dashboard.test.ts
git commit -m "feat: add dashboard lib (getDashboardStats, getDashboardRelances, getDashboardActivites)"
```

---

## Task 2 — API routes dashboard (TDD)

**Files:**
- Create: `src/app/api/dashboard/stats/route.ts`
- Create: `src/app/api/dashboard/relances/route.ts`
- Create: `src/app/api/dashboard/activites/route.ts`
- Test: `src/__tests__/api/dashboard.test.ts`

**Contexte :** Routes thin wrappers — `requireAuth()` puis appel à la fonction lib. Réponse `{ data: ... }` en succès, `{ error: "Non autorisé" }` en 401. Les fonctions lib sont mockées dans les tests.

- [ ] **Step 1: Écrire les tests**

Créer `src/__tests__/api/dashboard.test.ts` :

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/dashboard", () => ({
  getDashboardStats: vi.fn(),
  getDashboardRelances: vi.fn(),
  getDashboardActivites: vi.fn(),
}))

import { GET as statsGET } from "@/app/api/dashboard/stats/route"
import { GET as relancesGET } from "@/app/api/dashboard/relances/route"
import { GET as activitesGET } from "@/app/api/dashboard/activites/route"
import { requireAuth } from "@/lib/auth"
import { getDashboardStats, getDashboardRelances, getDashboardActivites } from "@/lib/dashboard"

const mockStats = {
  totalProspects: 10,
  aDemarcher: 5,
  maquettesEnvoyees: 3,
  clientsSignes: 2,
  tauxConversion: 20,
  pipeline: [],
}

const mockRelances = { count: 1, prospects: [{ id: "p1", nom: "Test", activite: "X", ville: "Y", prochaineRelance: "2024-01-01T00:00:00.000Z" }] }
const mockActivites = [{ id: "a1", type: "EMAIL", description: "Email envoyé", createdAt: "2024-01-01T00:00:00.000Z", prospectNom: "Garage Martin" }]

function makeReq(url: string) {
  return new Request(url, { method: "GET" })
}

describe("GET /api/dashboard/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(undefined)
    vi.mocked(getDashboardStats).mockResolvedValue(mockStats)
  })

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"))
    const res = await statsGET(makeReq("http://localhost/api/dashboard/stats") as any)
    expect(res.status).toBe(401)
  })

  it("returns 200 with stats data", async () => {
    const res = await statsGET(makeReq("http://localhost/api/dashboard/stats") as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.totalProspects).toBe(10)
    expect(json.data.tauxConversion).toBe(20)
  })
})

describe("GET /api/dashboard/relances", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(undefined)
    vi.mocked(getDashboardRelances).mockResolvedValue(mockRelances)
  })

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"))
    const res = await relancesGET(makeReq("http://localhost/api/dashboard/relances") as any)
    expect(res.status).toBe(401)
  })

  it("returns 200 with relances data", async () => {
    const res = await relancesGET(makeReq("http://localhost/api/dashboard/relances") as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.count).toBe(1)
    expect(json.data.prospects).toHaveLength(1)
  })
})

describe("GET /api/dashboard/activites", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(undefined)
    vi.mocked(getDashboardActivites).mockResolvedValue(mockActivites)
  })

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"))
    const res = await activitesGET(makeReq("http://localhost/api/dashboard/activites") as any)
    expect(res.status).toBe(401)
  })

  it("returns 200 with activites data", async () => {
    const res = await activitesGET(makeReq("http://localhost/api/dashboard/activites") as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toHaveLength(1)
    expect(json.data[0].type).toBe("EMAIL")
  })
})
```

- [ ] **Step 2: Vérifier que les tests échouent**

```bash
npx vitest run src/__tests__/api/dashboard.test.ts
```

Expected: FAIL — `Cannot find module '…/dashboard/stats/route'`

- [ ] **Step 3: Créer les 3 routes**

Créer `src/app/api/dashboard/stats/route.ts` :

```typescript
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { getDashboardStats } from "@/lib/dashboard"

export async function GET(_request: NextRequest) {
  try {
    await requireAuth()
    const data = await getDashboardStats()
    return NextResponse.json({ data })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
```

Créer `src/app/api/dashboard/relances/route.ts` :

```typescript
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { getDashboardRelances } from "@/lib/dashboard"

export async function GET(_request: NextRequest) {
  try {
    await requireAuth()
    const data = await getDashboardRelances()
    return NextResponse.json({ data })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
```

Créer `src/app/api/dashboard/activites/route.ts` :

```typescript
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { getDashboardActivites } from "@/lib/dashboard"

export async function GET(_request: NextRequest) {
  try {
    await requireAuth()
    const data = await getDashboardActivites()
    return NextResponse.json({ data })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
```

- [ ] **Step 4: Vérifier que les tests passent**

```bash
npx vitest run src/__tests__/api/dashboard.test.ts
```

Expected: 6 tests PASS

- [ ] **Step 5: Run tous les tests**

```bash
npx vitest run
```

Expected: tous les tests PASS (anciens + nouveaux)

- [ ] **Step 6: Commit**

```bash
git add src/app/api/dashboard/stats/route.ts src/app/api/dashboard/relances/route.ts src/app/api/dashboard/activites/route.ts src/__tests__/api/dashboard.test.ts
git commit -m "feat: add dashboard API routes (stats, relances, activites)"
```

---

## Task 3 — Composants dashboard

**Files:**
- Create: `src/components/dashboard/stat-card.tsx`
- Create: `src/components/dashboard/stats-grid.tsx`
- Create: `src/components/dashboard/pipeline-bar.tsx`
- Create: `src/components/dashboard/relances-widget.tsx`
- Create: `src/components/dashboard/activity-timeline.tsx`

**Contexte :**
- Design system : fond `#000000`, cartes `#0a0a0a`, bordures `#1a1a1a`, texte `#fafafa`, secondaire `#737373`
- `motion` de `"motion/react"` (jamais "framer-motion")
- Animations dispo dans `@/lib/animations` : `fadeInUp`, `staggerContainer`, `staggerItem`, `countUpTransition`, `progressBar`
- Types dispo dans `@/lib/dashboard` : `DashboardStats`, `DashboardRelances`, `DashboardActivite`, `PipelineSlice`
- `timeAgo` et `formatDate` de `@/lib/date`
- Pas de tests pour les composants UI — vérification via build

- [ ] **Step 1: Créer stat-card.tsx**

```typescript
// src/components/dashboard/stat-card.tsx
"use client"

import { useEffect, useRef } from "react"
import { motion, useMotionValue, useTransform, animate } from "motion/react"
import { countUpTransition } from "@/lib/animations"

interface StatCardProps {
  label: string
  value: number
  format?: "number" | "percent"
  sublabel?: string
}

export function StatCard({ label, value, format = "number", sublabel }: StatCardProps) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => {
    const n = Math.round(v)
    return format === "percent" ? `${n}%` : String(n)
  })
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (hasAnimated.current) return
    hasAnimated.current = true
    animate(count, value, countUpTransition)
  }, [count, value])

  return (
    <div
      className="rounded-[6px] border border-[#1a1a1a] bg-[#0a0a0a] p-4"
    >
      <p className="text-xs text-[#737373] uppercase tracking-wider mb-2">{label}</p>
      <motion.p className="text-2xl font-bold text-[#fafafa]">{rounded}</motion.p>
      {sublabel && <p className="text-xs text-[#555555] mt-1">{sublabel}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Créer stats-grid.tsx**

```typescript
// src/components/dashboard/stats-grid.tsx
"use client"

import { motion } from "motion/react"
import { staggerContainer, staggerItem } from "@/lib/animations"
import { StatCard } from "@/components/dashboard/stat-card"
import type { DashboardStats } from "@/lib/dashboard"

interface StatsGridProps {
  stats: DashboardStats
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3"
    >
      <motion.div variants={staggerItem}>
        <StatCard label="Total prospects" value={stats.totalProspects} />
      </motion.div>
      <motion.div variants={staggerItem}>
        <StatCard label="À démarcher" value={stats.aDemarcher} />
      </motion.div>
      <motion.div variants={staggerItem}>
        <StatCard label="Emails envoyés" value={stats.maquettesEnvoyees} />
      </motion.div>
      <motion.div variants={staggerItem}>
        <StatCard label="Clients signés" value={stats.clientsSignes} />
      </motion.div>
      <motion.div variants={staggerItem} className="col-span-2 md:col-span-1">
        <StatCard
          label="Taux de conversion"
          value={stats.tauxConversion}
          format="percent"
          sublabel={`${stats.clientsSignes} / ${stats.totalProspects}`}
        />
      </motion.div>
    </motion.div>
  )
}
```

- [ ] **Step 3: Créer pipeline-bar.tsx**

```typescript
// src/components/dashboard/pipeline-bar.tsx
"use client"

import { motion } from "motion/react"
import type { PipelineSlice } from "@/lib/dashboard"

interface PipelineBarProps {
  pipeline: PipelineSlice[]
}

export function PipelineBar({ pipeline }: PipelineBarProps) {
  const total = pipeline.reduce((sum, s) => sum + s.count, 0)

  return (
    <div className="rounded-[6px] border border-[#1a1a1a] bg-[#0a0a0a] p-4">
      <p className="text-xs text-[#555555] uppercase tracking-wider mb-3">Répartition pipeline</p>

      {total === 0 ? (
        <p className="text-sm text-[#555555]">Aucun prospect</p>
      ) : (
        <>
          {/* Barre */}
          <div className="flex h-2 rounded-full overflow-hidden mb-3" style={{ backgroundColor: "#1a1a1a" }}>
            {pipeline
              .filter((s) => s.count > 0)
              .map((s) => (
                <motion.div
                  key={s.statut}
                  title={`${s.label}: ${s.count}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${(s.count / total) * 100}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  style={{ backgroundColor: s.color }}
                />
              ))}
          </div>

          {/* Légende */}
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {pipeline
              .filter((s) => s.count > 0)
              .map((s) => (
                <div key={s.statut} className="flex items-center gap-1">
                  <span
                    className="inline-block w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="text-xs text-[#737373]">
                    {s.label} <span className="text-[#555555]">({s.count})</span>
                  </span>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Créer relances-widget.tsx**

```typescript
// src/components/dashboard/relances-widget.tsx
"use client"

import Link from "next/link"
import { Bell } from "lucide-react"
import { motion } from "motion/react"
import { staggerContainer, staggerItem } from "@/lib/animations"
import { formatDate } from "@/lib/date"
import type { DashboardRelances } from "@/lib/dashboard"

interface RelancesWidgetProps {
  relances: DashboardRelances
}

export function RelancesWidget({ relances }: RelancesWidgetProps) {
  return (
    <div className="rounded-[6px] border border-[#1a1a1a] bg-[#0a0a0a] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bell size={14} className="text-[#737373]" />
          <p className="text-xs text-[#555555] uppercase tracking-wider">Relances à faire</p>
        </div>
        {relances.count > 0 && (
          <span
            className="inline-flex items-center justify-center text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: "#f87171", color: "#000" }}
          >
            {relances.count}
          </span>
        )}
      </div>

      {relances.count === 0 ? (
        <p className="text-sm text-[#555555]">Aucune relance en attente</p>
      ) : (
        <motion.ul
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="flex flex-col gap-2"
        >
          {relances.prospects.map((p) => (
            <motion.li key={p.id} variants={staggerItem}>
              <Link
                href={`/prospects/${p.id}`}
                className="flex items-center justify-between gap-2 group"
              >
                <div className="min-w-0">
                  <p className="text-sm text-[#fafafa] group-hover:text-white truncate transition-colors">
                    {p.nom}
                  </p>
                  <p className="text-xs text-[#737373] truncate">
                    {p.activite} — {p.ville}
                  </p>
                </div>
                <p className="text-xs text-[#f87171] shrink-0">
                  {formatDate(p.prochaineRelance)}
                </p>
              </Link>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Créer activity-timeline.tsx**

```typescript
// src/components/dashboard/activity-timeline.tsx
"use client"

import Link from "next/link"
import { ArrowRightLeft, StickyNote, Mail, Search, Activity, Zap, Image } from "lucide-react"
import { motion } from "motion/react"
import { staggerContainer, fadeInUp } from "@/lib/animations"
import { timeAgo } from "@/lib/date"
import type { DashboardActivite } from "@/lib/dashboard"

const TYPE_ICONS: Record<string, React.ElementType> = {
  PIPELINE: ArrowRightLeft,
  NOTE: StickyNote,
  EMAIL: Mail,
  RECHERCHE: Search,
  ANALYSE: Zap,
  MAQUETTE: Image,
}

function getIcon(type: string): React.ElementType {
  return TYPE_ICONS[type] ?? Activity
}

interface ActivityTimelineProps {
  activites: DashboardActivite[]
}

export function ActivityTimeline({ activites }: ActivityTimelineProps) {
  return (
    <div className="rounded-[6px] border border-[#1a1a1a] bg-[#0a0a0a] p-4">
      <p className="text-xs text-[#555555] uppercase tracking-wider mb-4">Activité récente</p>

      {activites.length === 0 ? (
        <p className="text-sm text-[#555555]">Aucune activité enregistrée</p>
      ) : (
        <motion.ul
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="relative flex flex-col gap-0"
        >
          <div
            className="absolute left-[7px] top-2 bottom-2 w-px"
            style={{ backgroundColor: "#1a1a1a" }}
            aria-hidden
          />

          {activites.map((a) => {
            const Icon = getIcon(a.type)
            return (
              <motion.li
                key={a.id}
                variants={fadeInUp}
                className="relative flex items-start gap-4 pb-4 pl-6 last:pb-0"
              >
                <div
                  className="absolute left-0 top-1 h-[14px] w-[14px] shrink-0 rounded-full border"
                  style={{ backgroundColor: "#1a1a1a", borderColor: "#333" }}
                  aria-hidden
                />
                <div className="shrink-0 mt-0.5">
                  <Icon size={14} className="text-[#737373]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#fafafa] leading-snug">{a.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {a.prospectNom && (
                      <Link
                        href={`/prospects`}
                        className="text-xs text-[#60a5fa] hover:text-white transition-colors truncate"
                      >
                        {a.prospectNom}
                      </Link>
                    )}
                    <p className="text-xs text-[#555555] shrink-0">{timeAgo(a.createdAt)}</p>
                  </div>
                </div>
              </motion.li>
            )
          })}
        </motion.ul>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Build check**

```bash
npm run build
```

Expected: 0 erreurs TypeScript

- [ ] **Step 7: Commit**

```bash
git add src/components/dashboard/
git commit -m "feat: add dashboard UI components (stat-card, stats-grid, pipeline-bar, relances-widget, activity-timeline)"
```

---

## Task 4 — Dashboard page

**Files:**
- Modify: `src/app/(dashboard)/page.tsx`

**Contexte :**
- Page Server Component async (comme `pipeline/page.tsx`)
- Appelle directement les fonctions lib (pas via HTTP) — évite le overhead SSR
- Chaque appel est wrappé dans `.catch()` pour éviter qu'une erreur DB plante toute la page
- Si `stats` est null (erreur), afficher un message d'erreur discret

- [ ] **Step 1: Remplacer le contenu de src/app/(dashboard)/page.tsx**

```typescript
import { getDashboardStats, getDashboardRelances, getDashboardActivites } from "@/lib/dashboard"
import { StatsGrid } from "@/components/dashboard/stats-grid"
import { PipelineBar } from "@/components/dashboard/pipeline-bar"
import { RelancesWidget } from "@/components/dashboard/relances-widget"
import { ActivityTimeline } from "@/components/dashboard/activity-timeline"

async function loadDashboardData() {
  const [stats, relances, activites] = await Promise.all([
    getDashboardStats().catch(() => null),
    getDashboardRelances().catch(() => ({ count: 0, prospects: [] })),
    getDashboardActivites().catch(() => []),
  ])
  return { stats, relances, activites }
}

export default async function DashboardPage() {
  const { stats, relances, activites } = await loadDashboardData()

  return (
    <div>
      <h1 className="text-xl font-bold text-[#fafafa] mb-6">Dashboard</h1>

      {stats === null ? (
        <p className="text-sm text-[#f87171]">Erreur lors du chargement des statistiques</p>
      ) : (
        <>
          {/* Stats */}
          <StatsGrid stats={stats} />

          {/* Pipeline + Relances */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <PipelineBar pipeline={stats.pipeline} />
            <RelancesWidget relances={relances} />
          </div>

          {/* Timeline */}
          <div className="mt-4">
            <ActivityTimeline activites={activites} />
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Build check final**

```bash
npm run build
```

Expected: 0 erreurs TypeScript, aucun warning

- [ ] **Step 3: Run tous les tests**

```bash
npx vitest run
```

Expected: tous les tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/page.tsx
git commit -m "feat: implement dashboard page (stats, pipeline, relances, activites)"
```

---

## Self-Review

### 1. Spec coverage

| Exigence spec | Tâche |
|---|---|
| 5 widgets stats (total, à démarcher, maquettes envoyées, clients signés, taux de conversion) | Task 3 — StatsGrid + StatCard |
| Widget "Relances à faire" avec badge compteur + liste | Task 3 — RelancesWidget |
| Timeline 10 dernières activités | Task 3 — ActivityTimeline |
| Mini pipeline barre horizontale répartition par colonne | Task 3 — PipelineBar |
| GET /api/dashboard/stats | Task 2 |
| GET /api/dashboard/relances | Task 2 |
| GET /api/dashboard/activites | Task 2 |

✅ Tous les points sont couverts.

### 2. Placeholder scan

Aucun placeholder — chaque step contient le code complet.

### 3. Type consistency

- `DashboardStats`, `DashboardRelances`, `DashboardRelance`, `DashboardActivite`, `PipelineSlice` — définis dans `lib/dashboard.ts` Task 1, utilisés dans les composants Task 3 via import `from "@/lib/dashboard"`. ✅
- `stats.pipeline` est `PipelineSlice[]` — `PipelineBar` reçoit `pipeline: PipelineSlice[]`. ✅
- `relances` est `DashboardRelances` — `RelancesWidget` reçoit `relances: DashboardRelances`. ✅
- `activites` est `DashboardActivite[]` — `ActivityTimeline` reçoit `activites: DashboardActivite[]`. ✅
