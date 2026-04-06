import { analyzeWithClaude } from "@/lib/anthropic"
import type { InvestigationResult, ProspectData } from "@/lib/maquette/investigate"

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Tu es un expert en création de sites web pour artisans et PME locales en Flandre Intérieure.

Tu reçois le résultat d'une investigation profonde sur une entreprise. Tu génères un prompt structuré en 3 sections (CONTENU, DESIGN, SEO) qui servira à créer le site web de cette entreprise.

RÈGLES ABSOLUES :
1. UTILISE TOUTES LES DONNÉES RÉELLES TROUVÉES — ne jamais inventer si la donnée existe (tarifs, horaires, services, équipe, certifications, historique, dirigeant, ancienneté, CA).
2. Distingue SERVICE (plombier, électricien, coiffeur, garagiste...) et COMMERCE (boulangerie, restaurant, fleuriste...).
3. Pour les SERVICES : inclus une PROMESSE concrète dans le hero (chiffre, délai, résultat mesurable). Le but est que le site convertisse.
4. Pour les COMMERCES : inclus une AMBIANCE dans le hero (mise en valeur du produit, du savoir-faire). Le visiteur doit avoir envie de venir.
5. Le CTA principal doit être adapté au métier et à ce que le prospect propose réellement.
6. Exploite les faiblesses des concurrents identifiées dans l'analyse.
7. Mets en avant les forces perçues par les clients dans les avis Google.
8. Le design doit respecter l'identité visuelle existante (si scrapée) ou être cohérent avec l'activité (si générée).
9. Le logo existant doit être réutilisé tel quel si trouvé.
10. Le nombre et le type de pages sont adaptés au métier — pas de nombre fixe. Propose les pages pertinentes.
11. Tous les effets visuels doivent être modernes et créer un effet "WOW" (vidéo scroll, parallax, fade-in, counters, sticky sections).
12. SEO local : optimiser pour {activité} + {ville} + variantes.
13. Si le matching Pappers est "low", le mentionner dans le prompt pour que l'utilisateur vérifie.
14. Le site doit être parfaitement responsive (mobile-first).

Réponds UNIQUEMENT avec le prompt structuré (## CONTENU, ## DESIGN, ## SEO), sans commentaires.`

// ─── Fallback ─────────────────────────────────────────────────────────────────

function buildFallback(prospect: ProspectData): string {
  return `## CONTENU

Entreprise : ${prospect.nom}
Activité : ${prospect.activite}
Ville : ${prospect.ville}

## DESIGN

Design professionnel adapté à l'activité.

## SEO

Optimisé pour ${prospect.activite} ${prospect.ville}.`
}

// ─── User prompt builder ──────────────────────────────────────────────────────

function buildUserPrompt(
  investigation: InvestigationResult,
  prospect: ProspectData
): string {
  const { pappersData, siteIdentity, clientPerception, analyse, pexelsImages, pexelsVideo } =
    investigation

  const lines: string[] = [
    `Génère le prompt pour le site web de cette entreprise :`,
    ``,
    `Nom : ${prospect.nom}`,
    `Activité : ${prospect.activite}`,
    `Ville : ${prospect.ville}`,
    `Adresse : ${prospect.adresse}`,
    `Téléphone : ${prospect.telephone ?? "Non renseigné"}`,
    `Site existant : ${prospect.siteUrl ?? "Aucun"}`,
    `Note Google : ${prospect.noteGoogle ?? "Non disponible"} (${prospect.nbAvisGoogle ?? 0} avis)`,
  ]

  // Pappers section
  if (pappersData) {
    lines.push(``)
    lines.push(`--- DONNÉES LÉGALES (Pappers, confiance: ${pappersData.matchConfidence}) ---`)
    lines.push(`Raison sociale : ${pappersData.denominationSociale}`)
    lines.push(`Dirigeant : ${pappersData.dirigeant ?? "Non disponible"}`)
    lines.push(`Forme juridique : ${pappersData.formeJuridique}`)
    lines.push(`Ancienneté : ${pappersData.anciennete}`)
    lines.push(`SIRET : ${pappersData.siret}`)
    lines.push(`Effectifs : ${pappersData.effectifs ?? "Non disponible"}`)
    lines.push(
      `CA : ${pappersData.chiffreAffaires != null ? pappersData.chiffreAffaires + "€" : "Non disponible"}`
    )
    if (pappersData.matchConfidence === "low") {
      lines.push(`⚠️ Confiance faible — vérifier ces données manuellement`)
    }
  }

  // Visual identity section
  if (siteIdentity && siteIdentity.colors.length > 0) {
    lines.push(``)
    lines.push(`--- IDENTITÉ VISUELLE (scrapée) ---`)
    lines.push(`Couleurs : ${siteIdentity.colors.join(", ")}`)
    lines.push(`Polices : ${siteIdentity.fonts.join(", ")}`)
    lines.push(`Logo : ${siteIdentity.logoUrl ?? "Non trouvé"}`)
    lines.push(`Style : ${siteIdentity.styleDescription}`)
  }

  // Business content section
  if (siteIdentity && siteIdentity.services.length > 0) {
    lines.push(``)
    lines.push(`--- CONTENU BUSINESS (scrapé) ---`)
    lines.push(`Services : ${siteIdentity.services.join(", ")}`)
    if (siteIdentity.tarifs) lines.push(`Tarifs : ${siteIdentity.tarifs}`)
    if (siteIdentity.horaires) lines.push(`Horaires : ${siteIdentity.horaires}`)
    if (siteIdentity.equipe) lines.push(`Équipe : ${siteIdentity.equipe}`)
    if (siteIdentity.temoignages.length > 0) {
      lines.push(`Témoignages : ${siteIdentity.temoignages.join(" | ")}`)
    }
    if (siteIdentity.certifications.length > 0) {
      lines.push(`Certifications : ${siteIdentity.certifications.join(", ")}`)
    }
    if (siteIdentity.zoneIntervention) {
      lines.push(`Zone d'intervention : ${siteIdentity.zoneIntervention}`)
    }
  }

  // Client perception section
  if (clientPerception) {
    lines.push(``)
    lines.push(`--- PERCEPTION CLIENT ---`)
    lines.push(`Points positifs récurrents : ${clientPerception.motsClesPositifs.join(", ")}`)
    if (clientPerception.motsClesNegatifs.length > 0) {
      lines.push(`Points négatifs : ${clientPerception.motsClesNegatifs.join(", ")}`)
    }
    lines.push(`Perception dominante : ${clientPerception.perceptionDominante}`)
    lines.push(`Forces perçues : ${clientPerception.forcesPercues.join(", ")}`)
  }

  // Competitive analysis section
  if (analyse) {
    lines.push(``)
    lines.push(`--- ANALYSE CONCURRENTIELLE ---`)
    lines.push(analyse.recommandations)
  }

  // Media section
  if (pexelsImages.length > 0) {
    lines.push(``)
    lines.push(`--- MÉDIAS DISPONIBLES ---`)
    lines.push(`Images Pexels : ${pexelsImages.slice(0, 3).join(", ")}`)
    if (pexelsVideo) {
      lines.push(`Vidéo hero : ${pexelsVideo.videoUrl} (durée: ${pexelsVideo.duration}s)`)
    }
  }

  return lines.join("\n")
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function buildMaquettePrompt(
  investigation: InvestigationResult,
  prospect: ProspectData
): Promise<string> {
  const userPrompt = buildUserPrompt(investigation, prospect)

  let response: string
  try {
    response = await analyzeWithClaude(SYSTEM_PROMPT, userPrompt, 4096)
  } catch {
    return buildFallback(prospect)
  }

  if (response.includes("## CONTENU")) {
    return response
  }

  return buildFallback(prospect)
}
