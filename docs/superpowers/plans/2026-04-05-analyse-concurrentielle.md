# Analyse Concurrentielle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implémenter l'onglet Analyse de la fiche prospect — recherche de 5 concurrents locaux avec site web (Google Places), scraping de leurs sites (Firecrawl), analyse IA (Claude), affichage des forces/faiblesses/recommandations.

**Architecture:** `lib/analyse.ts` fournit 3 fonctions granulaires (findCompetitorCandidates, scrapeCompetitors, buildAnalyseResult). La route POST orchestre la séquence et upsert en DB (1 Analyse par prospect via @unique). Le composant `prospect-analyse-tab.tsx` gère les 3 états (vide / chargement / résultats) et met à jour son état local sans refresh.

**Tech Stack:** Next.js App Router, Prisma (SQLite), Google Places API, Firecrawl, Anthropic SDK (Claude Sonnet), Vitest, motion/react.

---

## File Map

| Statut | Fichier | Rôle |
|--------|---------|------|
| Modifier | `prisma/schema.prisma` | Ajouter `@unique` sur `Analyse.prospectId` |
| Modifier | `src/lib/anthropic.ts` | Ajouter paramètre optionnel `maxTokens?: number` à `analyzeWithClaude` |
| Créer | `src/lib/analyse.ts` | findCompetitorCandidates, scrapeCompetitors, buildAnalyseResult |
| Créer | `src/app/api/prospects/[id]/analyse/route.ts` | POST — orchestration + upsert |
| Créer | `src/components/prospects/prospect-analyse-tab.tsx` | UI : vide / chargement / résultats |
| Modifier | `src/components/prospects/prospect-detail.tsx` | Remplacer PlaceholderTab analyse par ProspectAnalyseTab |
| Créer | `src/__tests__/lib/analyse.test.ts` | 9 tests unitaires lib |
| Créer | `src/__tests__/api/analyse.test.ts` | 6 tests API route |

**Note :** `GET /api/prospects/[id]` inclut déjà `analyses: true` — aucune modification nécessaire.

---

## Task 1 — Migration Prisma + analyzeWithClaude maxTokens

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/lib/anthropic.ts`

- [ ] **Step 1: Modifier prisma/schema.prisma**

Ouvrir `prisma/schema.prisma`. Dans le modèle `Analyse`, changer `prospectId String` en `prospectId String @unique` :

```prisma
model Analyse {
  id              String   @id @default(cuid())
  prospectId      String   @unique
  concurrents     String   // JSON
  recommandations String   // JSON
  promptUsed      String?
  createdAt       DateTime @default(now())

  prospect Prospect @relation(fields: [prospectId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 2: Créer la migration**

```bash
cd "C:\Users\Benja\OneDrive\Bureau\WebAgency" && npx prisma migrate dev --name add_analyse_unique_prospectid
```

Expected: migration créée et appliquée, Prisma Client regénéré.

- [ ] **Step 3: Modifier src/lib/anthropic.ts**

Remplacer le contenu entier de `src/lib/anthropic.ts` par :

```typescript
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function analyzeWithClaude(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 1024
): Promise<string> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  })

  const block = response.content[0]
  if (block.type !== "text") {
    throw new Error("Réponse Claude inattendue")
  }
  return block.text
}

export function parseClaudeJSON<T>(response: string): T {
  try {
    return JSON.parse(response) as T
  } catch { /* ignore */ }

  const fenceMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1]) as T
    } catch { /* ignore */ }
  }

  const jsonMatch = response.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]) as T
    } catch { /* ignore */ }
  }

  throw new Error("Impossible de parser la réponse IA")
}
```

- [ ] **Step 4: Vérifier que tous les tests passent**

```bash
cd "C:\Users\Benja\OneDrive\Bureau\WebAgency" && npx vitest run --reporter=dot 2>&1 | tail -8
```

Expected: tous les tests PASS (125 tests existants).

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\Benja\OneDrive\Bureau\WebAgency" && git add prisma/ src/lib/anthropic.ts && git commit -m "feat: add @unique to Analyse.prospectId, add maxTokens param to analyzeWithClaude"
```

---

## Task 2 — lib/analyse.ts (TDD)

**Files:**
- Create: `src/lib/analyse.ts`
- Test: `src/__tests__/lib/analyse.test.ts`

- [ ] **Step 1: Écrire les tests**

Créer `src/__tests__/lib/analyse.test.ts` :

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/places", () => ({ searchPlaces: vi.fn() }))
vi.mock("@/lib/scrape", () => ({ scrapeUrl: vi.fn() }))
vi.mock("@/lib/anthropic", () => ({
  analyzeWithClaude: vi.fn(),
  parseClaudeJSON: (s: string) => {
    try {
      return JSON.parse(s)
    } catch {
      throw new Error("Impossible de parser la réponse IA")
    }
  },
}))

import { findCompetitorCandidates, scrapeCompetitors, buildAnalyseResult } from "@/lib/analyse"
import { searchPlaces } from "@/lib/places"
import { scrapeUrl } from "@/lib/scrape"
import { analyzeWithClaude } from "@/lib/anthropic"

const makePlace = (id: string, siteUrl: string | null) => ({
  placeId: id,
  nom: `Concurrent ${id}`,
  adresse: "1 rue test",
  telephone: null,
  siteUrl,
  noteGoogle: null,
  nbAvisGoogle: null,
  types: [],
})

describe("findCompetitorCandidates", () => {
  beforeEach(() => vi.clearAllMocks())

  it("retourne max 5 candidats avec siteUrl", async () => {
    const many = Array.from({ length: 10 }, (_, i) => makePlace(`p${i}`, `https://site${i}.com`))
    vi.mocked(searchPlaces).mockResolvedValue(many as any)
    const result = await findCompetitorCandidates("Garagiste", "Lille")
    expect(result).toHaveLength(5)
    result.forEach((r) => expect(r.siteUrl).not.toBeNull())
  })

  it("exclut le placeId du prospect", async () => {
    const places = [makePlace("own", "https://own.com"), makePlace("other", "https://other.com")]
    vi.mocked(searchPlaces).mockResolvedValue(places as any)
    const result = await findCompetitorCandidates("Garagiste", "Lille", "own")
    expect(result.find((r) => r.placeId === "own")).toBeUndefined()
    expect(result).toHaveLength(1)
  })

  it("retourne [] si Places retourne []", async () => {
    vi.mocked(searchPlaces).mockResolvedValue([])
    const result = await findCompetitorCandidates("Garagiste", "Lille")
    expect(result).toHaveLength(0)
  })
})

describe("scrapeCompetitors", () => {
  beforeEach(() => vi.clearAllMocks())

  it("scrape en parallèle et retourne les succès", async () => {
    const candidates = [makePlace("p1", "https://a.com"), makePlace("p2", "https://b.com")]
    vi.mocked(scrapeUrl).mockResolvedValue("<html>content</html>")
    const result = await scrapeCompetitors(candidates as any)
    expect(result).toHaveLength(2)
    expect(result[0].nom).toBe("Concurrent p1")
    expect(result[0].html).toBe("<html>content</html>")
  })

  it("ignore les échecs de scraping", async () => {
    const candidates = [makePlace("p1", "https://a.com"), makePlace("p2", "https://b.com")]
    vi.mocked(scrapeUrl)
      .mockResolvedValueOnce("<html>A</html>")
      .mockRejectedValueOnce(new Error("Timeout"))
    const result = await scrapeCompetitors(candidates as any)
    expect(result).toHaveLength(1)
    expect(result[0].nom).toBe("Concurrent p1")
  })

  it("retourne [] si tout échoue", async () => {
    const candidates = [makePlace("p1", "https://a.com")]
    vi.mocked(scrapeUrl).mockRejectedValue(new Error("Timeout"))
    const result = await scrapeCompetitors(candidates as any)
    expect(result).toHaveLength(0)
  })
})

describe("buildAnalyseResult", () => {
  beforeEach(() => vi.clearAllMocks())

  const prospect = { nom: "Garage Martin", activite: "Garagiste", ville: "Steenvoorde" }
  const scraped = [{ nom: "Concurrent A", siteUrl: "https://a.com", html: "<html>test</html>" }]
  const claudeResponse = JSON.stringify({
    concurrents: [{ nom: "Concurrent A", siteUrl: "https://a.com", forces: ["Site moderne"], faiblesses: ["Pas de contact"], positionnement: "Généraliste" }],
    synthese: "Marché peu concurrentiel",
    recommandations: ["Se démarquer sur les délais"],
  })

  it("appelle analyzeWithClaude avec maxTokens=4096", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue(claudeResponse)
    await buildAnalyseResult(prospect, scraped)
    expect(analyzeWithClaude).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      4096
    )
  })

  it("parse le JSON Claude et retourne AnalyseResult", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue(claudeResponse)
    const result = await buildAnalyseResult(prospect, scraped)
    expect(result.concurrents).toHaveLength(1)
    expect(result.concurrents[0].nom).toBe("Concurrent A")
    expect(result.synthese).toBe("Marché peu concurrentiel")
    expect(result.recommandations).toHaveLength(1)
  })

  it("lève une erreur si Claude retourne du JSON invalide", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue("ceci n'est pas du JSON valide")
    await expect(buildAnalyseResult(prospect, scraped)).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Vérifier que les tests échouent**

```bash
cd "C:\Users\Benja\OneDrive\Bureau\WebAgency" && npx vitest run src/__tests__/lib/analyse.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/analyse'`

- [ ] **Step 3: Créer src/lib/analyse.ts**

```typescript
import { searchPlaces } from "@/lib/places"
import { scrapeUrl } from "@/lib/scrape"
import { analyzeWithClaude, parseClaudeJSON } from "@/lib/anthropic"
import type { PlaceResult } from "@/types/places"

export interface Concurrent {
  nom: string
  siteUrl: string
  forces: string[]
  faiblesses: string[]
  positionnement: string
}

export interface AnalyseResult {
  concurrents: Concurrent[]
  synthese: string
  recommandations: string[]
}

export async function findCompetitorCandidates(
  activite: string,
  ville: string,
  ownPlaceId?: string | null
): Promise<PlaceResult[]> {
  const results = await searchPlaces(activite, ville)
  return results
    .filter((r) => r.siteUrl !== null && r.placeId !== ownPlaceId)
    .slice(0, 5)
}

export async function scrapeCompetitors(
  candidates: PlaceResult[]
): Promise<{ nom: string; siteUrl: string; html: string }[]> {
  const settled = await Promise.allSettled(
    candidates.map(async (c) => ({
      nom: c.nom,
      siteUrl: c.siteUrl!,
      html: await scrapeUrl(c.siteUrl!),
    }))
  )
  return settled
    .filter(
      (r): r is PromiseFulfilledResult<{ nom: string; siteUrl: string; html: string }> =>
        r.status === "fulfilled"
    )
    .map((r) => r.value)
}

const SYSTEM_PROMPT = `Tu es un expert en analyse concurrentielle pour petites entreprises locales en Flandre Intérieure.
Tu analyses des sites web de concurrents et identifies leurs forces, faiblesses et positionnement.
Tu fournis des recommandations concrètes pour se démarquer.
Réponds UNIQUEMENT avec du JSON valide, sans commentaires ni markdown.`

export async function buildAnalyseResult(
  prospect: { nom: string; activite: string; ville: string },
  scrapedCompetitors: { nom: string; siteUrl: string; html: string }[]
): Promise<AnalyseResult> {
  const competitorsText =
    scrapedCompetitors.length === 0
      ? "Aucun concurrent avec site web trouvé dans la zone."
      : scrapedCompetitors
          .map((c) => `--- ${c.nom} (${c.siteUrl}) ---\n${c.html.slice(0, 3000)}`)
          .join("\n\n")

  const userPrompt = `Analyse la concurrence pour :
Entreprise : ${prospect.nom}
Secteur : ${prospect.activite}
Ville : ${prospect.ville}

Concurrents trouvés :
${competitorsText}

Réponds avec ce JSON exact :
{
  "concurrents": [
    {
      "nom": "string",
      "siteUrl": "string",
      "forces": ["string"],
      "faiblesses": ["string"],
      "positionnement": "string"
    }
  ],
  "synthese": "string",
  "recommandations": ["string"]
}`

  const response = await analyzeWithClaude(SYSTEM_PROMPT, userPrompt, 4096)
  return parseClaudeJSON<AnalyseResult>(response)
}
```

- [ ] **Step 4: Vérifier que les 9 tests passent**

```bash
cd "C:\Users\Benja\OneDrive\Bureau\WebAgency" && npx vitest run src/__tests__/lib/analyse.test.ts
```

Expected: 9 tests PASS

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\Benja\OneDrive\Bureau\WebAgency" && git add src/lib/analyse.ts src/__tests__/lib/analyse.test.ts && git commit -m "feat: add lib/analyse (findCompetitorCandidates, scrapeCompetitors, buildAnalyseResult)"
```

---

## Task 3 — POST /api/prospects/[id]/analyse (TDD)

**Files:**
- Create: `src/app/api/prospects/[id]/analyse/route.ts`
- Test: `src/__tests__/api/analyse.test.ts`

- [ ] **Step 1: Écrire les tests**

Créer `src/__tests__/api/analyse.test.ts` :

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/db", () => ({
  prisma: {
    prospect: { findUnique: vi.fn() },
    analyse: { upsert: vi.fn() },
    activite: { create: vi.fn() },
  },
}))
vi.mock("@/lib/analyse", () => ({
  findCompetitorCandidates: vi.fn(),
  scrapeCompetitors: vi.fn(),
  buildAnalyseResult: vi.fn(),
}))

import { POST } from "@/app/api/prospects/[id]/analyse/route"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { findCompetitorCandidates, scrapeCompetitors, buildAnalyseResult } from "@/lib/analyse"

const mockProspect = {
  id: "prospect-1",
  nom: "Garage Martin",
  activite: "Garagiste",
  ville: "Steenvoorde",
  placeId: "place-1",
}

const mockAnalyseResult = {
  concurrents: [
    {
      nom: "Concurrent A",
      siteUrl: "https://a.com",
      forces: ["Bon site"],
      faiblesses: ["Pas de tarifs"],
      positionnement: "Généraliste",
    },
  ],
  synthese: "Marché local peu concurrentiel",
  recommandations: ["Mettre en avant les délais rapides"],
}

const mockDbAnalyse = {
  id: "analyse-1",
  prospectId: "prospect-1",
  concurrents: JSON.stringify(mockAnalyseResult.concurrents),
  recommandations: JSON.stringify({
    synthese: mockAnalyseResult.synthese,
    points: mockAnalyseResult.recommandations,
  }),
  createdAt: new Date("2024-01-01"),
}

function makeReq() {
  return new Request("http://localhost/api/prospects/prospect-1/analyse", { method: "POST" })
}

describe("POST /api/prospects/[id]/analyse", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(undefined)
    vi.mocked(prisma.prospect.findUnique).mockResolvedValue(mockProspect as any)
    vi.mocked(findCompetitorCandidates).mockResolvedValue([])
    vi.mocked(scrapeCompetitors).mockResolvedValue([])
    vi.mocked(buildAnalyseResult).mockResolvedValue(mockAnalyseResult)
    vi.mocked(prisma.analyse.upsert).mockResolvedValue(mockDbAnalyse as any)
    vi.mocked(prisma.activite.create).mockResolvedValue({ id: "act-1" } as any)
  })

  it("retourne 401 si non authentifié", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"))
    const res = await POST(makeReq() as any, { params: Promise.resolve({ id: "prospect-1" }) })
    expect(res.status).toBe(401)
  })

  it("retourne 404 si prospect introuvable", async () => {
    vi.mocked(prisma.prospect.findUnique).mockResolvedValue(null)
    const res = await POST(makeReq() as any, { params: Promise.resolve({ id: "prospect-1" }) })
    expect(res.status).toBe(404)
  })

  it("retourne 200 avec les données de l'analyse", async () => {
    const res = await POST(makeReq() as any, { params: Promise.resolve({ id: "prospect-1" }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.id).toBe("analyse-1")
    expect(json.data.concurrents).toHaveLength(1)
    expect(json.data.synthese).toBe("Marché local peu concurrentiel")
    expect(json.data.recommandations).toHaveLength(1)
  })

  it("appelle prisma.analyse.upsert avec where: { prospectId }", async () => {
    await POST(makeReq() as any, { params: Promise.resolve({ id: "prospect-1" }) })
    expect(prisma.analyse.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { prospectId: "prospect-1" } })
    )
  })

  it("crée une activité ANALYSE avec le bon prospectId", async () => {
    await POST(makeReq() as any, { params: Promise.resolve({ id: "prospect-1" }) })
    expect(prisma.activite.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "ANALYSE", prospectId: "prospect-1" }),
      })
    )
  })

  it("description activité contient le nombre de concurrents", async () => {
    await POST(makeReq() as any, { params: Promise.resolve({ id: "prospect-1" }) })
    const call = vi.mocked(prisma.activite.create).mock.calls[0][0] as any
    expect(call.data.description).toContain("1 concurrent")
  })
})
```

- [ ] **Step 2: Vérifier que les tests échouent**

```bash
cd "C:\Users\Benja\OneDrive\Bureau\WebAgency" && npx vitest run src/__tests__/api/analyse.test.ts
```

Expected: FAIL — `Cannot find module '…/analyse/route'`

- [ ] **Step 3: Créer src/app/api/prospects/[id]/analyse/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { findCompetitorCandidates, scrapeCompetitors, buildAnalyseResult } from "@/lib/analyse"

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()
    const { id } = await params

    const prospect = await prisma.prospect.findUnique({
      where: { id },
      select: { id: true, nom: true, activite: true, ville: true, placeId: true },
    })

    if (!prospect) {
      return NextResponse.json({ error: "Prospect introuvable" }, { status: 404 })
    }

    const candidates = await findCompetitorCandidates(
      prospect.activite,
      prospect.ville,
      prospect.placeId
    )
    const scraped = await scrapeCompetitors(candidates)
    const result = await buildAnalyseResult(prospect, scraped)

    const concurrents = JSON.stringify(result.concurrents)
    const recommandations = JSON.stringify({
      synthese: result.synthese,
      points: result.recommandations,
    })

    const analyse = await prisma.analyse.upsert({
      where: { prospectId: id },
      create: { prospectId: id, concurrents, recommandations },
      update: { concurrents, recommandations, createdAt: new Date() },
    })

    await prisma.activite.create({
      data: {
        prospectId: id,
        type: "ANALYSE",
        description: `Analyse concurrentielle effectuée (${result.concurrents.length} concurrent${result.concurrents.length > 1 ? "s" : ""})`,
      },
    })

    return NextResponse.json({
      data: {
        id: analyse.id,
        concurrents: result.concurrents,
        synthese: result.synthese,
        recommandations: result.recommandations,
        createdAt: analyse.createdAt,
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

- [ ] **Step 4: Vérifier que les 6 tests passent**

```bash
cd "C:\Users\Benja\OneDrive\Bureau\WebAgency" && npx vitest run src/__tests__/api/analyse.test.ts
```

Expected: 6 tests PASS

- [ ] **Step 5: Run tous les tests**

```bash
cd "C:\Users\Benja\OneDrive\Bureau\WebAgency" && npx vitest run --reporter=dot 2>&1 | tail -8
```

Expected: tous les tests PASS

- [ ] **Step 6: Commit**

```bash
cd "C:\Users\Benja\OneDrive\Bureau\WebAgency" && git add src/app/api/prospects/[id]/analyse/ src/__tests__/api/analyse.test.ts && git commit -m "feat: add POST /api/prospects/[id]/analyse (competitors search, scrape, Claude analysis)"
```

---

## Task 4 — UI : prospect-analyse-tab.tsx + wire into prospect-detail.tsx

**Files:**
- Create: `src/components/prospects/prospect-analyse-tab.tsx`
- Modify: `src/components/prospects/prospect-detail.tsx`

**Contexte :**
- `prospect-detail.tsx` reçoit `prospect: ProspectWithRelations` défini dans `src/types/prospect.ts`
- `ProspectWithRelations` a déjà `analyses: Analyse[]` (l'Analyse type est `{ id, prospectId, concurrents: string, recommandations: string, createdAt: string }`)
- `prospect.analyses[0]` est la dernière analyse (ou undefined si aucune)
- Les types `Concurrent` et `AnalyseResult` sont exportés de `@/lib/analyse`
- `formatDate` est dans `@/lib/date`
- `motion` vient de `"motion/react"` (jamais "framer-motion")
- `staggerContainer`, `staggerItem`, `fadeInUp` viennent de `@/lib/animations`

- [ ] **Step 1: Créer src/components/prospects/prospect-analyse-tab.tsx**

```typescript
"use client"

import { useState } from "react"
import { ExternalLink, Search } from "lucide-react"
import { motion } from "motion/react"
import { Button } from "@/components/ui/button"
import { staggerContainer, staggerItem, fadeInUp } from "@/lib/animations"
import { formatDate } from "@/lib/date"
import type { ProspectWithRelations } from "@/types/prospect"
import type { Concurrent } from "@/lib/analyse"

interface AnalyseState {
  id: string
  concurrents: Concurrent[]
  synthese: string
  recommandations: string[]
  createdAt: string
}

function parseRawAnalyse(raw: {
  id: string
  concurrents: string
  recommandations: string
  createdAt: string
}): AnalyseState | null {
  try {
    const concurrents = JSON.parse(raw.concurrents) as Concurrent[]
    const reco = JSON.parse(raw.recommandations) as { synthese: string; points: string[] }
    return { id: raw.id, concurrents, synthese: reco.synthese, recommandations: reco.points, createdAt: raw.createdAt }
  } catch {
    return null
  }
}

interface Props {
  prospect: ProspectWithRelations
}

export function ProspectAnalyseTab({ prospect }: Props) {
  const [analyse, setAnalyse] = useState<AnalyseState | null>(() => {
    const raw = prospect.analyses[0]
    return raw ? parseRawAnalyse(raw) : null
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAnalyse() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/prospects/${prospect.id}/analyse`, { method: "POST" })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "Erreur lors de l'analyse")
        return
      }
      setAnalyse({
        id: json.data.id,
        concurrents: json.data.concurrents,
        synthese: json.data.synthese,
        recommandations: json.data.recommandations,
        createdAt: json.data.createdAt,
      })
    } catch {
      setError("Erreur réseau")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-8 h-8 border-2 border-[#737373] border-t-[#fafafa] rounded-full animate-spin mb-4" />
        <p className="text-sm text-[#737373]">Analyse en cours... (30–60 secondes)</p>
      </div>
    )
  }

  if (!analyse) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Search size={48} className="text-[#555555] mb-4" />
        <p className="text-sm text-[#737373] mb-4">Aucune analyse concurrentielle</p>
        {error && <p className="text-xs text-[#f87171] mb-4">{error}</p>}
        <Button onClick={handleAnalyse}>Analyser la concurrence</Button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-xs text-[#555555]">Analysé le {formatDate(analyse.createdAt)}</p>
        <Button variant="outline" size="sm" onClick={handleAnalyse}>
          Relancer l'analyse
        </Button>
      </div>

      {error && <p className="text-xs text-[#f87171] mb-4">{error}</p>}

      {/* Concurrents */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6"
      >
        {analyse.concurrents.map((c, i) => (
          <motion.div
            key={i}
            variants={staggerItem}
            className="rounded-[6px] border border-[#1a1a1a] bg-[#0a0a0a] p-4"
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <p className="text-sm font-semibold text-[#fafafa]">{c.nom}</p>
              <a
                href={c.siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#737373] hover:text-[#fafafa] transition-colors shrink-0"
              >
                <ExternalLink size={14} />
              </a>
            </div>

            {c.forces.length > 0 && (
              <div className="mb-2">
                <p className="text-xs text-[#555555] uppercase tracking-wider mb-1">Forces</p>
                <ul className="flex flex-col gap-0.5">
                  {c.forces.map((f, j) => (
                    <li key={j} className="text-xs text-[#fafafa] flex items-start gap-1">
                      <span className="text-[#4ade80] mt-0.5 shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {c.faiblesses.length > 0 && (
              <div className="mb-2">
                <p className="text-xs text-[#555555] uppercase tracking-wider mb-1">Faiblesses</p>
                <ul className="flex flex-col gap-0.5">
                  {c.faiblesses.map((f, j) => (
                    <li key={j} className="text-xs text-[#fafafa] flex items-start gap-1">
                      <span className="text-[#f87171] mt-0.5 shrink-0">✗</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {c.positionnement && (
              <p className="text-xs text-[#737373] italic mt-2">{c.positionnement}</p>
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* Synthèse */}
      <motion.div variants={fadeInUp} initial="initial" animate="animate">
        <div className="rounded-[6px] border border-[#1a1a1a] bg-[#0a0a0a] p-4">
          <p className="text-xs text-[#555555] uppercase tracking-wider mb-3">
            Synthèse & Recommandations
          </p>
          <p className="text-sm text-[#fafafa] mb-4">{analyse.synthese}</p>
          <ul className="flex flex-col gap-2">
            {analyse.recommandations.map((r, i) => (
              <li key={i} className="text-sm text-[#fafafa] flex items-start gap-2">
                <span className="text-[#fbbf24] mt-0.5 shrink-0">→</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      </motion.div>
    </div>
  )
}
```

- [ ] **Step 2: Modifier src/components/prospects/prospect-detail.tsx**

Remplacer le contenu entier de `src/components/prospects/prospect-detail.tsx` par :

```typescript
"use client"

import { useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "motion/react"
import { ArrowLeft } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { slideIn } from "@/lib/animations"
import { StatusBadge } from "@/components/prospects/status-badge"
import { DemarcherSheet } from "@/components/prospects/demarcher-sheet"
import { ProspectInfoTab } from "@/components/prospects/prospect-info-tab"
import { ProspectActivityTab } from "@/components/prospects/prospect-activity-tab"
import { ProspectMaquetteTab } from "@/components/prospects/prospect-maquette-tab"
import { ProspectAnalyseTab } from "@/components/prospects/prospect-analyse-tab"
import type { ProspectWithRelations } from "@/types/prospect"

export function ProspectDetail({ prospect }: { prospect: ProspectWithRelations }) {
  const [activeTab, setActiveTab] = useState("informations")
  const [showDemarcher, setShowDemarcher] = useState(false)

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-[#fafafa]">{prospect.nom}</h1>
            <StatusBadge statut={prospect.statutPipeline} />
          </div>
          <Button size="sm" onClick={() => setShowDemarcher(true)}>
            Démarcher
          </Button>
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
              {activeTab === "informations" && (
                <ProspectInfoTab prospect={prospect} />
              )}

              {activeTab === "analyse" && (
                <ProspectAnalyseTab prospect={prospect} />
              )}

              {activeTab === "maquette" && (
                <ProspectMaquetteTab prospect={prospect} />
              )}

              {activeTab === "activite" && (
                <ProspectActivityTab activites={prospect.activites} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </Tabs>

      {showDemarcher && (
        <DemarcherSheet prospect={prospect} onClose={() => setShowDemarcher(false)} />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Build check**

```bash
cd "C:\Users\Benja\OneDrive\Bureau\WebAgency" && npm run build 2>&1 | tail -20
```

Expected: 0 TypeScript errors. Si erreurs TypeScript :
- Vérifier que `Concurrent` est bien importé de `@/lib/analyse`
- Vérifier que `formatDate` prend bien une `string` (le type `Analyse.createdAt` est `string` dans `src/types/prospect.ts`)

- [ ] **Step 4: Run tous les tests**

```bash
cd "C:\Users\Benja\OneDrive\Bureau\WebAgency" && npx vitest run --reporter=dot 2>&1 | tail -8
```

Expected: tous les tests PASS

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\Benja\OneDrive\Bureau\WebAgency" && git add src/components/prospects/prospect-analyse-tab.tsx src/components/prospects/prospect-detail.tsx && git commit -m "feat: implement prospect-analyse-tab and wire into prospect-detail"
```

---

## Self-Review

### 1. Spec coverage

| Exigence | Tâche |
|----------|-------|
| POST /api/prospects/[id]/analyse | Task 3 |
| Cherche 5 concurrents (Google Places même secteur + même zone) | Task 2 — findCompetitorCandidates |
| Prend les 5 premiers avec site (option C) | Task 2 — filter siteUrl + slice(0,5) |
| Scrape leurs sites (Firecrawl) | Task 2 — scrapeCompetitors |
| Analyse par Claude (forces, faiblesses, positionnement, recommandations) | Task 2 — buildAnalyseResult |
| Sauvegarde en modèle Analyse (upsert — 1 par prospect) | Task 3 + Task 1 migration @unique |
| Affichage : liste concurrents avec forces/faiblesses | Task 4 — prospect-analyse-tab |
| Synthèse avec recommandations | Task 4 — prospect-analyse-tab |
| L'analyse alimente buildStitchPrompt | Déjà supporté — buildStitchPrompt accepte analyse.recommandations depuis Session 7 |
| analyzeWithClaude avec max 4096 tokens | Task 1 — ajout maxTokens param, Task 2 — appel avec 4096 |

✅ Tous les points couverts.

### 2. Placeholder scan

Aucun placeholder — chaque step contient le code complet.

### 3. Type consistency

- `Concurrent` défini dans Task 2 (`lib/analyse.ts`), importé dans Task 4 (`prospect-analyse-tab.tsx`) via `import type { Concurrent } from "@/lib/analyse"` ✅
- `AnalyseResult` défini dans Task 2, utilisé dans Task 3 (`buildAnalyseResult` retourne `AnalyseResult`) ✅
- `analyse.concurrents.length` dans Task 3 — `AnalyseResult.concurrents` est `Concurrent[]` ✅
- `prospect.analyses[0]` dans Task 4 — `ProspectWithRelations.analyses` est `Analyse[]` (défini dans `src/types/prospect.ts`) ✅
- `parseRawAnalyse` dans Task 4 prend `{ id, concurrents, recommandations, createdAt }` — correspond exactement au type `Analyse` de `src/types/prospect.ts` ✅
