import { analyzeWithClaude, parseClaudeJSON } from "@/lib/anthropic"
import { scrapeUrl } from "@/lib/scrape"
import { getParam } from "@/lib/params"

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

interface ScoringWeights {
  presenceWeb: number
  seo: number
  design: number
  financier: number
  potentiel: number
}

function clampWeight(val: number, defaultVal: number): number {
  const n = isNaN(val) ? defaultVal : val
  return Math.max(0, Math.min(10, n))
}

export async function calculateGlobalScore(
  scores: {
    scorePresenceWeb: number
    scoreSEO: number | null
    scoreDesign: number | null
    scoreFinancier: number | null
    scorePotentiel: number | null
  },
  poids?: ScoringWeights
): Promise<number | null> {
  let weights: ScoringWeights
  if (poids) {
    weights = poids
  } else {
    const [pw, seo, design, fin, pot] = await Promise.all([
      getParam("scoring.poids.presenceWeb", "3"),
      getParam("scoring.poids.seo", "2"),
      getParam("scoring.poids.design", "2"),
      getParam("scoring.poids.financier", "1"),
      getParam("scoring.poids.potentiel", "3"),
    ])
    weights = {
      presenceWeb: clampWeight(parseInt(pw, 10), 3),
      seo: clampWeight(parseInt(seo, 10), 2),
      design: clampWeight(parseInt(design, 10), 2),
      financier: clampWeight(parseInt(fin, 10), 1),
      potentiel: clampWeight(parseInt(pot, 10), 3),
    }
  }

  const axes: WeightedScore[] = [
    { score: scores.scorePresenceWeb, poids: weights.presenceWeb },
    { score: scores.scoreSEO, poids: weights.seo },
    { score: scores.scoreDesign, poids: weights.design },
    { score: scores.scoreFinancier, poids: weights.financier },
    { score: scores.scorePotentiel, poids: weights.potentiel },
  ]

  const valid = axes.filter(
    (a): a is { score: number; poids: number } => a.score !== null
  )
  if (valid.length === 0) return null

  const sum = valid.reduce((acc, a) => acc + a.score * a.poids, 0)
  const poidsTotal = valid.reduce((acc, a) => acc + a.poids, 0)
  if (poidsTotal === 0) return null
  return Math.round(sum / poidsTotal)
}

export async function scoreFinancier(
  activite: string,
  ville: string,
  noteGoogle: number | null,
  nbAvisGoogle: number | null
): Promise<number | null> {
  try {
    const response = await analyzeWithClaude(
      "Tu es un expert en prospection commerciale pour les agences web. Réponds uniquement en JSON valide.",
      `Basé sur ces données : activité = ${activite}, ville = ${ville}, note Google = ${noteGoogle ?? "inconnue"}/5, nombre d'avis = ${nbAvisGoogle ?? "inconnu"}. Estime de 0 à 10 si cette entreprise a la capacité financière d'investir ~2000€ dans un site web. Considère le secteur d'activité, le volume d'activité estimé via les avis, et la zone géographique. Réponds uniquement en JSON : {"score": number, "justification": string}`
    )
    const parsed = parseClaudeJSON<{ score: number }>(response)
    return Math.max(0, Math.min(10, parsed.score))
  } catch {
    return null
  }
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

async function scorePotentielAchat(
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
  const [presenceWeb, seo, design, financier] = await Promise.all([
    scorePresenceWeb(prospect.siteUrl),
    scoreSEO(prospect.siteUrl),
    scoreDesign(prospect.siteUrl, prospect.activite, prospect.ville),
    scoreFinancier(prospect.activite, prospect.ville, prospect.noteGoogle, prospect.nbAvisGoogle),
  ])
  const potentiel = await scorePotentielAchat(prospect, {
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

  const scoreGlobal = await calculateGlobalScore(allScores)

  return { ...allScores, scoreGlobal }
}
