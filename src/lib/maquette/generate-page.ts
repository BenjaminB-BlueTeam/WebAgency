import { analyzeWithClaude } from "@/lib/anthropic"
import type { GenerationContext, SiteFile } from "@/lib/maquette/generate-site"
import type { PagePlan, SitePlan } from "@/lib/maquette/plan"

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Tu es un développeur HTML senior. Tu génères UNIQUEMENT le HTML d'UNE seule page d'un site vitrine.

RÈGLES STRICTES :
- AUCUN <style>, AUCUN CSS inline, AUCUN <script>. Le CSS et le JS sont gérés ailleurs.
- Tu utilises EXCLUSIVEMENT les classes listées dans \`classNames\`. N'invente JAMAIS de nouvelle classe.
- Tu injectes \`sharedHeaderHtml\` et \`sharedFooterHtml\` TELS QUELS dans <body>.
- Structure obligatoire :
  <!DOCTYPE html>
  <html lang="fr">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>...</title>
      <link rel="stylesheet" href="css/style.css" />
    </head>
    <body>
      [sharedHeaderHtml]
      <main>
        ... contenu spécifique de la page utilisant les classes ...
      </main>
      [sharedFooterHtml]
      <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
      <script src="js/main.js"></script>
    </body>
  </html>
- Les liens internes utilisent EXACTEMENT les filenames listés (ex: href="services.html").
- Tout en français. HTML sémantique (header déjà fourni, main, section, footer déjà fourni).
- Images <img loading="lazy" alt="...">. Vidéo hero si fournie.
- Réponds UNIQUEMENT avec le HTML brut, sans markdown, sans commentaire, sans \`\`\`.`

// ─── User prompt ──────────────────────────────────────────────────────────────

function buildUserPrompt(
  page: PagePlan,
  plan: SitePlan,
  context: GenerationContext,
  otherPages: PagePlan[]
): string {
  const lines = [
    `## PAGE À GÉNÉRER`,
    `Filename : ${page.filename}`,
    `Title : ${page.title}`,
    `H1 : ${page.h1}`,
    `Résumé : ${page.summary}`,
    `Sections attendues : ${page.sections.join(", ")}`,
    "",
    `## CLASSNAMES AUTORISÉS (utilise UNIQUEMENT ces classes, sans le point initial)`,
    JSON.stringify(plan.classNames, null, 2),
    "",
    `## SHARED HEADER (à injecter tel quel, ne pas modifier)`,
    plan.sharedHeaderHtml,
    "",
    `## SHARED FOOTER (à injecter tel quel, ne pas modifier)`,
    plan.sharedFooterHtml,
    "",
    `## AUTRES PAGES DU SITE (pour les liens internes)`,
    otherPages.length > 0
      ? otherPages.map((p) => `- ${p.filename} : ${p.title}`).join("\n")
      : "Aucune autre page",
    "",
    `## DESIGN TONE`,
    plan.designSystem.tone,
    "",
    `## MÉDIAS DISPONIBLES`,
    `Images Pexels : ${context.pexelsImages.slice(0, 5).join(" | ") || "Aucune"}`,
    `Vidéo hero : ${context.pexelsVideoUrl ?? "Aucune"}`,
    `Logo : ${context.logoUrl ?? "Aucun"}`,
  ]
  return lines.join("\n")
}

// ─── Nettoyage de la réponse ──────────────────────────────────────────────────

function stripHtml(response: string): string {
  let s = response.trim()
  // Strip markdown fences si présentes
  const fence = s.match(/```(?:html)?\s*\n?([\s\S]*?)\n?```/)
  if (fence) s = fence[1].trim()
  return s
}

// ─── Export ───────────────────────────────────────────────────────────────────

export async function generatePage(
  page: PagePlan,
  plan: SitePlan,
  context: GenerationContext
): Promise<SiteFile> {
  const otherPages = plan.pages.filter((p) => p.filename !== page.filename)
  const userPrompt = buildUserPrompt(page, plan, context, otherPages)

  const response = await analyzeWithClaude(SYSTEM_PROMPT, userPrompt, 8000)
  const html = stripHtml(response)

  if (!html.includes("<html") || !html.includes("</html>")) {
    throw new Error(`[generatePage] HTML invalide pour ${page.filename}`)
  }

  return { path: page.filename, content: html }
}
