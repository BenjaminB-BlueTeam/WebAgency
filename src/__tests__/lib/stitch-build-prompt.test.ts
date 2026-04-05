import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/anthropic", () => ({
  analyzeWithClaude: vi.fn().mockResolvedValue("Prompt de design généré"),
}))

import { buildStitchPrompt } from "@/lib/stitch/buildPrompt"
import { analyzeWithClaude } from "@/lib/anthropic"

const mockClaude = analyzeWithClaude as ReturnType<typeof vi.fn>

describe("buildStitchPrompt", () => {
  beforeEach(() => vi.clearAllMocks())

  it("includes prospect nom, activite, ville in user prompt", async () => {
    await buildStitchPrompt({ nom: "Plomberie Martin", activite: "Plombier", ville: "Steenvoorde" })
    const userPrompt = mockClaude.mock.calls[0][1]
    expect(userPrompt).toContain("Plomberie Martin")
    expect(userPrompt).toContain("Plombier")
    expect(userPrompt).toContain("Steenvoorde")
  })

  it("includes telephone when provided", async () => {
    await buildStitchPrompt({ nom: "T", activite: "X", ville: "Y", telephone: "0320001122" })
    const userPrompt = mockClaude.mock.calls[0][1]
    expect(userPrompt).toContain("0320001122")
  })

  it("mentions no website when siteUrl is null", async () => {
    await buildStitchPrompt({ nom: "T", activite: "X", ville: "Y", siteUrl: null })
    const userPrompt = mockClaude.mock.calls[0][1]
    expect(userPrompt).toContain("Pas de site web")
  })

  it("includes recommandations from analyse when provided", async () => {
    const analyse = { recommandations: JSON.stringify([{ axe: "SEO", conseil: "Améliorer les balises" }]) }
    await buildStitchPrompt({ nom: "T", activite: "X", ville: "Y" }, analyse)
    const userPrompt = mockClaude.mock.calls[0][1]
    expect(userPrompt).toContain("Recommandations")
  })

  it("returns the Claude response", async () => {
    const result = await buildStitchPrompt({ nom: "T", activite: "X", ville: "Y" })
    expect(result).toBe("Prompt de design généré")
  })
})
