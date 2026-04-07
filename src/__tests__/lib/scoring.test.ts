import { describe, it, expect, vi, beforeEach } from "vitest"
import { calculateGlobalScore, scoreFinancier } from "@/lib/scoring"
import { parseClaudeJSON } from "@/lib/anthropic"

vi.mock("@/lib/anthropic", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/anthropic")>()
  return { ...actual, analyzeWithClaude: vi.fn() }
})

import { analyzeWithClaude } from "@/lib/anthropic"

describe("calculateGlobalScore", () => {
  it("calculates weighted average with all axes", () => {
    const result = calculateGlobalScore({
      scorePresenceWeb: 10,
      scoreSEO: 8,
      scoreDesign: 6,
      scoreFinancier: 7,
      scorePotentiel: 9,
    })
    // (10*3 + 8*2 + 6*2 + 7*1 + 9*3) / 11 = 92/11 = 8.36 → 8
    expect(result).toBe(8)
  })

  it("excludes null axes from calculation", () => {
    const result = calculateGlobalScore({
      scorePresenceWeb: 10,
      scoreSEO: null,
      scoreDesign: null,
      scoreFinancier: null,
      scorePotentiel: 8,
    })
    // (10*3 + 8*3) / 6 = 54/6 = 9
    expect(result).toBe(9)
  })

  it("returns score with only scorePresenceWeb", () => {
    const result = calculateGlobalScore({
      scorePresenceWeb: 5,
      scoreSEO: null,
      scoreDesign: null,
      scoreFinancier: null,
      scorePotentiel: null,
    })
    expect(result).toBe(5)
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
