# Crawl multi-pages — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le scrape single-page par un crawl multi-pages (map + scrape sélectif) pour l'analyse concurrentielle, afin d'obtenir un audit plus complet.

**Architecture:** `mapSite()` récupère la liste des URLs d'un site via Firecrawl `/v1/map`. `selectRelevantPages()` filtre et priorise les URLs par mots-clés métier. `crawlSite()` orchestre le tout et retourne le contenu markdown de 5 pages max. `scrapeCompetitors` et `buildAnalyseResult` sont adaptés pour le format multi-pages.

**Tech Stack:** Firecrawl API (`/v1/map` + `/v1/scrape`), Vitest

**Spec:** `docs/superpowers/specs/2026-04-09-crawl-multi-pages-design.md`

---

### Task 1: `selectRelevantPages` — Fonction pure de filtrage/priorisation

**Files:**
- Modify: `src/lib/scrape.ts`
- Create: `src/__tests__/lib/scrape.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/__tests__/lib/scrape.test.ts
import { describe, it, expect } from "vitest"
import { selectRelevantPages } from "@/lib/scrape"

describe("selectRelevantPages", () => {
  const base = "https://example.com"

  it("inclut toujours la homepage", () => {
    const urls = ["https://example.com", "https://example.com/blog/article-1"]
    const result = selectRelevantPages(urls, base, 5)
    expect(result).toContain("https://example.com")
  })

  it("priorise les pages services/tarifs avant les autres", () => {
    const urls = [
      "https://example.com",
      "https://example.com/blog/news",
      "https://example.com/services",
      "https://example.com/tarifs",
      "https://example.com/equipe",
      "https://example.com/realisations",
      "https://example.com/contact",
      "https://example.com/mentions-legales",
    ]
    const result = selectRelevantPages(urls, base, 5)
    expect(result).toContain("https://example.com/services")
    expect(result).toContain("https://example.com/tarifs")
    expect(result).not.toContain("https://example.com/mentions-legales")
    expect(result).not.toContain("https://example.com/blog/news")
  })

  it("exclut les pages blog, legales, admin, wp-", () => {
    const urls = [
      "https://example.com",
      "https://example.com/blog/article",
      "https://example.com/mentions-legales",
      "https://example.com/cgv",
      "https://example.com/wp-admin",
      "https://example.com/login",
      "https://example.com/services",
    ]
    const result = selectRelevantPages(urls, base, 5)
    expect(result).toEqual(["https://example.com", "https://example.com/services"])
  })

  it("respecte le cap max", () => {
    const urls = [
      "https://example.com",
      "https://example.com/services",
      "https://example.com/tarifs",
      "https://example.com/realisations",
      "https://example.com/equipe",
      "https://example.com/contact",
    ]
    const result = selectRelevantPages(urls, base, 3)
    expect(result).toHaveLength(3)
    expect(result[0]).toBe("https://example.com")
  })

  it("retourne la homepage seule si aucune URL pertinente", () => {
    const urls = [
      "https://example.com",
      "https://example.com/blog/post-1",
      "https://example.com/cgu",
    ]
    const result = selectRelevantPages(urls, base, 5)
    expect(result).toEqual(["https://example.com"])
  })

  it("déduplique la homepage si présente dans les URLs", () => {
    const urls = [
      "https://example.com",
      "https://example.com/",
      "https://example.com/services",
    ]
    const result = selectRelevantPages(urls, base, 5)
    const homepageCount = result.filter(
      (u) => u === "https://example.com" || u === "https://example.com/"
    ).length
    expect(homepageCount).toBe(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/lib/scrape.test.ts`
Expected: FAIL — `selectRelevantPages` is not exported from `@/lib/scrape`

- [ ] **Step 3: Implement `selectRelevantPages`**

Add to `src/lib/scrape.ts`:

```ts
const PRIORITY_1 = /service|prestation|tarif|prix|offre|formule/i
const PRIORITY_2 = /realisation|projet|portfolio|reference|galerie/i
const PRIORITY_3 = /about|qui-sommes|equipe|contact|agence|entreprise|a-propos/i
const EXCLUDE = /blog|article|actu|mentions-legales|cgv|cgu|politique|cookie|login|admin|wp-|panier|cart|checkout/i

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, "")
}

function scorePath(url: string): number {
  const path = new URL(url).pathname
  if (EXCLUDE.test(path)) return -1
  if (PRIORITY_1.test(path)) return 3
  if (PRIORITY_2.test(path)) return 2
  if (PRIORITY_3.test(path)) return 1
  return 0
}

export function selectRelevantPages(
  urls: string[],
  baseUrl: string,
  max: number = 5
): string[] {
  const normalizedBase = normalizeUrl(baseUrl)
  const seen = new Set<string>()
  const result: string[] = []

  // Always include homepage first
  const homepage = urls.find(
    (u) => normalizeUrl(u) === normalizedBase || normalizeUrl(u) === normalizedBase + "/"
  ) ?? baseUrl
  result.push(normalizeUrl(homepage))
  seen.add(normalizeUrl(homepage))

  // Score and sort remaining URLs
  const scored = urls
    .filter((u) => !seen.has(normalizeUrl(u)))
    .map((u) => ({ url: u, score: scorePath(u) }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => b.score - a.score)

  for (const entry of scored) {
    if (result.length >= max) break
    const norm = normalizeUrl(entry.url)
    if (!seen.has(norm)) {
      result.push(entry.url)
      seen.add(norm)
    }
  }

  return result
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/lib/scrape.test.ts`
Expected: 6 PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/scrape.ts src/__tests__/lib/scrape.test.ts
git commit -m "feat(scrape): add selectRelevantPages with priority filtering"
```

---

### Task 2: `mapSite` — Récupération des URLs via Firecrawl `/v1/map`

**Files:**
- Modify: `src/lib/scrape.ts`
- Modify: `src/__tests__/lib/scrape.test.ts`

- [ ] **Step 1: Write the failing tests**

Ajouter à `src/__tests__/lib/scrape.test.ts` :

```ts
import { describe, it, expect, vi, beforeEach } from "vitest"
// ... existing imports ...
import { mapSite } from "@/lib/scrape"

// Add at top level, before describes:
const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

describe("mapSite", () => {
  beforeEach(() => vi.clearAllMocks())

  it("retourne les URLs depuis Firecrawl /v1/map", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        links: [
          "https://example.com",
          "https://example.com/services",
          "https://example.com/contact",
        ],
      }),
    })
    const urls = await mapSite("https://example.com")
    expect(urls).toEqual([
      "https://example.com",
      "https://example.com/services",
      "https://example.com/contact",
    ])
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.firecrawl.dev/v1/map",
      expect.objectContaining({ method: "POST" })
    )
  })

  it("retourne [url] en fallback si l'API échoue", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 })
    const urls = await mapSite("https://example.com")
    expect(urls).toEqual(["https://example.com"])
  })

  it("retourne [url] en fallback si fetch throw", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"))
    const urls = await mapSite("https://example.com")
    expect(urls).toEqual(["https://example.com"])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/lib/scrape.test.ts`
Expected: FAIL — `mapSite` is not exported

- [ ] **Step 3: Implement `mapSite`**

Add to `src/lib/scrape.ts`:

```ts
const FIRECRAWL_MAP_ENDPOINT = "https://api.firecrawl.dev/v1/map"

export async function mapSite(url: string): Promise<string[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) return [url]

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  try {
    const res = await fetch(FIRECRAWL_MAP_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    })

    if (!res.ok) return [url]

    const data = await res.json()
    const links: string[] = data.links ?? []
    return links.length > 0 ? links : [url]
  } catch {
    return [url]
  } finally {
    clearTimeout(timeout)
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/lib/scrape.test.ts`
Expected: 9 PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/scrape.ts src/__tests__/lib/scrape.test.ts
git commit -m "feat(scrape): add mapSite via Firecrawl /v1/map"
```

---

### Task 3: `crawlSite` — Orchestration map + scrape sélectif

**Files:**
- Modify: `src/lib/scrape.ts`
- Modify: `src/__tests__/lib/scrape.test.ts`

- [ ] **Step 1: Write the failing tests**

Ajouter à `src/__tests__/lib/scrape.test.ts` :

```ts
import { crawlSite } from "@/lib/scrape"

describe("crawlSite", () => {
  beforeEach(() => vi.clearAllMocks())

  it("map + scrape les pages pertinentes en markdown", async () => {
    // mapSite response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        links: [
          "https://example.com",
          "https://example.com/services",
          "https://example.com/blog/post",
          "https://example.com/tarifs",
        ],
      }),
    })
    // scrapeUrl calls (homepage, services, tarifs — blog excluded)
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { markdown: "# Accueil" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { markdown: "# Services" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { markdown: "# Tarifs" } }),
      })

    const pages = await crawlSite("https://example.com")
    expect(pages).toHaveLength(3)
    expect(pages[0]).toEqual({ pageUrl: "https://example.com", content: "# Accueil" })
    expect(pages[1]).toEqual({ pageUrl: "https://example.com/services", content: "# Services" })
    expect(pages[2]).toEqual({ pageUrl: "https://example.com/tarifs", content: "# Tarifs" })
  })

  it("retourne au moins la homepage si map échoue", async () => {
    // mapSite fails → fallback [url]
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    // scrapeUrl for homepage
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { markdown: "# Home" } }),
    })

    const pages = await crawlSite("https://example.com")
    expect(pages).toHaveLength(1)
    expect(pages[0].content).toBe("# Home")
  })

  it("exclut les pages dont le scrape échoue", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        links: ["https://example.com", "https://example.com/services"],
      }),
    })
    // homepage OK
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { markdown: "# Home" } }),
    })
    // services fails
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })

    const pages = await crawlSite("https://example.com")
    expect(pages).toHaveLength(1)
    expect(pages[0].pageUrl).toBe("https://example.com")
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/lib/scrape.test.ts`
Expected: FAIL — `crawlSite` is not exported

- [ ] **Step 3: Implement `crawlSite`**

First, refactor `scrapeUrl` to support a `format` parameter. Modify the existing function in `src/lib/scrape.ts`:

```ts
export async function scrapeUrl(url: string, format: "html" | "markdown" = "html"): Promise<string> {
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
      body: JSON.stringify({ url, formats: [format] }),
      signal: controller.signal,
    })

    if (!res.ok) {
      if (res.status === 401) throw new Error("Clé API Firecrawl invalide")
      if (res.status === 402) throw new Error("Quota Firecrawl épuisé")
      throw new Error(`Erreur Firecrawl (${res.status})`)
    }

    const data = await res.json()
    return data.data?.[format] ?? ""
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

Then add `crawlSite`:

```ts
export interface CrawledPage {
  pageUrl: string
  content: string
}

export async function crawlSite(url: string, maxPages: number = 5): Promise<CrawledPage[]> {
  const allUrls = await mapSite(url)
  const selected = selectRelevantPages(allUrls, url, maxPages)

  const settled = await Promise.allSettled(
    selected.map(async (pageUrl) => {
      const content = await scrapeUrl(pageUrl, "markdown")
      return { pageUrl, content }
    })
  )

  return settled
    .filter(
      (r): r is PromiseFulfilledResult<CrawledPage> => r.status === "fulfilled"
    )
    .map((r) => r.value)
    .filter((p) => p.content.length > 0)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/lib/scrape.test.ts`
Expected: 12 PASS

- [ ] **Step 5: Run full test suite to check no regression**

Run: `npx vitest run`
Expected: all tests pass (scrapeUrl signature is backward-compatible via default param)

- [ ] **Step 6: Commit**

```bash
git add src/lib/scrape.ts src/__tests__/lib/scrape.test.ts
git commit -m "feat(scrape): add crawlSite orchestrating map + selective scrape"
```

---

### Task 4: Adapter `scrapeCompetitors` et `buildAnalyseResult` pour multi-pages

**Files:**
- Modify: `src/lib/analyse.ts`
- Modify: `src/__tests__/lib/analyse.test.ts`

- [ ] **Step 1: Update tests for multi-pages format**

Replace the `scrapeCompetitors` and `buildAnalyseResult` test sections in `src/__tests__/lib/analyse.test.ts`:

Update mock at top of file — replace `scrapeUrl` mock with `crawlSite` mock:

```ts
vi.mock("@/lib/scrape", () => ({ crawlSite: vi.fn() }))
```

Update imports:

```ts
import { findCompetitorCandidates, scrapeCompetitors, buildAnalyseResult } from "@/lib/analyse"
import { searchPlaces } from "@/lib/places"
import { crawlSite } from "@/lib/scrape"
import { analyzeWithClaude } from "@/lib/anthropic"
```

Replace `scrapeCompetitors` describe block:

```ts
describe("scrapeCompetitors", () => {
  beforeEach(() => vi.clearAllMocks())

  it("crawl en parallèle et retourne les pages par concurrent", async () => {
    const candidates = [makePlace("p1", "https://a.com"), makePlace("p2", "https://b.com")]
    vi.mocked(crawlSite).mockResolvedValue([
      { pageUrl: "https://a.com", content: "# Accueil" },
      { pageUrl: "https://a.com/services", content: "# Services" },
    ])
    const result = await scrapeCompetitors(candidates as any)
    expect(result).toHaveLength(2)
    expect(result[0].nom).toBe("Concurrent p1")
    expect(result[0].pages).toHaveLength(2)
    expect(result[0].pages[0].content).toBe("# Accueil")
  })

  it("ignore les candidats sans siteUrl", async () => {
    const candidates = [makePlace("p1", "https://a.com"), makePlace("p2", null)]
    vi.mocked(crawlSite).mockResolvedValue([
      { pageUrl: "https://a.com", content: "# Home" },
    ])
    const result = await scrapeCompetitors(candidates as any)
    expect(result).toHaveLength(1)
    expect(result[0].nom).toBe("Concurrent p1")
  })

  it("ignore les échecs de crawl", async () => {
    const candidates = [makePlace("p1", "https://a.com"), makePlace("p2", "https://b.com")]
    vi.mocked(crawlSite)
      .mockResolvedValueOnce([{ pageUrl: "https://a.com", content: "# A" }])
      .mockRejectedValueOnce(new Error("Timeout"))
    const result = await scrapeCompetitors(candidates as any)
    expect(result).toHaveLength(1)
    expect(result[0].nom).toBe("Concurrent p1")
  })

  it("retourne [] si tout échoue", async () => {
    const candidates = [makePlace("p1", "https://a.com")]
    vi.mocked(crawlSite).mockRejectedValue(new Error("Timeout"))
    const result = await scrapeCompetitors(candidates as any)
    expect(result).toHaveLength(0)
  })
})
```

Replace `buildAnalyseResult` describe block — update `scraped` format and tests:

```ts
describe("buildAnalyseResult", () => {
  beforeEach(() => vi.clearAllMocks())

  const prospect = { nom: "Garage Martin", activite: "Garagiste", ville: "Steenvoorde" }
  const scraped = [{
    nom: "Concurrent A",
    siteUrl: "https://a.com",
    pages: [
      { pageUrl: "https://a.com", content: "# Accueil\nGarage généraliste" },
      { pageUrl: "https://a.com/services", content: "# Services\nVidange, freins" },
    ],
  }]
  const claudeResponse = JSON.stringify({
    concurrents: [{ nom: "Concurrent A", siteUrl: "https://a.com", forces: ["Site moderne"], faiblesses: ["Pas de contact"], positionnement: "Généraliste" }],
    synthese: "Marché peu concurrentiel",
    recommandations: ["Se démarquer sur les délais"],
  })

  it("appelle analyzeWithClaude avec maxTokens=4096 et haiku", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue(claudeResponse)
    await buildAnalyseResult(prospect, scraped)
    expect(analyzeWithClaude).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      4096,
      "claude-haiku-4-5-20251001"
    )
  })

  it("inclut le contenu multi-pages dans le prompt", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue(claudeResponse)
    await buildAnalyseResult(prospect, scraped)
    const call = vi.mocked(analyzeWithClaude).mock.calls[0]
    const userPrompt = call[1]
    expect(userPrompt).toContain("https://a.com")
    expect(userPrompt).toContain("https://a.com/services")
    expect(userPrompt).toContain("Vidange, freins")
  })

  it("parse le JSON Claude et retourne AnalyseResult", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue(claudeResponse)
    const result = await buildAnalyseResult(prospect, scraped)
    expect(result.concurrents).toHaveLength(1)
    expect(result.concurrents[0].nom).toBe("Concurrent A")
    expect(result.synthese).toBe("Marché peu concurrentiel")
  })

  it("tronque le contenu à 6000 chars par concurrent", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue(claudeResponse)
    const longScraped = [{
      nom: "Big Corp",
      siteUrl: "https://big.com",
      pages: [
        { pageUrl: "https://big.com", content: "x".repeat(4000) },
        { pageUrl: "https://big.com/services", content: "y".repeat(4000) },
      ],
    }]
    await buildAnalyseResult(prospect, longScraped)
    const call = vi.mocked(analyzeWithClaude).mock.calls[0]
    const userPrompt = call[1]
    // Each competitor block should be capped at ~6000 chars of content
    const competitorBlock = userPrompt.split("--- Concurrent")[1] ?? ""
    // The total content chars should not exceed 6000 + headers
    expect(competitorBlock.length).toBeLessThan(7000)
  })

  it("inclut les concurrents sans site dans le prompt", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue(claudeResponse)
    const noSite = [makePlace("ns1", null)]
    await buildAnalyseResult(prospect, scraped, noSite as any)
    const call = vi.mocked(analyzeWithClaude).mock.calls[0]
    expect(call[1]).toContain("Concurrent ns1")
    expect(call[1]).toContain("sans site web")
  })

  it("lève une erreur si Claude retourne du JSON invalide", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue("ceci n'est pas du JSON valide")
    await expect(buildAnalyseResult(prospect, scraped)).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/lib/analyse.test.ts`
Expected: FAIL — `scrapeCompetitors` still expects `scrapeUrl`, types don't match

- [ ] **Step 3: Update `analyse.ts`**

Replace the full content of `src/lib/analyse.ts`:

```ts
import { searchPlaces } from "@/lib/places"
import { crawlSite, type CrawledPage } from "@/lib/scrape"
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

export interface ScrapedCompetitor {
  nom: string
  siteUrl: string
  pages: CrawledPage[]
}

export async function findCompetitorCandidates(
  activite: string,
  ville: string,
  ownPlaceId?: string | null
): Promise<PlaceResult[]> {
  const results = await searchPlaces(activite, ville, 20000)
  return results
    .filter((r) => r.placeId !== ownPlaceId)
    .slice(0, 8)
}

export interface ScrapeStepHook {
  onStart?: (nom: string) => Promise<void> | void
  onSuccess?: (nom: string, pageCount: number) => Promise<void> | void
  onFailure?: (nom: string, reason: string) => Promise<void> | void
  onNoWebsite?: (nom: string) => Promise<void> | void
}

export async function scrapeCompetitors(
  candidates: PlaceResult[],
  hook?: ScrapeStepHook
): Promise<ScrapedCompetitor[]> {
  for (const c of candidates.filter((c) => c.siteUrl === null)) {
    await hook?.onNoWebsite?.(c.nom)
  }
  const withSite = candidates.filter((c) => c.siteUrl !== null)
  const settled = await Promise.allSettled(
    withSite.map(async (c) => {
      await hook?.onStart?.(c.nom)
      try {
        const pages = await crawlSite(c.siteUrl!)
        await hook?.onSuccess?.(c.nom, pages.length)
        return { nom: c.nom, siteUrl: c.siteUrl!, pages }
      } catch (err) {
        const reason = err instanceof Error ? err.message : "erreur"
        await hook?.onFailure?.(c.nom, reason)
        throw err
      }
    })
  )
  return settled
    .filter(
      (r): r is PromiseFulfilledResult<ScrapedCompetitor> =>
        r.status === "fulfilled"
    )
    .map((r) => r.value)
}

const MAX_CHARS_PER_COMPETITOR = 6000

function formatCompetitorPages(competitor: ScrapedCompetitor): string {
  let totalChars = 0
  const parts: string[] = []
  for (const page of competitor.pages) {
    const remaining = MAX_CHARS_PER_COMPETITOR - totalChars
    if (remaining <= 0) break
    const truncated = page.content.slice(0, remaining)
    parts.push(`--- Page: ${page.pageUrl} ---\n${truncated}`)
    totalChars += truncated.length
  }
  return parts.join("\n\n")
}

export const ANALYSE_SYSTEM_PROMPT = `Tu es un expert en analyse concurrentielle pour petites entreprises locales en Flandre Intérieure.
Tu analyses des sites web de concurrents (plusieurs pages par site) et identifies leurs forces, faiblesses et positionnement.
Tu fournis des recommandations concrètes pour se démarquer.
Réponds UNIQUEMENT avec du JSON valide, sans commentaires ni markdown.`

export async function buildAnalyseResult(
  prospect: { nom: string; activite: string; ville: string },
  scrapedCompetitors: ScrapedCompetitor[],
  noWebsiteCompetitors: PlaceResult[] = []
): Promise<AnalyseResult> {
  const competitorsText =
    scrapedCompetitors.length === 0
      ? "Aucun concurrent avec site web trouvé dans la zone."
      : scrapedCompetitors
          .map((c) => `--- Concurrent: ${c.nom} (${c.siteUrl}) ---\n${formatCompetitorPages(c)}`)
          .join("\n\n")

  const noWebsiteText =
    noWebsiteCompetitors.length > 0
      ? `\nConcurrents présents dans la zone mais sans site web : ${noWebsiteCompetitors.map((c) => `${c.nom} (${c.adresse})`).join(", ")}`
      : ""

  const userPrompt = `Analyse la concurrence pour :
Entreprise : ${prospect.nom}
Secteur : ${prospect.activite}
Ville : ${prospect.ville}

Concurrents trouvés (plusieurs pages analysées par site) :
${competitorsText}${noWebsiteText}

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

  const response = await analyzeWithClaude(ANALYSE_SYSTEM_PROMPT, userPrompt, 4096, "claude-haiku-4-5-20251001")
  return parseClaudeJSON<AnalyseResult>(response)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/lib/analyse.test.ts`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/analyse.ts src/__tests__/lib/analyse.test.ts
git commit -m "feat(analyse): multi-page crawl with 6000 chars per competitor"
```

---

### Task 5: Adapter `run-analyse-job.ts` — Hooks de progression

**Files:**
- Modify: `src/lib/run-analyse-job.ts`

- [ ] **Step 1: Update hook messages for multi-page crawl**

The `onSuccess` hook now receives `pageCount`. Update `run-analyse-job.ts` hooks:

In the `scrapeCompetitors` call, update `onSuccess`:

```ts
onSuccess: async (nom, pageCount) => {
  await updateStep(jobId, `scrape_competitors:${nom}`, {
    statut: "done",
    message: `${pageCount} page${pageCount > 1 ? "s" : ""} analysée${pageCount > 1 ? "s" : ""}`,
  })
},
```

Update `onStart` message:

```ts
onStart: async (nom) => {
  await appendStep(jobId, {
    nom: `scrape_competitors:${nom}`,
    statut: "running",
    message: `Exploration du site de ${nom}...`,
  })
},
```

Update the parent step done message:

```ts
await updateStep(jobId, "scrape_competitors", {
  statut: "done",
  message: `${scraped.length} site${scraped.length > 1 ? "s" : ""} exploré${scraped.length > 1 ? "s" : ""}`,
  data: {
    analysed: scraped.map((s) => ({ nom: s.nom, pages: s.pages.length })),
    failed: candidates
      .filter((c) => c.siteUrl !== null && !scraped.some((s) => s.nom === c.nom))
      .map((c) => c.nom),
    noWebsite: noSite.map((c) => c.nom),
  },
})
```

Also update the `scraped` variable usage — it now has `.pages` instead of `.html`, but the rest of `runAnalyseJob` only passes `scraped` to `buildAnalyseResult` which already expects the new type.

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: all PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/run-analyse-job.ts
git commit -m "feat(analyse-job): update progress hooks for multi-page crawl"
```

---

### Task 6: Test d'intégration complet + vérification finale

**Files:**
- All modified files

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: all tests pass

- [ ] **Step 2: Run linter**

Run: `npm run lint`
Expected: clean

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: clean build, no type errors

- [ ] **Step 4: Commit if any fixes were needed**

```bash
git add -A
git commit -m "chore: lint fixes for multi-page crawl"
```
