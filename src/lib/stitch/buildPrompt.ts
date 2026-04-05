import { analyzeWithClaude } from "@/lib/anthropic"

const SYSTEM_PROMPT =
  "Tu es un expert en design de sites vitrines pour artisans et petites entreprises locales en Flandre Intérieure. " +
  "Tu génères des prompts de design UI pour Google Stitch. " +
  "Règles : style professionnel mais chaleureux (jamais startup tech), mobile-first, textes en français, " +
  "palette cohérente avec le métier, intégrer nom/téléphone/ville. " +
  "Réponds uniquement avec le prompt de design, sans commentaires ni explications."

interface ProspectInput {
  nom: string
  activite: string
  ville: string
  telephone?: string | null
  siteUrl?: string | null
}

interface AnalyseInput {
  recommandations: string
}

export async function buildStitchPrompt(
  prospect: ProspectInput,
  analyse?: AnalyseInput | null
): Promise<string> {
  const parts: string[] = [
    `Entreprise : ${prospect.nom}`,
    `Activité : ${prospect.activite}`,
    `Ville : ${prospect.ville}`,
  ]
  if (prospect.telephone) parts.push(`Téléphone : ${prospect.telephone}`)
  parts.push(prospect.siteUrl ? `Site actuel : ${prospect.siteUrl}` : "Pas de site web actuellement")

  if (analyse) {
    try {
      const reco = JSON.parse(analyse.recommandations)
      parts.push(`\nRecommandations : ${JSON.stringify(reco)}`)
    } catch {
      // ignore malformed JSON
    }
  }

  return analyzeWithClaude(SYSTEM_PROMPT, parts.join("\n"))
}
