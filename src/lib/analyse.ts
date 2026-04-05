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
