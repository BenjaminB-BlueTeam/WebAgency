import { analyzeWithClaude } from "@/lib/anthropic"
import type { SiteIdentity } from "@/lib/maquette/scrape-identity"

// ─── Types ────────────────────────────────────────────────────────────────────

export type SiteFile = { path: string; content: string }
export type SiteFiles = { files: SiteFile[] }
export type GenerationContext = {
  pexelsImages: string[]
  pexelsVideoUrl: string | null
  logoUrl: string | null
  identity: SiteIdentity | null
}

// ─── Fallback ─────────────────────────────────────────────────────────────────

const FALLBACK: SiteFiles = {
  files: [
    {
      path: "index.html",
      content: `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Site en construction</title></head><body><h1>Site en cours de génération</h1></body></html>`,
    },
  ],
}

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Tu es un développeur web senior spécialisé dans les sites vitrines modernes pour artisans et PME.

Tu génères un site web complet et fonctionnel qui doit créer un effet "WOW".

STRUCTURE :
- Nombre variable de fichiers HTML (un par page, selon le prompt)
- 1 fichier css/style.css (tout le design, responsive mobile-first, variables CSS pour la palette)
- 1 fichier js/main.js (toutes les animations GSAP + interactions + menu hamburger mobile)
- Chaque page HTML inclut la navigation complète et le footer
- Le site est immédiatement fonctionnel sans aucun build step

LIBRAIRIES CDN (pas de téléchargement, pas de npm) :
- GSAP 3 : https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js
- ScrollTrigger : https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js
- Google Fonts : via <link> dans le <head>

EFFETS SCROLL OBLIGATOIRES :

1. Hero vidéo au scroll (si URL vidéo fournie) :
   - Conteneur 300vh, vidéo position sticky (100vh)
   - currentTime lié au scroll via ScrollTrigger scrub:true
   - Texte (promesse/ambiance + CTA) en fade-in progressif
   - Attributs vidéo : muted, playsinline, preload="auto"
   - Fallback sans vidéo : image Pexels en parallax avec overlay sombre dégradé

2. Fade-in staggeré :
   - Chaque section monte de 30px avec opacity 0→1
   - Éléments enfants en cascade (100ms décalage)
   - ScrollTrigger start:"top 85%"

3. Counter animation sur les chiffres clés :
   - De 0 à la valeur cible, durée 1.5s, ease "power2.out"
   - Déclenché à l'entrée dans le viewport

4. Image reveal progressif :
   - clip-path: inset(0 100% 0 0) → inset(0 0% 0 0) lié au scroll

5. Parallax images :
   - Images de fond à 50% de la vitesse du scroll

6. Navigation sticky :
   - Transparente au chargement → fond solide + légère ombre après le hero
   - Transition 300ms
   - Menu hamburger fonctionnel sur mobile

7. Sticky sections (pour les pages denses) :
   - Image ou titre fixe à gauche, contenu qui scrolle à droite
   - ScrollTrigger pin:true

RESPONSIVE MOBILE-FIRST (OBLIGATOIRE) :
- Mobile (<768px) : une colonne, CTA plein largeur, menu hamburger JS fonctionnel, vidéo hero remplacée par image si nécessaire
- Tablette (768-1024px) : 2 colonnes max
- Desktop (>1024px) : layout complet

QUALITÉ :
- HTML sémantique (header, nav, main, section, footer)
- CSS avec variables custom (--primary, --secondary, --accent, --bg, --text)
- JS propre, pas de jQuery
- Tous les textes en français
- Images avec loading="lazy" (sauf hero), alt text descriptif
- Logo : utiliser l'URL scrapée si fournie, sinon nom stylisé en texte

Réponds UNIQUEMENT avec un JSON valide :
{
  "files": [
    { "path": "index.html", "content": "..." },
    { "path": "services.html", "content": "..." },
    ...
    { "path": "css/style.css", "content": "..." },
    { "path": "js/main.js", "content": "..." }
  ]
}`

// ─── User prompt builder ──────────────────────────────────────────────────────

function buildUserPrompt(prompt: string, context: GenerationContext): string {
  const { pexelsImages, pexelsVideoUrl, logoUrl } = context

  const mediaLines: string[] = [
    "",
    "--- MÉDIAS DISPONIBLES ---",
    "Images Pexels (utiliser dans les sections) :",
    pexelsImages.slice(0, 5).length > 0
      ? pexelsImages.slice(0, 5).map((url, i) => `${i + 1}. ${url}`).join("\n")
      : "Aucune",
    "",
    `Vidéo hero : ${pexelsVideoUrl ?? "Aucune"}`,
    "",
    `Logo : ${logoUrl ?? "Non fourni — utiliser nom stylisé en texte"}`,
  ]

  return `${prompt}\n${mediaLines.join("\n")}`
}

// ─── JSON parsing ─────────────────────────────────────────────────────────────

function parseResponse(response: string): SiteFiles | null {
  // 1. Try direct parse
  try {
    const parsed = JSON.parse(response) as SiteFiles
    return parsed
  } catch {
    // ignore
  }

  // 2. Try extracting from ```json ... ``` or ``` ... ``` code block
  const fenceMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (fenceMatch) {
    try {
      const parsed = JSON.parse(fenceMatch[1]) as SiteFiles
      return parsed
    } catch {
      // ignore
    }
  }

  // 3. Try bare JSON object
  const jsonMatch = response.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as SiteFiles
      return parsed
    } catch {
      // ignore
    }
  }

  return null
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validate(result: unknown): result is SiteFiles {
  if (!result || typeof result !== "object") return false

  const r = result as Record<string, unknown>
  if (!Array.isArray(r.files)) return false
  if (r.files.length === 0) return false
  if (r.files.length > 20) return false

  const files = r.files as unknown[]

  const allValid = files.every(
    (f) =>
      f !== null &&
      typeof f === "object" &&
      typeof (f as Record<string, unknown>).path === "string" &&
      typeof (f as Record<string, unknown>).content === "string"
  )
  if (!allValid) return false

  const hasHtml = (files as Array<Record<string, unknown>>).some(
    (f) => typeof f.path === "string" && f.path.endsWith(".html")
  )
  if (!hasHtml) return false

  return true
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateSiteCode(
  prompt: string,
  context: GenerationContext
): Promise<SiteFiles> {
  const userPrompt = buildUserPrompt(prompt, context)

  let response: string
  try {
    response = await analyzeWithClaude(SYSTEM_PROMPT, userPrompt, 32000)
  } catch (e) {
    console.error("[generateSiteCode] analyzeWithClaude failed:", e)
    return FALLBACK
  }

  const parsed = parseResponse(response)

  if (!parsed) {
    console.error(
      "[generateSiteCode] parseResponse returned null. Response preview:",
      response.slice(0, 500)
    )
    return FALLBACK
  }

  if (!validate(parsed)) {
    console.error(
      "[generateSiteCode] validate failed. Parsed shape:",
      JSON.stringify(parsed).slice(0, 500)
    )
    return FALLBACK
  }

  return parsed
}
