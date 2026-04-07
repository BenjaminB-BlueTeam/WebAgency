import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/anthropic", () => ({
  analyzeWithClaude: vi.fn(),
  parseClaudeJSON: <T,>(response: string): T => {
    try {
      return JSON.parse(response) as T
    } catch {
      const fence = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
      if (fence) return JSON.parse(fence[1]) as T
      const bare = response.match(/\{[\s\S]*\}/)
      if (bare) return JSON.parse(bare[0]) as T
      throw new Error("parse fail")
    }
  },
}))

import { generateSiteCode } from "@/lib/maquette/generate-site"
import type { GenerationContext } from "@/lib/maquette/generate-site"
import { analyzeWithClaude } from "@/lib/anthropic"
import { REQUIRED_CLASS_KEYS } from "@/lib/maquette/plan"

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const BASE_CONTEXT: GenerationContext = {
  pexelsImages: [],
  pexelsVideoUrl: null,
  logoUrl: null,
  identity: null,
}

const SAMPLE_PROMPT = `## CONTENU\n\nHero : Plombier rapide à Cassel`

const SHARED_HEADER = `<header class="nav-main"><div class="nav-inner"><a class="nav-logo" href="index.html">Plomberie</a><nav class="nav-links"><a class="nav-link" href="index.html">Accueil</a><a class="nav-link" href="services.html">Services</a></nav></div></header>`
const SHARED_FOOTER = `<footer class="footer"><div class="footer-inner"><div class="footer-links">© 2026</div></div></footer>`

const CLASS_NAMES: Record<string, string> = REQUIRED_CLASS_KEYS.reduce(
  (acc, key) => {
    // kebab-case
    const kebab = key.replace(/([A-Z])/g, "-$1").toLowerCase()
    acc[key] = `.${kebab}`
    return acc
  },
  {} as Record<string, string>
)

const PLAN_RESPONSE = JSON.stringify({
  pages: [
    {
      filename: "index.html",
      title: "Accueil",
      h1: "Plomberie rapide",
      summary: "Page d'accueil",
      sections: ["Hero", "Services"],
    },
    {
      filename: "services.html",
      title: "Services",
      h1: "Nos services",
      summary: "Page services",
      sections: ["Liste"],
    },
  ],
  designSystem: {
    colors: {
      bg: "#0a0a0a",
      bgAlt: "#111111",
      text: "#fafafa",
      textMuted: "#888888",
      accent: "#3b82f6",
      accentHighlight: "#60a5fa",
      border: "#222222",
    },
    typography: {
      fontFamily: "'Inter', sans-serif",
      h1Size: "3rem",
      h2Size: "2rem",
      bodySize: "1rem",
      headingWeight: "700",
      bodyWeight: "400",
    },
    spacing: {
      sectionPaddingDesktop: "120px 0",
      sectionPaddingMobile: "64px 0",
      containerMaxWidth: "1200px",
      gap: "24px",
    },
    borderRadius: "8px",
    tone: "Sobre et premium",
  },
  classNames: CLASS_NAMES,
  sharedHeaderHtml: SHARED_HEADER,
  sharedFooterHtml: SHARED_FOOTER,
})

function pageHtml(title: string): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>${title}</title><link rel="stylesheet" href="css/style.css"></head><body>${SHARED_HEADER}<main><section class="hero"><div class="hero-content"><h1 class="hero-title">${title}</h1></div></section></main>${SHARED_FOOTER}</body></html>`
}

const CSS_RESPONSE = `:root { --bg: #0a0a0a; --text: #fafafa; --accent: #3b82f6; }
body { background: var(--bg); color: var(--text); }
.container { max-width: 1200px; }
.nav-main { position: sticky; }
.nav-inner {} .nav-logo {} .nav-links {} .nav-link {} .nav-cta {} .nav-hamburger {}
.hero {} .hero-video {} .hero-overlay {} .hero-content {} .hero-title {} .hero-subtitle {} .hero-cta {}
.section {} .section-alt {} .section-inner {} .section-title {} .section-subtitle {}
.card {} .card-title {} .card-text {} .card-cta {}
.btn-primary {} .btn-secondary {}
.footer {} .footer-inner {} .footer-links {}`

const JS_RESPONSE = `document.addEventListener("DOMContentLoaded", () => { console.log("ok"); });`

// Helper qui pilote le mock par index d'appel
function setupMockSequence(responses: string[]) {
  const mock = vi.mocked(analyzeWithClaude)
  let i = 0
  mock.mockImplementation(async () => {
    const r = responses[i] ?? responses[responses.length - 1]
    i++
    return r
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("generateSiteCode (3-phases)", () => {
  beforeEach(() => vi.clearAllMocks())

  it("1. Toutes les pages contiennent le sharedHeaderHtml et le sharedFooterHtml identiques", async () => {
    setupMockSequence([
      PLAN_RESPONSE,
      pageHtml("Accueil"),
      pageHtml("Services"),
      CSS_RESPONSE,
      JS_RESPONSE,
    ])

    const result = await generateSiteCode(SAMPLE_PROMPT, BASE_CONTEXT)

    const htmlPages = result.files.filter((f) => f.path.endsWith(".html"))
    expect(htmlPages.length).toBe(2)
    for (const p of htmlPages) {
      expect(p.content).toContain(SHARED_HEADER)
      expect(p.content).toContain(SHARED_FOOTER)
    }
  })

  it("2. Toutes les classes utilisées dans les HTML sont stylées dans le CSS généré", async () => {
    setupMockSequence([
      PLAN_RESPONSE,
      pageHtml("Accueil"),
      pageHtml("Services"),
      CSS_RESPONSE,
      JS_RESPONSE,
    ])

    const result = await generateSiteCode(SAMPLE_PROMPT, BASE_CONTEXT)

    const css = result.files.find((f) => f.path === "css/style.css")?.content ?? ""
    const html = result.files.filter((f) => f.path.endsWith(".html")).map((f) => f.content).join("\n")
    const used = new Set<string>()
    const re = /class\s*=\s*["']([^"']+)["']/g
    let m: RegExpExecArray | null
    while ((m = re.exec(html)) !== null) {
      for (const c of m[1].split(/\s+/).filter(Boolean)) used.add(c)
    }
    expect(used.size).toBeGreaterThan(0)
    for (const c of used) {
      expect(css).toContain(`.${c}`)
    }
  })

  it("3. Aucune classe hors plan.classNames n'est inventée dans les HTML", async () => {
    setupMockSequence([
      PLAN_RESPONSE,
      pageHtml("Accueil"),
      pageHtml("Services"),
      CSS_RESPONSE,
      JS_RESPONSE,
    ])

    const result = await generateSiteCode(SAMPLE_PROMPT, BASE_CONTEXT)

    const known = new Set(Object.values(CLASS_NAMES).map((s) => s.replace(/^\./, "")))
    const html = result.files.filter((f) => f.path.endsWith(".html")).map((f) => f.content).join("\n")
    const re = /class\s*=\s*["']([^"']+)["']/g
    let m: RegExpExecArray | null
    while ((m = re.exec(html)) !== null) {
      for (const c of m[1].split(/\s+/).filter(Boolean)) {
        expect(known.has(c)).toBe(true)
      }
    }
  })

  it("4. Les couleurs du designSystem apparaissent dans le CSS généré", async () => {
    setupMockSequence([
      PLAN_RESPONSE,
      pageHtml("Accueil"),
      pageHtml("Services"),
      CSS_RESPONSE,
      JS_RESPONSE,
    ])

    const result = await generateSiteCode(SAMPLE_PROMPT, BASE_CONTEXT)
    const css = result.files.find((f) => f.path === "css/style.css")?.content ?? ""
    expect(css).toContain("#0a0a0a")
    expect(css).toContain("#fafafa")
    expect(css).toContain("#3b82f6")
  })

  it("5. Fallback si planSite retourne null (réponse non parsable)", async () => {
    setupMockSequence(["pas du json du tout"])
    const result = await generateSiteCode(SAMPLE_PROMPT, BASE_CONTEXT)
    expect(result.files).toHaveLength(1)
    expect(result.files[0].content).toContain("Site en cours de génération")
  })

  it("6. Fallback si plus de 50% des pages échouent", async () => {
    setupMockSequence([
      PLAN_RESPONSE,
      "html cassé sans balise", // page 1 échoue
      "html cassé sans balise", // page 2 échoue
    ])
    const result = await generateSiteCode(SAMPLE_PROMPT, BASE_CONTEXT)
    expect(result.files).toHaveLength(1)
    expect(result.files[0].content).toContain("Site en cours de génération")
  })
})
