import { analyzeWithClaude } from "@/lib/anthropic"
import type { SiteFile } from "@/lib/maquette/generate-site"
import type { SitePlan } from "@/lib/maquette/plan"

// ─── Extraction des classes utilisées dans les HTML ───────────────────────────

export function extractUsedClasses(pages: SiteFile[]): Set<string> {
  const used = new Set<string>()
  const re = /class\s*=\s*["']([^"']+)["']/g
  for (const p of pages) {
    let m: RegExpExecArray | null
    while ((m = re.exec(p.content)) !== null) {
      for (const c of m[1].split(/\s+/).filter(Boolean)) used.add(c)
    }
  }
  return used
}

function knownClassNames(plan: SitePlan): Set<string> {
  const set = new Set<string>()
  for (const sel of Object.values(plan.classNames)) {
    set.add(sel.replace(/^\./, ""))
  }
  return set
}

// ─── Strip de fences markdown ─────────────────────────────────────────────────

function stripFences(s: string): string {
  const t = s.trim()
  const m = t.match(/```(?:\w+)?\s*\n?([\s\S]*?)\n?```/)
  return m ? m[1].trim() : t
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS_SYSTEM_PROMPT = `Tu es un expert CSS senior. Tu génères UNIQUEMENT du CSS pur (pas de markdown, pas de commentaire d'intro).

RÈGLES :
- Reset minimal en début (margin/padding, box-sizing, body).
- Variables CSS custom (:root) basées sur le designSystem fourni.
- Tu STYLES CHAQUE classe listée dans \`classNames\`. Aucune ne doit être oubliée.
- Mobile-first : les media queries 768px (tablet) et 1024px (desktop) viennent en complément.
- Utilise les valeurs exactes du designSystem (couleurs, typo, spacing, borderRadius).
- Aucune classe inventée hors de \`classNames\`.
- Réponds UNIQUEMENT avec le CSS brut.`

export async function generateCss(plan: SitePlan, pages: SiteFile[]): Promise<string> {
  const known = knownClassNames(plan)
  const used = extractUsedClasses(pages)
  const unknown = [...used].filter((c) => !known.has(c))
  if (unknown.length > 0) {
    console.warn(
      `[generateCss] ${unknown.length} classes hors classNames détectées :`,
      unknown.slice(0, 20)
    )
  }

  const userPrompt = [
    "## DESIGN SYSTEM",
    JSON.stringify(plan.designSystem, null, 2),
    "",
    "## CLASSNAMES À STYLER (toutes obligatoires)",
    JSON.stringify(plan.classNames, null, 2),
    "",
    "## TONE",
    plan.designSystem.tone,
    "",
    "Génère le CSS complet du site, mobile-first, avec variables :root, et media queries 768px/1024px.",
  ].join("\n")

  const response = await analyzeWithClaude(CSS_SYSTEM_PROMPT, userPrompt, 16000)
  return stripFences(response)
}

// ─── JS ───────────────────────────────────────────────────────────────────────

const JS_SYSTEM_PROMPT = `Tu es un expert JavaScript vanilla + GSAP. Tu génères UNIQUEMENT du JavaScript (pas de markdown, pas d'intro).

CONTEXTE :
- GSAP est disponible via window.gsap et ScrollTrigger via window.ScrollTrigger (chargés en CDN avant ce script).
- Pas de jQuery, pas de framework.
- Le script s'exécute après DOMContentLoaded.

EFFETS À IMPLÉMENTER (en utilisant les sélecteurs fournis dans classNames) :
1. Si la page contient une .heroVideo : scrub du currentTime de la vidéo lié au scroll via ScrollTrigger.
2. Fade-in staggered sur les .section et leurs enfants directs (start "top 85%", stagger 0.1).
3. Counter animation (data-counter sur les éléments numériques) de 0 à la valeur cible (1.5s, power2.out).
4. Menu hamburger (.navHamburger) qui toggle .navLinks (classe "open").
5. Parallax léger sur les images de fond des sections.

RÈGLES :
- Utilise EXCLUSIVEMENT les sélecteurs présents dans classNames pour cibler les éléments.
- Vérifie l'existence des éléments avant de les animer (querySelector / querySelectorAll).
- Réponds UNIQUEMENT avec le JS brut.`

export async function generateJs(plan: SitePlan): Promise<string> {
  const userPrompt = [
    "## CLASSNAMES (sélecteurs CSS à utiliser)",
    JSON.stringify(plan.classNames, null, 2),
    "",
    "Génère le main.js complet.",
  ].join("\n")

  const response = await analyzeWithClaude(JS_SYSTEM_PROMPT, userPrompt, 8000)
  return stripFences(response)
}
