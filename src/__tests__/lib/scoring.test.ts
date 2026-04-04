import { describe, it, expect } from "vitest"
import { calculateGlobalScore, scoreFinancier } from "@/lib/scoring"
import { parseClaudeJSON } from "@/lib/anthropic"

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
  it("calculates score from noteGoogle and nbAvisGoogle", () => {
    expect(scoreFinancier(4.5, 120)).toBe(7)
  })

  it("caps at 10", () => {
    expect(scoreFinancier(5, 500)).toBe(10)
  })

  it("returns null when noteGoogle is null", () => {
    expect(scoreFinancier(null, 100)).toBeNull()
  })

  it("returns null when nbAvisGoogle is null", () => {
    expect(scoreFinancier(4.0, null)).toBeNull()
  })

  it("handles low values", () => {
    expect(scoreFinancier(2, 5)).toBe(2)
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
})
