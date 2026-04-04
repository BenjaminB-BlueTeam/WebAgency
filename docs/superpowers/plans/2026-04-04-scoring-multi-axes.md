# Scoring Multi-Axes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Score prospects on 5 axes using PageSpeed, Firecrawl and Claude, with a manual trigger button on the prospect detail page.

**Architecture:** Three lib files (anthropic, scrape, scoring), one API route, one UI button addition. Tests for scoring logic and JSON parsing.

**Tech Stack:** @anthropic-ai/sdk, Firecrawl REST API, PageSpeed Insights API, Vitest

**Spec:** `docs/superpowers/specs/2026-04-04-scoring-multi-axes-design.md`

---

### Task 1: Install Anthropic SDK + create lib/anthropic.ts

**Files:**
- Create: `src/lib/anthropic.ts`

- [ ] **Step 1: Install @anthropic-ai/sdk**

```bash
npm install @anthropic-ai/sdk
```

- [ ] **Step 2: Create lib/anthropic.ts**

Create `src/lib/anthropic.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function analyzeWithClaude(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
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
  // Try direct parse
  try {
    return JSON.parse(response) as T
  } catch {
    // ignore
  }

  // Try extracting from ```json ... ``` fences
  const fenceMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1]) as T
    } catch {
      // ignore
    }
  }

  // Try extracting { ... } from text
  const jsonMatch = response.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]) as T
    } catch {
      // ignore
    }
  }

  throw new Error("Impossible de parser la réponse IA")
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/anthropic.ts package.json package-lock.json
git commit -m "feat: add Anthropic SDK client with Claude analysis and JSON parsing"
```

---

### Task 2: Create lib/scrape.ts (Firecrawl)

**Files:**
- Create: `src/lib/scrape.ts`

- [ ] **Step 1: Create lib/scrape.ts**

Create `src/lib/scrape.ts`:

```typescript
const FIRECRAWL_ENDPOINT = "https://api.firecrawl.dev/v1/scrape"

export async function scrapeUrl(url: string): Promise<string> {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) {
    throw new Error("Clé API Firecrawl non configurée")
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  try {
    const res = await fetch(FIRECRAWL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ url, formats: ["html"] }),
      signal: controller.signal,
    })

    if (!res.ok) {
      if (res.status === 401) throw new Error("Clé API Firecrawl invalide")
      if (res.status === 402) throw new Error("Quota Firecrawl épuisé")
      throw new Error(`Erreur Firecrawl (${res.status})`)
    }

    const data = await res.json()
    return data.data?.html ?? ""
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Timeout Firecrawl (30s)")
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/scrape.ts
git commit -m "feat: add Firecrawl scraping client"
```

---

### Task 3: Create lib/scoring.ts

**Files:**
- Create: `src/lib/scoring.ts`

- [ ] **Step 1: Create lib/scoring.ts**

Create `src/lib/scoring.ts`:

```typescript
import { analyzeWithClaude, parseClaudeJSON } from "@/lib/anthropic"
import { scrapeUrl } from "@/lib/scrape"

interface ProspectData {
  siteUrl: string | null
  activite: string
  ville: string
  noteGoogle: number | null
  nbAvisGoogle: number | null
}

interface ScoringResult {
  scorePresenceWeb: number
  scoreSEO: number | null
  scoreDesign: number | null
  scoreFinancier: number | null
  scorePotentiel: number | null
  scoreGlobal: number | null
}

interface WeightedScore {
  score: number | null
  poids: number
}

export function calculateGlobalScore(scores: {
  scorePresenceWeb: number
  scoreSEO: number | null
  scoreDesign: number | null
  scoreFinancier: number | null
  scorePotentiel: number | null
}): number | null {
  const axes: WeightedScore[] = [
    { score: scores.scorePresenceWeb, poids: 3 },
    { score: scores.scoreSEO, poids: 2 },
    { score: scores.scoreDesign, poids: 2 },
    { score: scores.scoreFinancier, poids: 1 },
    { score: scores.scorePotentiel, poids: 3 },
  ]

  const valid = axes.filter(
    (a): a is { score: number; poids: number } => a.score !== null
  )
  if (valid.length === 0) return null

  const sum = valid.reduce((acc, a) => acc + a.score * a.poids, 0)
  const poidsTotal = valid.reduce((acc, a) => acc + a.poids, 0)
  return Math.round(sum / poidsTotal)
}

export function scoreFinancier(
  noteGoogle: number | null,
  nbAvisGoogle: number | null
): number | null {
  if (noteGoogle === null || nbAvisGoogle === null) return null
  return Math.min(
    10,
    Math.round((noteGoogle / 5) * 5 + Math.min(nbAvisGoogle / 50, 5))
  )
}

async function scorePresenceWeb(siteUrl: string | null): Promise<number> {
  if (!siteUrl) return 10

  if (!siteUrl.startsWith("https://")) return 8

  try {
    const apiKey = process.env.GOOGLE_PLACES_KEY
    if (!apiKey) return 5

    const url = new URL(
      "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
    )
    url.searchParams.set("url", siteUrl)
    url.searchParams.set("key", apiKey)
    url.searchParams.set("category", "performance")
    url.searchParams.set("strategy", "mobile")

    const res = await fetch(url.toString())
    if (!res.ok) return 5

    const data = await res.json()
    const perfScore =
      (data.lighthouseResult?.categories?.performance?.score ?? 0.5) * 100

    if (perfScore < 50) return 6
    if (perfScore <= 80) return 3
    return 1
  } catch {
    return 5
  }
}

async function scoreSEO(siteUrl: string | null): Promise<number | null> {
  if (!siteUrl) return null

  try {
    const apiKey = process.env.GOOGLE_PLACES_KEY
    if (!apiKey) return null

    const url = new URL(
      "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
    )
    url.searchParams.set("url", siteUrl)
    url.searchParams.set("key", apiKey)
    url.searchParams.set("category", "seo")
    url.searchParams.set("strategy", "mobile")

    const res = await fetch(url.toString())
    if (!res.ok) return null

    const data = await res.json()
    const seoScore =
      (data.lighthouseResult?.categories?.seo?.score ?? 0.5) * 100

    return Math.max(0, Math.min(10, 10 - Math.round(seoScore / 10)))
  } catch {
    return null
  }
}

async function scoreDesign(
  siteUrl: string | null,
  activite: string,
  ville: string
): Promise<number | null> {
  if (!siteUrl) return null

  try {
    const html = await scrapeUrl(siteUrl)
    const truncatedHtml = html.slice(0, 4000)

    const response = await analyzeWithClaude(
      "Tu es un expert en design web. Réponds uniquement en JSON valide.",
      `Analyse ce site web d'un ${activite} à ${ville}. Voici le HTML (tronqué) :\n\n${truncatedHtml}\n\nNote de 0 à 10 la qualité du design (modernité, responsive, CTA, lisibilité). Réponds avec : {"score": number, "raisons": string[]}`
    )

    const parsed = parseClaudeJSON<{ score: number }>(response)
    const inverted = 10 - parsed.score
    return Math.max(0, Math.min(10, inverted))
  } catch {
    return null
  }
}

async function scorePotentiel(
  prospect: ProspectData,
  scores: {
    scorePresenceWeb: number
    scoreSEO: number | null
    scoreDesign: number | null
  }
): Promise<number | null> {
  try {
    const response = await analyzeWithClaude(
      "Tu es un expert en prospection commerciale pour les agences web. Réponds uniquement en JSON valide.",
      `Basé sur ces données d'un ${prospect.activite} à ${prospect.ville} :
- noteGoogle: ${prospect.noteGoogle ?? "inconnue"}
- nbAvis: ${prospect.nbAvisGoogle ?? "inconnu"}
- siteUrl: ${prospect.siteUrl ?? "aucun site"}
- scorePresenceWeb: ${scores.scorePresenceWeb}/10
- scoreSEO: ${scores.scoreSEO !== null ? scores.scoreSEO + "/10" : "non applicable"}
- scoreDesign: ${scores.scoreDesign !== null ? scores.scoreDesign + "/10" : "non applicable"}

Score de 0 à 10 sa probabilité d'acheter un site web. 10 = besoin urgent et évident. Réponds avec : {"score": number, "justification": string}`
    )

    const parsed = parseClaudeJSON<{ score: number }>(response)
    return Math.max(0, Math.min(10, parsed.score))
  } catch {
    return null
  }
}

export async function scoreProspect(
  prospect: ProspectData
): Promise<ScoringResult> {
  const presenceWeb = await scorePresenceWeb(prospect.siteUrl)
  const seo = await scoreSEO(prospect.siteUrl)
  const design = await scoreDesign(
    prospect.siteUrl,
    prospect.activite,
    prospect.ville
  )
  const financier = scoreFinancier(prospect.noteGoogle, prospect.nbAvisGoogle)
  const potentiel = await scorePotentiel(prospect, {
    scorePresenceWeb: presenceWeb,
    scoreSEO: seo,
    scoreDesign: design,
  })

  const allScores = {
    scorePresenceWeb: presenceWeb,
    scoreSEO: seo,
    scoreDesign: design,
    scoreFinancier: financier,
    scorePotentiel: potentiel,
  }

  const scoreGlobal = calculateGlobalScore(allScores)

  return { ...allScores, scoreGlobal }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/lib/scoring.ts
git commit -m "feat: add multi-axis scoring orchestrator"
```

---

### Task 4: Tests (scoring + JSON parsing)

**Files:**
- Create: `src/__tests__/lib/scoring.test.ts`

- [ ] **Step 1: Create test file**

Create `src/__tests__/lib/scoring.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import { calculateGlobalScore, scoreFinancier } from "@/lib/scoring"
import { parseClaudeJSON } from "@/lib/anthropic"

describe("calculateGlobalScore", () => {
  it("calculates weighted average with all axes", () => {
    const result = calculateGlobalScore({
      scorePresenceWeb: 10, // x3 = 30
      scoreSEO: 8,          // x2 = 16
      scoreDesign: 6,        // x2 = 12
      scoreFinancier: 7,     // x1 = 7
      scorePotentiel: 9,     // x3 = 27
    })
    // (30+16+12+7+27) / (3+2+2+1+3) = 92/11 = 8.36 → 8
    expect(result).toBe(8)
  })

  it("excludes null axes from calculation", () => {
    const result = calculateGlobalScore({
      scorePresenceWeb: 10, // x3 = 30
      scoreSEO: null,
      scoreDesign: null,
      scoreFinancier: null,
      scorePotentiel: 8,     // x3 = 24
    })
    // (30+24) / (3+3) = 54/6 = 9
    expect(result).toBe(9)
  })

  it("returns null when only scorePresenceWeb and all others null", () => {
    // scorePresenceWeb is always a number (never null), so this can't be all null
    // but let's test with minimal axes
    const result = calculateGlobalScore({
      scorePresenceWeb: 5,
      scoreSEO: null,
      scoreDesign: null,
      scoreFinancier: null,
      scorePotentiel: null,
    })
    // 5*3 / 3 = 5
    expect(result).toBe(5)
  })
})

describe("scoreFinancier", () => {
  it("calculates score from noteGoogle and nbAvisGoogle", () => {
    // (4.5/5)*5 + min(120/50, 5) = 4.5 + 2.4 = 6.9 → 7
    expect(scoreFinancier(4.5, 120)).toBe(7)
  })

  it("caps at 10", () => {
    // (5/5)*5 + min(500/50, 5) = 5 + 5 = 10
    expect(scoreFinancier(5, 500)).toBe(10)
  })

  it("returns null when noteGoogle is null", () => {
    expect(scoreFinancier(null, 100)).toBeNull()
  })

  it("returns null when nbAvisGoogle is null", () => {
    expect(scoreFinancier(4.0, null)).toBeNull()
  })

  it("handles low values", () => {
    // (2/5)*5 + min(5/50, 5) = 2 + 0.1 = 2.1 → 2
    expect(scoreFinancier(2, 5)).toBe(2)
  })
})

describe("parseClaudeJSON", () => {
  it("parses direct JSON", () => {
    const result = parseClaudeJSON<{ score: number }>(
      '{"score": 7, "raisons": ["test"]}'
    )
    expect(result.score).toBe(7)
  })

  it("parses JSON in markdown fences", () => {
    const result = parseClaudeJSON<{ score: number }>(
      'Voici mon analyse:\n```json\n{"score": 8}\n```'
    )
    expect(result.score).toBe(8)
  })

  it("parses JSON embedded in text", () => {
    const result = parseClaudeJSON<{ score: number }>(
      'Le score est {"score": 5, "justification": "test"} voilà.'
    )
    expect(result.score).toBe(5)
  })

  it("throws on invalid input", () => {
    expect(() => parseClaudeJSON("pas du json du tout")).toThrow(
      "Impossible de parser la réponse IA"
    )
  })
})
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/__tests__/lib/scoring.test.ts`
Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/lib/scoring.test.ts
git commit -m "test: add scoring and JSON parsing tests"
```

---

### Task 5: POST /api/prospects/[id]/score route

**Files:**
- Create: `src/app/api/prospects/[id]/score/route.ts`

- [ ] **Step 1: Create the route**

Create `src/app/api/prospects/[id]/score/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { scoreProspect } from "@/lib/scoring"

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()

    const { id } = await params

    const prospect = await prisma.prospect.findUnique({
      where: { id },
      select: {
        id: true,
        siteUrl: true,
        activite: true,
        ville: true,
        noteGoogle: true,
        nbAvisGoogle: true,
      },
    })

    if (!prospect) {
      return NextResponse.json(
        { error: "Prospect non trouvé" },
        { status: 404 }
      )
    }

    const scores = await scoreProspect({
      siteUrl: prospect.siteUrl,
      activite: prospect.activite,
      ville: prospect.ville,
      noteGoogle: prospect.noteGoogle,
      nbAvisGoogle: prospect.nbAvisGoogle,
    })

    await prisma.prospect.update({
      where: { id },
      data: {
        scorePresenceWeb: scores.scorePresenceWeb,
        scoreSEO: scores.scoreSEO,
        scoreDesign: scores.scoreDesign,
        scoreFinancier: scores.scoreFinancier,
        scorePotentiel: scores.scorePotentiel,
        scoreGlobal: scores.scoreGlobal,
      },
    })

    await prisma.activite.create({
      data: {
        prospectId: id,
        type: "SCORING",
        description: `Scoring effectué — Score global : ${scores.scoreGlobal ?? "N/A"}/10`,
      },
    })

    return NextResponse.json({ data: scores })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/prospects/[id]/score/route.ts"
git commit -m "feat: add POST /api/prospects/[id]/score route"
```

---

### Task 6: Add "Scorer" button to prospect info tab

**Files:**
- Modify: `src/components/prospects/prospect-info-tab.tsx`

Read the file first. Then add:

1. A new state: `scoring: boolean` (default false) and `scores` state to track updated values
2. A `handleScore` function that POSTs to `/api/prospects/${prospect.id}/score`, shows toast, updates scores state
3. A button next to the "Scoring" section title:
   - If scoreGlobal exists: "Rescorer" (outline variant)
   - If not: "Scorer ce prospect" (default variant)
   - Icon: `Zap` from lucide-react
   - Disabled + spinner while scoring, text "Analyse en cours..."
4. The ScoreBar values should read from local `scores` state (initialized from prospect props, updated after scoring)

- [ ] **Step 1: Read and modify prospect-info-tab.tsx**

Add the scoring button and state management as described above. Keep all existing code — only add the button and update score values.

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/components/prospects/prospect-info-tab.tsx
git commit -m "feat: add Score button to prospect info tab"
```

---

### Task 7: Final verification

- [ ] **Step 1: TypeScript check**

Run: `npx tsc --noEmit --pretty`

- [ ] **Step 2: Run all tests**

Run: `npm run test`

- [ ] **Step 3: Lint check**

Run: `npm run lint`

- [ ] **Step 4: Fix any issues and commit**
