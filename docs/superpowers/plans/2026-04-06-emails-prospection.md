# Page Prospection Email — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le placeholder `/emails` par une page de gestion de la prospection email avec liste des prospects actifs, indicateurs de relance, génération/envoi (premier contact + relance Claude), et historique inline.

**Architecture:** Server Component charge les données Prisma et passe à `EmailsClient`. L'état UI (expand, modal) est côté client. `DemarcherSheet` existant est réutilisé avec un prop `isRelance`. La logique de calcul relance est extraite dans `lib/relance.ts` (testable séparément) et partagée par la page et la route API.

**Tech Stack:** Next.js 16 App Router, Prisma SQLite, Framer Motion (`motion/react`), shadcn/ui, Vitest, Tailwind CSS, Resend, Anthropic SDK.

---

## File Map

| Fichier | Action | Rôle |
|---------|--------|------|
| `src/lib/relance.ts` | CREATE | Calcul relance (`computeRelance`) |
| `src/types/emails.ts` | CREATE | Type `EmailProspectItem` |
| `src/app/api/emails/route.ts` | CREATE | `GET /api/emails` |
| `src/lib/email.ts` | MODIFY | Ajouter `isRelance?: boolean` à `generateProspectionEmail` |
| `src/app/api/prospects/[id]/email/generate/route.ts` | MODIFY | Lire `relance` dans le body, passer à `generateProspectionEmail` |
| `src/components/prospects/demarcher-sheet.tsx` | MODIFY | Interface minimale + prop `isRelance` |
| `src/components/emails/relance-badge.tsx` | CREATE | Badge 3 états (pas due / due / urgente) |
| `src/components/emails/email-history-expand.tsx` | CREATE | Expand inline des emails envoyés |
| `src/components/emails/email-prospect-row.tsx` | CREATE | Ligne de la liste (colonnes + actions) |
| `src/components/emails/emails-client.tsx` | CREATE | Client Component racine (state expand + modal) |
| `src/app/(dashboard)/emails/page.tsx` | MODIFY | Remplace le placeholder |
| `src/__tests__/lib/relance.test.ts` | CREATE | Tests `computeRelance` |
| `src/__tests__/api/emails-list.test.ts` | CREATE | Tests `GET /api/emails` |
| `src/__tests__/api/email-generate.test.ts` | MODIFY | Ajouter tests param `relance` |

---

## Task 1 — Types partagés + utilitaire `computeRelance` (TDD)

**Files:**
- Create: `src/lib/relance.ts`
- Create: `src/types/emails.ts`
- Create: `src/__tests__/lib/relance.test.ts`

- [ ] **Step 1.1 — Créer `src/types/emails.ts`**

```ts
// src/types/emails.ts

export interface RelanceInfo {
  due: boolean
  urgente: boolean
  joursRetard: number
}

export interface EmailProspectItem {
  id: string
  nom: string
  activite: string
  ville: string
  email: string | null
  statutPipeline: string
  dernierEmail: {
    id: string
    sujet: string
    dateEnvoi: string | null
    statut: string
  } | null
  emailsHistory: {
    id: string
    sujet: string
    dateEnvoi: string | null
    statut: string
    createdAt: string
  }[]
  relance: RelanceInfo
}
```

- [ ] **Step 1.2 — Écrire les tests de `computeRelance`**

```ts
// src/__tests__/lib/relance.test.ts
import { describe, it, expect } from "vitest"
import { computeRelance, DELAI_JOURS } from "@/lib/relance"

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000)
}

describe("computeRelance", () => {
  it("returns not due when no emails and no prochaineRelance", () => {
    expect(computeRelance(null, [])).toEqual({ due: false, urgente: false, joursRetard: 0 })
  })

  it("returns not due when last email sent < DELAI_JOURS days ago", () => {
    const result = computeRelance(null, [{ statut: "ENVOYE", dateEnvoi: daysAgo(3) }])
    expect(result).toEqual({ due: false, urgente: false, joursRetard: 0 })
  })

  it("returns due when last email sent exactly DELAI_JOURS days ago", () => {
    const result = computeRelance(null, [{ statut: "ENVOYE", dateEnvoi: daysAgo(DELAI_JOURS) }])
    expect(result.due).toBe(true)
    expect(result.joursRetard).toBe(0)
    expect(result.urgente).toBe(false)
  })

  it("returns due and not urgente when joursRetard <= DELAI_JOURS", () => {
    const result = computeRelance(null, [{ statut: "ENVOYE", dateEnvoi: daysAgo(10) }])
    expect(result.due).toBe(true)
    expect(result.joursRetard).toBe(3)
    expect(result.urgente).toBe(false)
  })

  it("returns urgente when joursRetard > DELAI_JOURS", () => {
    const result = computeRelance(null, [{ statut: "ENVOYE", dateEnvoi: daysAgo(20) }])
    expect(result.due).toBe(true)
    expect(result.urgente).toBe(true)
    expect(result.joursRetard).toBe(13)
  })

  it("ignores BROUILLON emails", () => {
    expect(computeRelance(null, [{ statut: "BROUILLON", dateEnvoi: daysAgo(20) }])).toEqual({
      due: false, urgente: false, joursRetard: 0,
    })
  })

  it("uses prochaineRelance when defined and in the future — not due", () => {
    const future = new Date(Date.now() + 3 * 86_400_000)
    expect(computeRelance(future, [])).toEqual({ due: false, urgente: false, joursRetard: 0 })
  })

  it("uses prochaineRelance when defined and in the past — due", () => {
    const result = computeRelance(daysAgo(5), [])
    expect(result.due).toBe(true)
    expect(result.joursRetard).toBe(5)
    expect(result.urgente).toBe(false)
  })

  it("uses prochaineRelance when defined — urgente when joursRetard > DELAI_JOURS", () => {
    const result = computeRelance(daysAgo(15), [])
    expect(result.due).toBe(true)
    expect(result.urgente).toBe(true)
  })
})
```

- [ ] **Step 1.3 — Lancer les tests pour vérifier qu'ils échouent**

```bash
npx vitest run src/__tests__/lib/relance.test.ts
```
Attendu : FAIL "Cannot find module '@/lib/relance'"

- [ ] **Step 1.4 — Implémenter `src/lib/relance.ts`**

```ts
// src/lib/relance.ts
import type { RelanceInfo } from "@/types/emails"

export const DELAI_JOURS = 7

type EmailLike = { statut: string; dateEnvoi: Date | null }

export function computeRelance(
  prochaineRelance: Date | null,
  emails: EmailLike[]
): RelanceInfo {
  const now = new Date()
  const MS_PER_DAY = 86_400_000

  if (prochaineRelance) {
    const diff = Math.floor((now.getTime() - prochaineRelance.getTime()) / MS_PER_DAY)
    if (diff >= 0) {
      return { due: true, urgente: diff > DELAI_JOURS, joursRetard: diff }
    }
    return { due: false, urgente: false, joursRetard: 0 }
  }

  const lastSent = emails
    .filter((e) => e.statut === "ENVOYE" && e.dateEnvoi !== null)
    .sort((a, b) => b.dateEnvoi!.getTime() - a.dateEnvoi!.getTime())[0]

  if (!lastSent?.dateEnvoi) return { due: false, urgente: false, joursRetard: 0 }

  const joursDepuis = Math.floor((now.getTime() - lastSent.dateEnvoi.getTime()) / MS_PER_DAY)
  const joursRetard = joursDepuis - DELAI_JOURS

  if (joursRetard < 0) return { due: false, urgente: false, joursRetard: 0 }
  return { due: true, urgente: joursRetard > DELAI_JOURS, joursRetard }
}
```

- [ ] **Step 1.5 — Vérifier que les tests passent**

```bash
npx vitest run src/__tests__/lib/relance.test.ts
```
Attendu : 9 tests PASS

- [ ] **Step 1.6 — Commit**

```bash
git add src/lib/relance.ts src/types/emails.ts src/__tests__/lib/relance.test.ts
git commit -m "feat: add relance utility and EmailProspectItem type"
```

---

## Task 2 — GET /api/emails (TDD)

**Files:**
- Create: `src/app/api/emails/route.ts`
- Create: `src/__tests__/api/emails-list.test.ts`

- [ ] **Step 2.1 — Écrire les tests**

```ts
// src/__tests__/api/emails-list.test.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/db", () => ({
  prisma: { prospect: { findMany: vi.fn() } },
}))
vi.mock("@/lib/relance", () => ({
  computeRelance: vi.fn().mockReturnValue({ due: false, urgente: false, joursRetard: 0 }),
}))

import { GET } from "@/app/api/emails/route"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { computeRelance } from "@/lib/relance"

function makeProspect(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    nom: "Test",
    activite: "Boulanger",
    ville: "Bailleul",
    email: "test@test.fr",
    statutPipeline: "A_DEMARCHER",
    prochaineRelance: null,
    updatedAt: new Date(),
    emails: [],
    ...overrides,
  }
}

describe("GET /api/emails", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(undefined)
    vi.mocked(prisma.prospect.findMany).mockResolvedValue([])
    vi.mocked(computeRelance).mockReturnValue({ due: false, urgente: false, joursRetard: 0 })
  })

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"))
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it("excludes CLIENT and PERDU prospects", async () => {
    await GET()
    expect(vi.mocked(prisma.prospect.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { statutPipeline: { notIn: ["CLIENT", "PERDU"] } },
      })
    )
  })

  it("returns 200 with data array", async () => {
    vi.mocked(prisma.prospect.findMany).mockResolvedValue([makeProspect()])
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json.data)).toBe(true)
    expect(json.data).toHaveLength(1)
  })

  it("returns relance from computeRelance", async () => {
    vi.mocked(prisma.prospect.findMany).mockResolvedValue([makeProspect()])
    vi.mocked(computeRelance).mockReturnValue({ due: true, urgente: false, joursRetard: 3 })
    const res = await GET()
    const json = await res.json()
    expect(json.data[0].relance).toEqual({ due: true, urgente: false, joursRetard: 3 })
  })

  it("returns dernierEmail null when no emails", async () => {
    vi.mocked(prisma.prospect.findMany).mockResolvedValue([makeProspect()])
    const res = await GET()
    const json = await res.json()
    expect(json.data[0].dernierEmail).toBeNull()
  })

  it("returns dernierEmail with last ENVOYE email", async () => {
    const email = {
      id: "e1", sujet: "Mon email", statut: "ENVOYE",
      dateEnvoi: new Date("2026-01-01"), contenu: "", type: "PROSPECTION",
      prospectId: "p1", createdAt: new Date(),
    }
    vi.mocked(prisma.prospect.findMany).mockResolvedValue([
      makeProspect({ emails: [email] }),
    ])
    const res = await GET()
    const json = await res.json()
    expect(json.data[0].dernierEmail.sujet).toBe("Mon email")
  })

  it("sorts urgentes before dues before normal", async () => {
    const normal = makeProspect({ id: "p1" })
    const due = makeProspect({ id: "p2" })
    const urgente = makeProspect({ id: "p3" })

    vi.mocked(prisma.prospect.findMany).mockResolvedValue([normal, due, urgente])
    vi.mocked(computeRelance)
      .mockReturnValueOnce({ due: false, urgente: false, joursRetard: 0 })
      .mockReturnValueOnce({ due: true, urgente: false, joursRetard: 3 })
      .mockReturnValueOnce({ due: true, urgente: true, joursRetard: 10 })

    const res = await GET()
    const json = await res.json()
    expect(json.data.map((d: any) => d.id)).toEqual(["p3", "p2", "p1"])
  })
})
```

- [ ] **Step 2.2 — Lancer les tests pour vérifier qu'ils échouent**

```bash
npx vitest run src/__tests__/api/emails-list.test.ts
```
Attendu : FAIL "Cannot find module '@/app/api/emails/route'"

- [ ] **Step 2.3 — Créer `src/app/api/emails/route.ts`**

```ts
// src/app/api/emails/route.ts
import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { computeRelance } from "@/lib/relance"
import type { EmailProspectItem } from "@/types/emails"

export async function GET() {
  try {
    await requireAuth()

    const prospects = await prisma.prospect.findMany({
      where: { statutPipeline: { notIn: ["CLIENT", "PERDU"] } },
      include: { emails: { orderBy: { createdAt: "desc" } } },
      orderBy: { updatedAt: "desc" },
    })

    const items: EmailProspectItem[] = prospects.map((p) => {
      const relance = computeRelance(p.prochaineRelance, p.emails)
      const lastSentEmail = p.emails.find((e) => e.statut === "ENVOYE") ?? null

      return {
        id: p.id,
        nom: p.nom,
        activite: p.activite,
        ville: p.ville,
        email: p.email,
        statutPipeline: p.statutPipeline,
        dernierEmail: lastSentEmail
          ? {
              id: lastSentEmail.id,
              sujet: lastSentEmail.sujet,
              dateEnvoi: lastSentEmail.dateEnvoi?.toISOString() ?? null,
              statut: lastSentEmail.statut,
            }
          : null,
        emailsHistory: p.emails.map((e) => ({
          id: e.id,
          sujet: e.sujet,
          dateEnvoi: e.dateEnvoi?.toISOString() ?? null,
          statut: e.statut,
          createdAt: e.createdAt.toISOString(),
        })),
        relance,
      }
    })

    items.sort((a, b) => {
      const score = (r: EmailProspectItem["relance"]) =>
        r.urgente ? 2 : r.due ? 1 : 0
      return score(b.relance) - score(a.relance)
    })

    return NextResponse.json({ data: items })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
```

- [ ] **Step 2.4 — Vérifier que les tests passent**

```bash
npx vitest run src/__tests__/api/emails-list.test.ts
```
Attendu : 7 tests PASS

- [ ] **Step 2.5 — Lancer tous les tests pour vérifier l'absence de régression**

```bash
npm run test
```
Attendu : tous les tests précédents PASS

- [ ] **Step 2.6 — Commit**

```bash
git add src/app/api/emails/route.ts src/__tests__/api/emails-list.test.ts
git commit -m "feat: add GET /api/emails with relance computation and sort"
```

---

## Task 3 — Modifier generate route + lib/email.ts (TDD)

**Files:**
- Modify: `src/lib/email.ts`
- Modify: `src/app/api/prospects/[id]/email/generate/route.ts`
- Modify: `src/__tests__/api/email-generate.test.ts`

- [ ] **Step 3.1 — Ajouter les nouveaux tests dans `email-generate.test.ts`**

Ajouter à la fin du `describe` existant dans `src/__tests__/api/email-generate.test.ts` :

```ts
  it("passes relance:false to generateProspectionEmail when no body", async () => {
    await POST(makeReq() as any, { params })
    expect(vi.mocked(generateProspectionEmail)).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      false
    )
  })

  it("passes relance:true to generateProspectionEmail when body has relance:true", async () => {
    const req = new Request("http://localhost/api/prospects/p1/email/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ relance: true }),
    })
    await POST(req as any, { params })
    expect(vi.mocked(generateProspectionEmail)).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      true
    )
  })
```

- [ ] **Step 3.2 — Lancer les nouveaux tests pour vérifier qu'ils échouent**

```bash
npx vitest run src/__tests__/api/email-generate.test.ts
```
Attendu : les 2 nouveaux tests FAIL (generateProspectionEmail appelé avec 3 args, pas 4)

- [ ] **Step 3.3 — Modifier `src/lib/email.ts` — ajouter `isRelance` param**

Remplacer la fonction `generateProspectionEmail` :

```ts
export async function generateProspectionEmail(
  prospect: ProspectInput,
  maquette?: MaquetteInput | null,
  analyse?: { recommandations: string } | null,
  isRelance?: boolean
): Promise<{ sujet: string; corps: string }> {
  const contextParts: string[] = [
    `activité = ${prospect.activite}`,
    `ville = ${prospect.ville}`,
  ]
  if (maquette?.demoUrl) contextParts.push(`lien démo: ${maquette.demoUrl}`)
  if (analyse) contextParts.push(`recommandations: ${analyse.recommandations}`)

  const systemPrompt = isRelance
    ? `Tu rédiges des emails de relance pour Flandre Web Agency. Ton professionnel mais chaleureux. Court (max 120 mots). Tu rappelles que tu avais envoyé une présentation de site web et proposes de discuter. Pas de ton commercial agressif. Réponds en JSON : {"sujet": string, "corps": string}`
    : `Tu rédiges des emails de prospection pour Flandre Web Agency. Ton professionnel mais chaleureux, personnalisé au métier du prospect. Court (max 150 mots). Pas de ton commercial agressif — tu es un voisin qui propose un service utile. Réponds en JSON : {"sujet": string, "corps": string}`

  const response = await analyzeWithClaude(
    systemPrompt,
    `Génère un email de prospection pour ${prospect.nom}, ${contextParts.join(", ")}`
  )
  const parsed = parseClaudeJSON<{ sujet: string; corps: string }>(response)
  return { sujet: parsed.sujet, corps: parsed.corps }
}
```

- [ ] **Step 3.4 — Modifier `src/app/api/prospects/[id]/email/generate/route.ts`**

Remplacer la signature et ajouter la lecture du body :

```ts
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { generateProspectionEmail, buildEmailHtml } from "@/lib/email"

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()
    const { id } = await params

    let isRelance = false
    try {
      const body: unknown = await request.json()
      if (body && typeof body === "object" && (body as Record<string, unknown>).relance === true) {
        isRelance = true
      }
    } catch {
      // Body absent ou invalide — isRelance reste false
    }

    const prospect = await prisma.prospect.findUnique({
      where: { id },
      include: {
        maquettes: { orderBy: { createdAt: "desc" }, take: 1 },
        analyses: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    })

    if (!prospect) {
      return NextResponse.json({ error: "Prospect introuvable" }, { status: 404 })
    }

    const lastMaquette = prospect.maquettes[0] ?? null
    const lastAnalyse = prospect.analyses[0] ?? null

    const { sujet, corps } = await generateProspectionEmail(
      prospect,
      lastMaquette ? { demoUrl: lastMaquette.demoUrl, version: lastMaquette.version } : null,
      lastAnalyse ? { recommandations: lastAnalyse.recommandations } : null,
      isRelance
    )

    const htmlContent = buildEmailHtml(corps, prospect, lastMaquette?.demoUrl ?? null)

    const email = await prisma.email.create({
      data: {
        prospectId: id,
        type: "PROSPECTION",
        sujet,
        contenu: htmlContent,
        statut: "BROUILLON",
      },
    })

    return NextResponse.json({
      data: {
        id: email.id,
        sujet: email.sujet,
        corps,
        htmlPreview: email.contenu,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
```

- [ ] **Step 3.5 — Vérifier que tous les tests generate passent**

```bash
npx vitest run src/__tests__/api/email-generate.test.ts
```
Attendu : 7 tests PASS (5 existants + 2 nouveaux)

- [ ] **Step 3.6 — Lancer tous les tests**

```bash
npm run test
```
Attendu : tous les tests PASS

- [ ] **Step 3.7 — Commit**

```bash
git add src/lib/email.ts src/app/api/prospects/[id]/email/generate/route.ts src/__tests__/api/email-generate.test.ts
git commit -m "feat: add isRelance param to generateProspectionEmail and generate route"
```

---

## Task 4 — Modifier DemarcherSheet

**Files:**
- Modify: `src/components/prospects/demarcher-sheet.tsx`

- [ ] **Step 4.1 — Modifier l'interface Props et ajouter `isRelance`**

Remplacer la section interfaces + signature au début du fichier :

```tsx
// Remplacer :
// import type { ProspectWithRelations } from "@/types/prospect"
// interface Props {
//   prospect: ProspectWithRelations
//   onClose: () => void
// }

// Par :
interface DemarcherSheetProspect {
  id: string
  nom: string
  email: string | null
}

interface Props {
  prospect: DemarcherSheetProspect
  onClose: () => void
  isRelance?: boolean
}
```

Et dans `useEffect`, modifier le `fetch` pour passer `isRelance` :

```tsx
// Remplacer :
const res = await fetch(`/api/prospects/${prospect.id}/email/generate`, {
  method: "POST",
})

// Par :
const res = await fetch(`/api/prospects/${prospect.id}/email/generate`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ relance: isRelance ?? false }),
})
```

Et mettre à jour le titre du sheet si `isRelance` est `true` :

```tsx
// Remplacer :
<h2 className="text-base font-semibold text-[#fafafa]">
  Démarcher {prospect.nom}
</h2>

// Par :
<h2 className="text-base font-semibold text-[#fafafa]">
  {isRelance ? "Relancer" : "Démarcher"} {prospect.nom}
</h2>
```

Supprimer l'import `ProspectWithRelations` qui n'est plus utilisé :

```tsx
// Supprimer cette ligne :
import type { ProspectWithRelations } from "@/types/prospect"
```

- [ ] **Step 4.2 — Vérifier que le build TypeScript passe**

```bash
npm run build 2>&1 | head -30
```
Attendu : 0 erreurs TypeScript. `ProspectWithRelations` en `prospect-detail.tsx` reste compatible car c'est un superset de `DemarcherSheetProspect`.

- [ ] **Step 4.3 — Commit**

```bash
git add src/components/prospects/demarcher-sheet.tsx
git commit -m "feat: update DemarcherSheet to accept minimal prospect type + isRelance prop"
```

---

## Task 5 — Composants UI emails

**Files:**
- Create: `src/components/emails/relance-badge.tsx`
- Create: `src/components/emails/email-history-expand.tsx`
- Create: `src/components/emails/email-prospect-row.tsx`

- [ ] **Step 5.1 — Créer `src/components/emails/relance-badge.tsx`**

```tsx
// src/components/emails/relance-badge.tsx
"use client"

import type { RelanceInfo } from "@/types/emails"

interface Props {
  relance: RelanceInfo
}

export function RelanceBadge({ relance }: Props) {
  if (!relance.due) {
    return <span className="text-xs text-[#555555]">—</span>
  }

  const color = relance.urgente ? "#f87171" : "#fbbf24"
  const label = `Relance J+${relance.joursRetard}${relance.urgente ? " !" : ""}`

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: "#1a1a1a", color, borderRadius: "9999px" }}
    >
      {label}
    </span>
  )
}
```

- [ ] **Step 5.2 — Créer `src/components/emails/email-history-expand.tsx`**

```tsx
// src/components/emails/email-history-expand.tsx
"use client"

import { motion } from "motion/react"
import { expandCollapse } from "@/lib/animations"
import type { EmailProspectItem } from "@/types/emails"

interface Props {
  emails: EmailProspectItem["emailsHistory"]
}

export function EmailHistoryExpand({ emails }: Props) {
  if (emails.length === 0) {
    return (
      <motion.div
        variants={expandCollapse}
        initial="initial"
        animate="animate"
        exit="exit"
        className="px-4 pb-4"
      >
        <p className="text-xs text-[#555555] py-3">Aucun email envoyé pour ce prospect.</p>
      </motion.div>
    )
  }

  return (
    <motion.div
      variants={expandCollapse}
      initial="initial"
      animate="animate"
      exit="exit"
      className="px-4 pb-4"
    >
      <div className="border border-[#1a1a1a] rounded-[6px] overflow-hidden">
        {emails.map((email, i) => (
          <div
            key={email.id}
            className={`flex items-center justify-between px-4 py-3 text-sm${
              i < emails.length - 1 ? " border-b border-[#1a1a1a]" : ""
            }`}
          >
            <span className="text-[#fafafa] truncate max-w-[60%]">{email.sujet}</span>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-[#737373]">
                {email.dateEnvoi
                  ? new Date(email.dateEnvoi).toLocaleDateString("fr-FR")
                  : "—"}
              </span>
              <span
                className="text-xs px-2 py-0.5"
                style={{
                  backgroundColor: "#1a1a1a",
                  color: email.statut === "ENVOYE" ? "#4ade80" : "#737373",
                  borderRadius: "9999px",
                }}
              >
                {email.statut === "ENVOYE" ? "Envoyé" : "Brouillon"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 5.3 — Créer `src/components/emails/email-prospect-row.tsx`**

```tsx
// src/components/emails/email-prospect-row.tsx
"use client"

import { ChevronDown, ChevronRight, Mail, RotateCcw } from "lucide-react"
import { AnimatePresence } from "motion/react"
import { StatusBadge } from "@/components/prospects/status-badge"
import { RelanceBadge } from "@/components/emails/relance-badge"
import { EmailHistoryExpand } from "@/components/emails/email-history-expand"
import { Button } from "@/components/ui/button"
import type { EmailProspectItem } from "@/types/emails"

interface Props {
  prospect: EmailProspectItem
  isExpanded: boolean
  onToggleExpand: () => void
  onDemarcher: () => void
  onRelancer: () => void
}

export function EmailProspectRow({
  prospect,
  isExpanded,
  onToggleExpand,
  onDemarcher,
  onRelancer,
}: Props) {
  const noEmail = !prospect.email

  return (
    <div className="border border-[#1a1a1a] rounded-[6px] bg-[#0a0a0a] overflow-hidden">
      {/* Main row */}
      <div
        className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-[#111] transition-colors"
        onClick={onToggleExpand}
      >
        <span className="text-[#555555] shrink-0">
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>

        {/* Nom + activité */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[#fafafa] truncate">{prospect.nom}</p>
          <p className="text-xs text-[#737373] truncate">{prospect.activite}</p>
        </div>

        {/* Ville */}
        <span className="text-xs text-[#737373] w-24 shrink-0 hidden md:block truncate">
          {prospect.ville}
        </span>

        {/* Statut */}
        <div className="shrink-0 hidden md:block">
          <StatusBadge statut={prospect.statutPipeline} />
        </div>

        {/* Dernier email */}
        <div className="w-32 shrink-0 hidden lg:block">
          {prospect.dernierEmail ? (
            <span className="text-xs text-[#737373]">
              {prospect.dernierEmail.dateEnvoi
                ? new Date(prospect.dernierEmail.dateEnvoi).toLocaleDateString("fr-FR")
                : "—"}
            </span>
          ) : (
            <span className="text-xs text-[#555555]">Jamais contacté</span>
          )}
        </div>

        {/* Relance */}
        <div className="w-28 shrink-0 hidden lg:block">
          <RelanceBadge relance={prospect.relance} />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          {prospect.relance.due && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRelancer}
              className="h-7 px-2 text-xs border-[#fbbf24] text-[#fbbf24] hover:bg-[#fbbf24]/10"
            >
              <RotateCcw size={12} className="mr-1" />
              Relancer
            </Button>
          )}
          <Button
            size="sm"
            onClick={onDemarcher}
            disabled={noEmail}
            title={noEmail ? "Ajoutez un email dans la fiche" : undefined}
            className="h-7 px-2 text-xs"
          >
            <Mail size={12} className="mr-1" />
            Démarcher
          </Button>
        </div>
      </div>

      {/* Expand */}
      <AnimatePresence>
        {isExpanded && <EmailHistoryExpand emails={prospect.emailsHistory} />}
      </AnimatePresence>
    </div>
  )
}
```

- [ ] **Step 5.4 — Vérifier le build**

```bash
npm run build 2>&1 | head -30
```
Attendu : 0 erreurs TypeScript

- [ ] **Step 5.5 — Commit**

```bash
git add src/components/emails/
git commit -m "feat: add RelanceBadge, EmailHistoryExpand, EmailProspectRow components"
```

---

## Task 6 — EmailsClient + page.tsx

**Files:**
- Create: `src/components/emails/emails-client.tsx`
- Modify: `src/app/(dashboard)/emails/page.tsx`

- [ ] **Step 6.1 — Créer `src/components/emails/emails-client.tsx`**

```tsx
// src/components/emails/emails-client.tsx
"use client"

import { useState } from "react"
import { motion } from "motion/react"
import { staggerContainer, staggerItem } from "@/lib/animations"
import { EmailProspectRow } from "@/components/emails/email-prospect-row"
import { DemarcherSheet } from "@/components/prospects/demarcher-sheet"
import type { EmailProspectItem } from "@/types/emails"

interface Props {
  prospects: EmailProspectItem[]
}

interface ModalState {
  prospect: { id: string; nom: string; email: string | null }
  isRelance: boolean
}

export function EmailsClient({ prospects }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState | null>(null)

  if (prospects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-sm text-[#737373]">Tous vos prospects actifs ont été traités.</p>
      </div>
    )
  }

  function handleClose() {
    setModal(null)
    // DemarcherSheet appelle déjà router.refresh() après envoi réussi
  }

  return (
    <>
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="flex flex-col gap-2"
      >
        {prospects.map((prospect) => (
          <motion.div key={prospect.id} variants={staggerItem}>
            <EmailProspectRow
              prospect={prospect}
              isExpanded={expandedId === prospect.id}
              onToggleExpand={() =>
                setExpandedId(expandedId === prospect.id ? null : prospect.id)
              }
              onDemarcher={() => setModal({ prospect, isRelance: false })}
              onRelancer={() => setModal({ prospect, isRelance: true })}
            />
          </motion.div>
        ))}
      </motion.div>

      {modal && (
        <DemarcherSheet
          prospect={modal.prospect}
          isRelance={modal.isRelance}
          onClose={handleClose}
        />
      )}
    </>
  )
}
```

- [ ] **Step 6.2 — Remplacer `src/app/(dashboard)/emails/page.tsx`**

```tsx
// src/app/(dashboard)/emails/page.tsx
import { prisma } from "@/lib/db"
import { computeRelance } from "@/lib/relance"
import { EmailsClient } from "@/components/emails/emails-client"
import type { EmailProspectItem } from "@/types/emails"

async function getEmailProspects(): Promise<EmailProspectItem[]> {
  try {
    const prospects = await prisma.prospect.findMany({
      where: { statutPipeline: { notIn: ["CLIENT", "PERDU"] } },
      include: { emails: { orderBy: { createdAt: "desc" } } },
      orderBy: { updatedAt: "desc" },
    })

    const items: EmailProspectItem[] = prospects.map((p) => {
      const relance = computeRelance(p.prochaineRelance, p.emails)
      const lastSentEmail = p.emails.find((e) => e.statut === "ENVOYE") ?? null

      return {
        id: p.id,
        nom: p.nom,
        activite: p.activite,
        ville: p.ville,
        email: p.email,
        statutPipeline: p.statutPipeline,
        dernierEmail: lastSentEmail
          ? {
              id: lastSentEmail.id,
              sujet: lastSentEmail.sujet,
              dateEnvoi: lastSentEmail.dateEnvoi?.toISOString() ?? null,
              statut: lastSentEmail.statut,
            }
          : null,
        emailsHistory: p.emails.map((e) => ({
          id: e.id,
          sujet: e.sujet,
          dateEnvoi: e.dateEnvoi?.toISOString() ?? null,
          statut: e.statut,
          createdAt: e.createdAt.toISOString(),
        })),
        relance,
      }
    })

    items.sort((a, b) => {
      const score = (r: EmailProspectItem["relance"]) =>
        r.urgente ? 2 : r.due ? 1 : 0
      return score(b.relance) - score(a.relance)
    })

    return items
  } catch {
    return []
  }
}

export default async function EmailsPage() {
  const prospects = await getEmailProspects()

  return (
    <div>
      <h1 className="text-xl font-bold text-[#fafafa] mb-6">Prospection Email</h1>
      <EmailsClient prospects={JSON.parse(JSON.stringify(prospects))} />
    </div>
  )
}
```

- [ ] **Step 6.3 — Lancer tous les tests**

```bash
npm run test
```
Attendu : tous les tests PASS

- [ ] **Step 6.4 — Build de production**

```bash
npm run build
```
Attendu : 0 erreurs TypeScript, build réussi

- [ ] **Step 6.5 — Commit final**

```bash
git add src/components/emails/emails-client.tsx src/app/(dashboard)/emails/page.tsx
git commit -m "feat: implement emails prospection page (Session 12)"
```

---

## Récapitulatif des commits attendus

1. `feat: add relance utility and EmailProspectItem type`
2. `feat: add GET /api/emails with relance computation and sort`
3. `feat: add isRelance param to generateProspectionEmail and generate route`
4. `feat: update DemarcherSheet to accept minimal prospect type + isRelance prop`
5. `feat: add RelanceBadge, EmailHistoryExpand, EmailProspectRow components`
6. `feat: implement emails prospection page (Session 12)`
