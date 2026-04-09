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

export const ANALYSE_SYSTEM_PROMPT = `Tu es un expert en analyse concurrentielle pour petites entreprises locales en Flandre Intérieure.
Tu analyses des sites web de concurrents (plusieurs pages par site) et identifies leurs forces, faiblesses et positionnement.
Tu fournis des recommandations concrètes pour se démarquer.
Réponds UNIQUEMENT avec du JSON valide, sans commentaires ni markdown.`

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
