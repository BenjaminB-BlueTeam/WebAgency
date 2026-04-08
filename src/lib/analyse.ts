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
  const results = await searchPlaces(activite, ville, 20000)
  return results
    .filter((r) => r.placeId !== ownPlaceId)
    .slice(0, 8)
}

export interface ScrapeStepHook {
  onStart?: (nom: string) => Promise<void> | void
  onSuccess?: (nom: string) => Promise<void> | void
  onFailure?: (nom: string, reason: string) => Promise<void> | void
  onNoWebsite?: (nom: string) => Promise<void> | void
}

export async function scrapeCompetitors(
  candidates: PlaceResult[],
  hook?: ScrapeStepHook
): Promise<{ nom: string; siteUrl: string; html: string }[]> {
  for (const c of candidates.filter((c) => c.siteUrl === null)) {
    await hook?.onNoWebsite?.(c.nom)
  }
  const withSite = candidates.filter((c) => c.siteUrl !== null)
  const settled = await Promise.allSettled(
    withSite.map(async (c) => {
      await hook?.onStart?.(c.nom)
      try {
        const html = await scrapeUrl(c.siteUrl!)
        await hook?.onSuccess?.(c.nom)
        return { nom: c.nom, siteUrl: c.siteUrl!, html }
      } catch (err) {
        const reason = err instanceof Error ? err.message : "erreur"
        await hook?.onFailure?.(c.nom, reason)
        throw err
      }
    })
  )
  return settled
    .filter(
      (r): r is PromiseFulfilledResult<{ nom: string; siteUrl: string; html: string }> =>
        r.status === "fulfilled"
    )
    .map((r) => r.value)
}

export const ANALYSE_SYSTEM_PROMPT = `Tu es un expert en analyse concurrentielle pour petites entreprises locales en Flandre Intérieure.
Tu analyses des sites web de concurrents et identifies leurs forces, faiblesses et positionnement.
Tu fournis des recommandations concrètes pour se démarquer.
Réponds UNIQUEMENT avec du JSON valide, sans commentaires ni markdown.`

export async function buildAnalyseResult(
  prospect: { nom: string; activite: string; ville: string },
  scrapedCompetitors: { nom: string; siteUrl: string; html: string }[],
  noWebsiteCompetitors: PlaceResult[] = []
): Promise<AnalyseResult> {
  const competitorsText =
    scrapedCompetitors.length === 0
      ? "Aucun concurrent avec site web trouvé dans la zone."
      : scrapedCompetitors
          .map((c) => `--- ${c.nom} (${c.siteUrl}) ---\n${c.html.slice(0, 3000)}`)
          .join("\n\n")

  const noWebsiteText =
    noWebsiteCompetitors.length > 0
      ? `\nConcurrents présents dans la zone mais sans site web : ${noWebsiteCompetitors.map((c) => `${c.nom} (${c.adresse})`).join(", ")}`
      : ""

  const userPrompt = `Analyse la concurrence pour :
Entreprise : ${prospect.nom}
Secteur : ${prospect.activite}
Ville : ${prospect.ville}

Concurrents trouvés :
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

  const response = await analyzeWithClaude(ANALYSE_SYSTEM_PROMPT, userPrompt, 4096)
  return parseClaudeJSON<AnalyseResult>(response)
}
