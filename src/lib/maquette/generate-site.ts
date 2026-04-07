import type { SiteIdentity } from "@/lib/maquette/scrape-identity"
import { planSite } from "@/lib/maquette/plan"
import { generatePage } from "@/lib/maquette/generate-page"
import { generateCss, generateJs } from "@/lib/maquette/generate-assets"

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

// ─── Main export (orchestrateur 3 phases) ─────────────────────────────────────
//
// Phase 1 : planSite (1 appel)              — plan + design system verrouillé
// Phase 2 : generatePage (N appels //)      — HTML par page, classes lockées
// Phase 3 : generateCss + generateJs (//)   — assets cohérents avec le plan
//
// FALLBACK retourné si plan null, ou si >50% des pages échouent, ou si la
// phase 3 échoue. Cela évite tout site cassé en production.

export async function generateSiteCode(
  prompt: string,
  context: GenerationContext
): Promise<SiteFiles> {
  const plan = await planSite(prompt, context)
  if (!plan) {
    console.error("[generateSiteCode] planSite returned null, falling back")
    return FALLBACK
  }
  console.log(`[generateSiteCode] phase 1 ok — ${plan.pages.length} pages prévues`)

  const pageResults = await Promise.allSettled(
    plan.pages.map((p) => generatePage(p, plan, context))
  )
  const pages: SiteFile[] = []
  let failed = 0
  for (const r of pageResults) {
    if (r.status === "fulfilled") pages.push(r.value)
    else {
      failed++
      console.error("[generateSiteCode] page failed:", r.reason)
    }
  }
  console.log(
    `[generateSiteCode] phase 2 ok — ${pages.length} pages générées, ${failed} échecs`
  )

  if (pages.length < plan.pages.length / 2) {
    console.error("[generateSiteCode] >50% pages failed, falling back")
    return FALLBACK
  }

  let css: string
  let js: string
  try {
    ;[css, js] = await Promise.all([generateCss(plan, pages), generateJs(plan)])
  } catch (e) {
    console.error("[generateSiteCode] phase 3 (css/js) failed:", e)
    return FALLBACK
  }
  console.log("[generateSiteCode] phase 3 ok — css + js générés")

  return {
    files: [
      ...pages,
      { path: "css/style.css", content: css },
      { path: "js/main.js", content: js },
    ],
  }
}
