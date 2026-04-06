import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/anthropic", () => ({
  analyzeWithClaude: vi.fn(),
}))

import { generateSiteCode } from "@/lib/maquette/generate-site"
import type { GenerationContext } from "@/lib/maquette/generate-site"
import { analyzeWithClaude } from "@/lib/anthropic"

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_RESPONSE = JSON.stringify({
  files: [
    { path: "index.html", content: "<html><body>Home</body></html>" },
    { path: "css/style.css", content: "body { margin: 0; }" },
    { path: "js/main.js", content: "console.log('ready');" },
  ],
})

const BASE_CONTEXT: GenerationContext = {
  pexelsImages: [],
  pexelsVideoUrl: null,
  logoUrl: null,
  identity: null,
}

const SAMPLE_PROMPT = `## CONTENU\n\nHero : Plombier rapide à Cassel\n\n## DESIGN\n\nModerne\n\n## SEO\n\nPlombier Cassel`

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("generateSiteCode", () => {
  beforeEach(() => vi.clearAllMocks())

  it("1. Returns SiteFiles with files array from valid Claude JSON response", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue(VALID_RESPONSE)

    const result = await generateSiteCode(SAMPLE_PROMPT, BASE_CONTEXT)

    expect(Array.isArray(result.files)).toBe(true)
    expect(result.files).toHaveLength(3)
    expect(result.files[0].path).toBe("index.html")
    expect(result.files[0].content).toContain("<html>")
  })

  it("2. Parses JSON wrapped in markdown code block (```json ... ```)", async () => {
    const wrapped = "```json\n" + VALID_RESPONSE + "\n```"
    vi.mocked(analyzeWithClaude).mockResolvedValue(wrapped)

    const result = await generateSiteCode(SAMPLE_PROMPT, BASE_CONTEXT)

    expect(Array.isArray(result.files)).toBe(true)
    expect(result.files).toHaveLength(3)
    expect(result.files.some((f) => f.path === "index.html")).toBe(true)
  })

  it("3. Returns fallback when Claude returns non-JSON text", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue(
      "Désolé, je ne peux pas générer ce site pour le moment."
    )

    const result = await generateSiteCode(SAMPLE_PROMPT, BASE_CONTEXT)

    expect(result.files).toHaveLength(1)
    expect(result.files[0].path).toBe("index.html")
    expect(result.files[0].content).toContain("Site en cours de génération")
  })

  it("4. Returns fallback when files array is empty", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue(JSON.stringify({ files: [] }))

    const result = await generateSiteCode(SAMPLE_PROMPT, BASE_CONTEXT)

    expect(result.files).toHaveLength(1)
    expect(result.files[0].content).toContain("Site en cours de génération")
  })

  it("5. Includes pexelsVideoUrl in user prompt when provided", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue(VALID_RESPONSE)

    const context: GenerationContext = {
      ...BASE_CONTEXT,
      pexelsVideoUrl: "https://videos.pexels.com/hero.mp4",
    }

    await generateSiteCode(SAMPLE_PROMPT, context)

    const [, userPrompt] = vi.mocked(analyzeWithClaude).mock.calls[0]
    expect(userPrompt).toContain("https://videos.pexels.com/hero.mp4")
  })

  it("6. Includes logoUrl in user prompt when provided", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue(VALID_RESPONSE)

    const context: GenerationContext = {
      ...BASE_CONTEXT,
      logoUrl: "https://example.com/logo.png",
    }

    await generateSiteCode(SAMPLE_PROMPT, context)

    const [, userPrompt] = vi.mocked(analyzeWithClaude).mock.calls[0]
    expect(userPrompt).toContain("https://example.com/logo.png")
  })
})
