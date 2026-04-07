import { scrapeUrl } from "@/lib/scrape"
import { analyzeWithClaude } from "@/lib/anthropic"

export interface SiteIdentity {
  // Identité visuelle
  colors: string[]
  fonts: string[]
  logoUrl: string | null
  styleDescription: string

  // Contenu business
  slogan: string | null
  services: string[]
  tarifs: string | null
  horaires: string | null
  equipe: string | null
  temoignages: string[]
  certifications: string[]
  zoneIntervention: string | null
  historique: string | null
  faq: string | null
  galerieUrls: string[]
  moyensPaiement: string[]
}

function emptySiteIdentity(): SiteIdentity {
  return {
    colors: [],
    fonts: [],
    logoUrl: null,
    styleDescription: "",
    slogan: null,
    services: [],
    tarifs: null,
    horaires: null,
    equipe: null,
    temoignages: [],
    certifications: [],
    zoneIntervention: null,
    historique: null,
    faq: null,
    galerieUrls: [],
    moyensPaiement: [],
  }
}

const SYSTEM_PROMPT = `Tu es un expert en extraction de données d'entreprise depuis des sites web.
Analyse le contenu HTML/texte suivant et extrait TOUTES les informations disponibles.
Réponds UNIQUEMENT avec un JSON valide correspondant exactement à l'interface demandée.
Ne jamais inventer de données — si une info n'est pas présente, utiliser null ou [].`

export async function scrapeIdentity(siteUrl: string): Promise<SiteIdentity> {
  let html: string

  try {
    html = await scrapeUrl(siteUrl)
  } catch {
    return emptySiteIdentity()
  }

  if (!html || html.trim() === "") {
    return emptySiteIdentity()
  }

  const truncatedHtml = html.slice(0, 8000)
  const truncationNotice = html.length > 8000 ? "\n(HTML tronqué à 8000 caractères)" : ""
  const userPrompt = `Extrait toutes les informations de ce site web:\n\n${truncatedHtml}${truncationNotice}\n\nRéponds avec un JSON SiteIdentity.`

  let claudeResponse: string
  try {
    claudeResponse = await analyzeWithClaude(SYSTEM_PROMPT, userPrompt, 4096)
  } catch {
    return emptySiteIdentity()
  }

  try {
    // Try direct parse first
    let parsed: SiteIdentity | null = null

    try {
      parsed = JSON.parse(claudeResponse) as SiteIdentity
    } catch {
      // Try fenced code block
      const fenceMatch = claudeResponse.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
      if (fenceMatch) {
        try {
          parsed = JSON.parse(fenceMatch[1]) as SiteIdentity
        } catch {
          // Try bare JSON object
        }
      }

      if (!parsed) {
        const jsonMatch = claudeResponse.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]) as SiteIdentity
        }
      }
    }

    if (!parsed) {
      return emptySiteIdentity()
    }

    // Merge with empty to ensure all fields are present, defaulting arrays/nulls
    const empty = emptySiteIdentity()
    return {
      colors: Array.isArray(parsed.colors) ? parsed.colors : empty.colors,
      fonts: Array.isArray(parsed.fonts) ? parsed.fonts : empty.fonts,
      logoUrl: parsed.logoUrl ?? empty.logoUrl,
      styleDescription: parsed.styleDescription ?? empty.styleDescription,
      slogan: parsed.slogan ?? empty.slogan,
      services: Array.isArray(parsed.services) ? parsed.services : empty.services,
      tarifs: parsed.tarifs ?? empty.tarifs,
      horaires: parsed.horaires ?? empty.horaires,
      equipe: parsed.equipe ?? empty.equipe,
      temoignages: Array.isArray(parsed.temoignages) ? parsed.temoignages : empty.temoignages,
      certifications: Array.isArray(parsed.certifications) ? parsed.certifications : empty.certifications,
      zoneIntervention: parsed.zoneIntervention ?? empty.zoneIntervention,
      historique: parsed.historique ?? empty.historique,
      faq: parsed.faq ?? empty.faq,
      galerieUrls: Array.isArray(parsed.galerieUrls) ? parsed.galerieUrls : empty.galerieUrls,
      moyensPaiement: Array.isArray(parsed.moyensPaiement) ? parsed.moyensPaiement : empty.moyensPaiement,
    }
  } catch {
    return emptySiteIdentity()
  }
}
