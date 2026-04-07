import { analyzeWithClaude, parseClaudeJSON } from "@/lib/anthropic"
import type { GenerationContext } from "@/lib/maquette/generate-site"

// ─── Types ────────────────────────────────────────────────────────────────────

export type PagePlan = {
  filename: string
  title: string
  h1: string
  summary: string
  sections: string[]
}

export type DesignSystem = {
  colors: {
    bg: string
    bgAlt: string
    text: string
    textMuted: string
    accent: string
    accentHighlight: string
    border: string
  }
  typography: {
    fontFamily: string
    h1Size: string
    h2Size: string
    bodySize: string
    headingWeight: string
    bodyWeight: string
  }
  spacing: {
    sectionPaddingDesktop: string
    sectionPaddingMobile: string
    containerMaxWidth: string
    gap: string
  }
  borderRadius: string
  tone: string
}

export type SitePlan = {
  pages: PagePlan[]
  designSystem: DesignSystem
  classNames: Record<string, string>
  sharedHeaderHtml: string
  sharedFooterHtml: string
}

// ─── Liste exhaustive des classNames attendus ─────────────────────────────────

export const REQUIRED_CLASS_KEYS = [
  "container",
  "navMain",
  "navInner",
  "navLogo",
  "navLinks",
  "navLink",
  "navCta",
  "navHamburger",
  "hero",
  "heroVideo",
  "heroOverlay",
  "heroContent",
  "heroTitle",
  "heroSubtitle",
  "heroCta",
  "section",
  "sectionAlt",
  "sectionInner",
  "sectionTitle",
  "sectionSubtitle",
  "card",
  "cardTitle",
  "cardText",
  "cardCta",
  "btnPrimary",
  "btnSecondary",
  "footer",
  "footerInner",
  "footerLinks",
] as const

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Tu es un directeur artistique web senior. Tu reçois un brief pour un site vitrine et tu produis un PLAN STRUCTURÉ accompagné d'un DESIGN SYSTEM verrouillé.

Ton output sera réutilisé par d'autres agents pour générer chaque page. La cohérence visuelle DOIT être absolue.

Tu réponds UNIQUEMENT avec un JSON valide respectant cette forme :
{
  "pages": [
    {
      "filename": "index.html",
      "title": "Titre <title> de la page",
      "h1": "Le H1 principal",
      "summary": "Résumé de l'objectif et du contenu de la page (2-3 phrases)",
      "sections": ["Hero", "Services", "Pourquoi nous", "Témoignages", "CTA"]
    }
  ],
  "designSystem": {
    "colors": {
      "bg": "#hex",
      "bgAlt": "#hex",
      "text": "#hex",
      "textMuted": "#hex",
      "accent": "#hex",
      "accentHighlight": "#hex",
      "border": "#hex"
    },
    "typography": {
      "fontFamily": "'Inter', sans-serif",
      "h1Size": "clamp(2.5rem, 5vw, 4.5rem)",
      "h2Size": "clamp(1.75rem, 3vw, 2.5rem)",
      "bodySize": "1rem",
      "headingWeight": "700",
      "bodyWeight": "400"
    },
    "spacing": {
      "sectionPaddingDesktop": "120px 0",
      "sectionPaddingMobile": "64px 0",
      "containerMaxWidth": "1200px",
      "gap": "24px"
    },
    "borderRadius": "8px",
    "tone": "Description du ton visuel (ex: 'Élégant, sobre, premium')"
  },
  "classNames": {
${REQUIRED_CLASS_KEYS.map((k) => `    "${k}": ".${k}"`).join(",\n")}
  },
  "sharedHeaderHtml": "<header class='nav-main'>...</header>",
  "sharedFooterHtml": "<footer class='footer'>...</footer>"
}

RÈGLES CRUCIALES :
- Le \`classNames\` DOIT contenir EXACTEMENT ces clés : ${REQUIRED_CLASS_KEYS.join(", ")}
- Chaque valeur de \`classNames\` est un sélecteur CSS (commençant par .) basé sur le nom kebab-case de la clé.
- \`sharedHeaderHtml\` doit être un HTML COMPLET et autonome contenant la nav, le logo et les liens vers TOUTES les pages du plan. Utilise EXCLUSIVEMENT les classes définies dans \`classNames\` (sans le point initial).
- \`sharedFooterHtml\` doit être un HTML COMPLET autonome (mentions, liens, contact). Mêmes contraintes de classes.
- Entre 1 et 6 pages selon le brief. \`index.html\` doit toujours être présent.
- Tout en français.
- Pas de markdown, pas de texte hors JSON.`

// ─── User prompt ──────────────────────────────────────────────────────────────

function buildUserPrompt(prompt: string, context: GenerationContext): string {
  const lines = [
    prompt,
    "",
    "--- MÉDIAS DISPONIBLES ---",
    `Images Pexels : ${context.pexelsImages.slice(0, 5).join(", ") || "Aucune"}`,
    `Vidéo hero : ${context.pexelsVideoUrl ?? "Aucune"}`,
    `Logo : ${context.logoUrl ?? "Aucun (utiliser nom stylisé)"}`,
  ]
  return lines.join("\n")
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validatePlan(value: unknown): value is SitePlan {
  if (!value || typeof value !== "object") return false
  const v = value as Record<string, unknown>

  if (!Array.isArray(v.pages) || v.pages.length === 0) return false
  const pagesOk = v.pages.every((p) => {
    if (!p || typeof p !== "object") return false
    const pp = p as Record<string, unknown>
    return (
      typeof pp.filename === "string" &&
      typeof pp.title === "string" &&
      typeof pp.h1 === "string" &&
      typeof pp.summary === "string" &&
      Array.isArray(pp.sections)
    )
  })
  if (!pagesOk) return false

  if (!v.designSystem || typeof v.designSystem !== "object") return false
  if (!v.classNames || typeof v.classNames !== "object") return false
  if (typeof v.sharedHeaderHtml !== "string") return false
  if (typeof v.sharedFooterHtml !== "string") return false

  // Vérifie présence de toutes les classes requises
  const cn = v.classNames as Record<string, unknown>
  for (const key of REQUIRED_CLASS_KEYS) {
    if (typeof cn[key] !== "string") return false
  }

  return true
}

// ─── Export ───────────────────────────────────────────────────────────────────

export async function planSite(
  prompt: string,
  context: GenerationContext
): Promise<SitePlan | null> {
  let response: string
  try {
    response = await analyzeWithClaude(SYSTEM_PROMPT, buildUserPrompt(prompt, context), 4000)
  } catch (e) {
    console.error("[planSite] analyzeWithClaude failed:", e)
    return null
  }

  let parsed: unknown
  try {
    parsed = parseClaudeJSON(response)
  } catch (e) {
    console.error("[planSite] parseClaudeJSON failed:", e)
    return null
  }

  if (!validatePlan(parsed)) {
    console.error(
      "[planSite] validation failed. Preview:",
      JSON.stringify(parsed).slice(0, 400)
    )
    return null
  }

  return parsed
}
