import { scrapeIdentity, SiteIdentity } from "@/lib/maquette/scrape-identity"
import { matchPappers, PappersData } from "@/lib/maquette/pappers"
import { searchPexelsImages, searchPexelsVideo } from "@/lib/maquette/pexels"
import { analyzeWithClaude } from "@/lib/anthropic"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProspectData {
  id: string
  nom: string
  activite: string
  ville: string
  adresse: string
  telephone: string | null
  siteUrl: string | null
  noteGoogle: number | null
  nbAvisGoogle: number | null
}

export interface AnalyseData {
  concurrents: string      // JSON string
  recommandations: string  // JSON string
}

export interface ClientPerception {
  motsClesPositifs: string[]
  motsClesNegatifs: string[]
  perceptionDominante: string
  forcesPercues: string[]
  pointsAmelioration: string[]
}

export interface InvestigationResult {
  prospect: ProspectData
  siteIdentity: SiteIdentity | null
  pappersData: PappersData | null
  pexelsImages: string[]
  pexelsVideo: { videoUrl: string; duration: number } | null
  clientPerception: ClientPerception | null
  analyse: AnalyseData | null
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function analyzeClientPerception(
  prospect: ProspectData,
  analyse: AnalyseData | null
): Promise<ClientPerception | null> {
  const hasGoogleData = prospect.noteGoogle !== null || prospect.nbAvisGoogle !== null
  const hasAnalyse = analyse !== null

  if (!hasGoogleData && !hasAnalyse) {
    return null
  }

  const googlePart = hasGoogleData
    ? `Note Google: ${prospect.noteGoogle ?? "N/A"}/5 (${prospect.nbAvisGoogle ?? 0} avis)`
    : "Pas de données Google disponibles."

  const analysePart = hasAnalyse
    ? `\nAnalyse concurrentielle:\n- Concurrents: ${analyse.concurrents}\n- Recommandations: ${analyse.recommandations}`
    : ""

  const systemPrompt =
    "Tu es un expert en analyse de perception client pour les PME locales. " +
    "Analyse les données fournies et retourne un JSON ClientPerception."

  const userPrompt =
    `Entreprise: ${prospect.nom} (${prospect.activite}, ${prospect.ville})\n` +
    googlePart +
    analysePart +
    "\n\nRéponds UNIQUEMENT avec un JSON valide correspondant à:\n" +
    "{ motsClesPositifs: string[], motsClesNegatifs: string[], perceptionDominante: string, " +
    "forcesPercues: string[], pointsAmelioration: string[] }"

  let response: string
  try {
    response = await analyzeWithClaude(systemPrompt, userPrompt, 1024)
  } catch {
    return null
  }

  try {
    // Try direct parse
    try {
      return JSON.parse(response) as ClientPerception
    } catch {
      // Try fenced code block
      const fenceMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
      if (fenceMatch) {
        try {
          return JSON.parse(fenceMatch[1]) as ClientPerception
        } catch { /* ignore */ }
      }

      // Try bare JSON object
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as ClientPerception
      }
    }
    return null
  } catch {
    return null
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function investigate(
  prospect: ProspectData,
  analyse: AnalyseData | null
): Promise<InvestigationResult> {
  const [scrapeResult, pappersResult, pexelsImgResult, pexelsVidResult, perceptionResult] =
    await Promise.allSettled([
      prospect.siteUrl ? scrapeIdentity(prospect.siteUrl) : Promise.resolve(null),
      matchPappers({
        nom: prospect.nom,
        activite: prospect.activite,
        adresse: prospect.adresse,
        ville: prospect.ville,
      }),
      searchPexelsImages(prospect.activite),
      searchPexelsVideo(prospect.activite),
      analyzeClientPerception(prospect, analyse),
    ])

  const siteIdentity: SiteIdentity | null =
    scrapeResult.status === "fulfilled" ? scrapeResult.value : null

  const pappersData: PappersData | null =
    pappersResult.status === "fulfilled" ? pappersResult.value : null

  const pexelsImages: string[] =
    pexelsImgResult.status === "fulfilled" ? pexelsImgResult.value : []

  const pexelsVideo: { videoUrl: string; duration: number } | null =
    pexelsVidResult.status === "fulfilled" ? pexelsVidResult.value : null

  const clientPerception: ClientPerception | null =
    perceptionResult.status === "fulfilled" ? perceptionResult.value : null

  return {
    prospect,
    siteIdentity,
    pappersData,
    pexelsImages,
    pexelsVideo,
    clientPerception,
    analyse,
  }
}
