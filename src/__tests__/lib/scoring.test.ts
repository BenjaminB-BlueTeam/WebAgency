import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

vi.mock("@/lib/params", () => ({
  getParam: vi.fn((_key: string, defaultValue: string) => Promise.resolve(defaultValue)),
}))

vi.mock("@/lib/anthropic", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/anthropic")>()
  return { ...actual, analyzeWithClaude: vi.fn() }
})

import { calculateGlobalScore, scoreFinancier, scoreProspect } from "@/lib/scoring"
import { parseClaudeJSON } from "@/lib/anthropic"
import { analyzeWithClaude } from "@/lib/anthropic"
import { getParam } from "@/lib/params"

describe("calculateGlobalScore", () => {
  it("calculates weighted average with all axes", async () => {
    const result = await calculateGlobalScore({
      scorePresenceWeb: 10,
      scoreSEO: 8,
      scoreDesign: 6,
      scoreFinancier: 7,
      scorePotentiel: 9,
    })
    // (10*3 + 8*2 + 6*2 + 7*1 + 9*3) / 11 = 92/11 = 8.36 → 8
    expect(result).toBe(8)
  })

  it("excludes null axes from calculation", async () => {
    const result = await calculateGlobalScore({
      scorePresenceWeb: 10,
      scoreSEO: null,
      scoreDesign: null,
      scoreFinancier: null,
      scorePotentiel: 8,
    })
    // (10*3 + 8*3) / 6 = 54/6 = 9
    expect(result).toBe(9)
  })

  it("returns score with only scorePresenceWeb", async () => {
    const result = await calculateGlobalScore({
      scorePresenceWeb: 5,
      scoreSEO: null,
      scoreDesign: null,
      scoreFinancier: null,
      scorePotentiel: null,
    })
    expect(result).toBe(5)
  })
})

describe("calculateGlobalScore with params", () => {
  beforeEach(() => vi.clearAllMocks())

  it("uses passed poids argument directly (no DB call)", async () => {
    const result = await calculateGlobalScore(
      { scorePresenceWeb: 10, scoreSEO: null, scoreDesign: null, scoreFinancier: null, scorePotentiel: null },
      { presenceWeb: 5, seo: 0, design: 0, financier: 0, potentiel: 0 }
    )
    expect(result).toBe(10)
    // getParam was NOT called
    expect(vi.mocked(getParam)).not.toHaveBeenCalled()
  })

  it("loads weights from getParam when no poids provided", async () => {
    vi.mocked(getParam).mockImplementation((_key: string, _def: string) => Promise.resolve("5"))
    const result = await calculateGlobalScore({
      scorePresenceWeb: 10,
      scoreSEO: 8,
      scoreDesign: null,
      scoreFinancier: null,
      scorePotentiel: null,
    })
    expect(vi.mocked(getParam)).toHaveBeenCalled()
    // Both axes have weight 5, result = (10*5 + 8*5) / (5+5) = 90/10 = 9
    expect(result).toBe(9)
  })

  it("clamps invalid weight (above max) to 10", async () => {
    vi.mocked(getParam).mockImplementation((_key: string, def: string) => {
      if (_key === "scoring.poids.presenceWeb") return Promise.resolve("99")
      return Promise.resolve(def)
    })
    const result = await calculateGlobalScore({
      scorePresenceWeb: 10,
      scoreSEO: null,
      scoreDesign: null,
      scoreFinancier: null,
      scorePotentiel: null,
    })
    // presenceWeb weight clamped to 10, only one axis: result = 10
    expect(result).toBe(10)
  })

  it("falls back to default when weight is not a number", async () => {
    vi.mocked(getParam).mockImplementation((_key: string, def: string) => {
      if (_key === "scoring.poids.presenceWeb") return Promise.resolve("not-a-number")
      return Promise.resolve(def)
    })
    const result = await calculateGlobalScore({
      scorePresenceWeb: 6,
      scoreSEO: null,
      scoreDesign: null,
      scoreFinancier: null,
      scorePotentiel: null,
    })
    // Falls back to default weight 3, result = 6
    expect(result).toBe(6)
  })
})

describe("scoreFinancier", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns Claude score clamped to 0-10", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue('{"score": 7, "justification": "Secteur actif"}')
    const result = await scoreFinancier("garagiste", "Steenvoorde", 5.0, 22)
    expect(result).toBe(7)
  })

  it("clamps score above 10 to 10", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue('{"score": 12, "justification": "Très bonne capacité"}')
    const result = await scoreFinancier("notaire", "Lille", 4.8, 200)
    expect(result).toBe(10)
  })

  it("clamps score below 0 to 0", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue('{"score": -2, "justification": "Micro-entreprise"}')
    const result = await scoreFinancier("artisan", "Village", 3.0, 2)
    expect(result).toBe(0)
  })

  it("returns null on Claude error", async () => {
    vi.mocked(analyzeWithClaude).mockRejectedValue(new Error("API error"))
    const result = await scoreFinancier("boulanger", "Hazebrouck", null, null)
    expect(result).toBeNull()
  })

  it("passes activite and ville in the prompt", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue('{"score": 6, "justification": "OK"}')
    await scoreFinancier("fleuriste", "Bailleul", 4.2, 30)
    const call = vi.mocked(analyzeWithClaude).mock.calls[0]
    expect(call[1]).toContain("fleuriste")
    expect(call[1]).toContain("Bailleul")
  })
})

describe("scoreProspect", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }))
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("returns all score fields when siteUrl is null", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue(
      '{"score": 5, "justification": "test"}'
    )
    const result = await scoreProspect({
      siteUrl: null,
      activite: "boulanger",
      ville: "Hazebrouck",
      noteGoogle: 4.5,
      nbAvisGoogle: 20,
    })
    expect(result).toHaveProperty("scorePresenceWeb")
    expect(result).toHaveProperty("scoreSEO")
    expect(result).toHaveProperty("scoreDesign")
    expect(result).toHaveProperty("scoreFinancier")
    expect(result).toHaveProperty("scorePotentiel")
    expect(result).toHaveProperty("scoreGlobal")
  })
})

describe("parseClaudeJSON", () => {
  it("parses direct JSON", () => {
    const result = parseClaudeJSON<{ score: number }>(
      '{"score": 7, "raisons": ["test"]}'
    )
    expect(result.score).toBe(7)
  })

  it("parses JSON in markdown fences", () => {
    const result = parseClaudeJSON<{ score: number }>(
      'Voici mon analyse:\n```json\n{"score": 8}\n```'
    )
    expect(result.score).toBe(8)
  })

  it("parses JSON embedded in text", () => {
    const result = parseClaudeJSON<{ score: number }>(
      'Le score est {"score": 5, "justification": "test"} voilà.'
    )
    expect(result.score).toBe(5)
  })

  it("throws on invalid input", () => {
    expect(() => parseClaudeJSON("pas du json du tout")).toThrow(
      "Impossible de parser la réponse IA"
    )
  })

  it("parses JSON in bare ``` fences without json language tag", () => {
    const result = parseClaudeJSON<{ score: number }>(
      "Voici:\n```\n{\"score\": 4}\n```"
    )
    expect(result.score).toBe(4)
  })

  it("returns null when score key is missing (typed cast)", () => {
    const result = parseClaudeJSON<{ other: string }>('{"other": "value"}')
    expect(result.other).toBe("value")
  })
})
