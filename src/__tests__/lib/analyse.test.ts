/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/places", () => ({ searchPlaces: vi.fn() }))
vi.mock("@/lib/scrape", () => ({ scrapeUrl: vi.fn() }))
vi.mock("@/lib/anthropic", () => ({
  analyzeWithClaude: vi.fn(),
  parseClaudeJSON: (s: string) => {
    try {
      return JSON.parse(s)
    } catch {
      throw new Error("Impossible de parser la réponse IA")
    }
  },
}))

import { findCompetitorCandidates, scrapeCompetitors, buildAnalyseResult } from "@/lib/analyse"
import { searchPlaces } from "@/lib/places"
import { scrapeUrl } from "@/lib/scrape"
import { analyzeWithClaude } from "@/lib/anthropic"

const makePlace = (id: string, siteUrl: string | null) => ({
  placeId: id,
  nom: `Concurrent ${id}`,
  adresse: "1 rue test",
  telephone: null,
  siteUrl,
  noteGoogle: null,
  nbAvisGoogle: null,
  types: [],
})

describe("findCompetitorCandidates", () => {
  beforeEach(() => vi.clearAllMocks())

  it("retourne max 8 candidats incluant ceux sans site", async () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      makePlace(`p${i}`, i % 2 === 0 ? `https://site${i}.com` : null)
    )
    vi.mocked(searchPlaces).mockResolvedValue(many as any)
    const result = await findCompetitorCandidates("Garagiste", "Lille")
    expect(result).toHaveLength(8)
  })

  it("exclut le placeId du prospect", async () => {
    const places = [makePlace("own", "https://own.com"), makePlace("other", "https://other.com")]
    vi.mocked(searchPlaces).mockResolvedValue(places as any)
    const result = await findCompetitorCandidates("Garagiste", "Lille", "own")
    expect(result.find((r) => r.placeId === "own")).toBeUndefined()
    expect(result).toHaveLength(1)
  })

  it("retourne [] si Places retourne []", async () => {
    vi.mocked(searchPlaces).mockResolvedValue([])
    const result = await findCompetitorCandidates("Garagiste", "Lille")
    expect(result).toHaveLength(0)
  })

  it("appelle searchPlaces avec un rayon de 20km", async () => {
    vi.mocked(searchPlaces).mockResolvedValue([])
    await findCompetitorCandidates("Plombier", "Saint-Sylvestre-Cappel")
    expect(searchPlaces).toHaveBeenCalledWith("Plombier", "Saint-Sylvestre-Cappel", 20000)
  })
})

describe("scrapeCompetitors", () => {
  beforeEach(() => vi.clearAllMocks())

  it("scrape en parallèle et retourne les succès", async () => {
    const candidates = [makePlace("p1", "https://a.com"), makePlace("p2", "https://b.com")]
    vi.mocked(scrapeUrl).mockResolvedValue("<html>content</html>")
    const result = await scrapeCompetitors(candidates as any)
    expect(result).toHaveLength(2)
    expect(result[0].nom).toBe("Concurrent p1")
    expect(result[0].html).toBe("<html>content</html>")
  })

  it("ignore les candidats sans siteUrl", async () => {
    const candidates = [makePlace("p1", "https://a.com"), makePlace("p2", null), makePlace("p3", "https://b.com")]
    vi.mocked(scrapeUrl).mockResolvedValue("<html>content</html>")
    const result = await scrapeCompetitors(candidates as any)
    expect(result).toHaveLength(2)
    expect(result.map((r) => r.nom)).toEqual(["Concurrent p1", "Concurrent p3"])
  })

  it("ignore les échecs de scraping", async () => {
    const candidates = [makePlace("p1", "https://a.com"), makePlace("p2", "https://b.com")]
    vi.mocked(scrapeUrl)
      .mockResolvedValueOnce("<html>A</html>")
      .mockRejectedValueOnce(new Error("Timeout"))
    const result = await scrapeCompetitors(candidates as any)
    expect(result).toHaveLength(1)
    expect(result[0].nom).toBe("Concurrent p1")
  })

  it("retourne [] si tout échoue", async () => {
    const candidates = [makePlace("p1", "https://a.com")]
    vi.mocked(scrapeUrl).mockRejectedValue(new Error("Timeout"))
    const result = await scrapeCompetitors(candidates as any)
    expect(result).toHaveLength(0)
  })
})

describe("buildAnalyseResult", () => {
  beforeEach(() => vi.clearAllMocks())

  const prospect = { nom: "Garage Martin", activite: "Garagiste", ville: "Steenvoorde" }
  const scraped = [{ nom: "Concurrent A", siteUrl: "https://a.com", html: "<html>test</html>" }]
  const claudeResponse = JSON.stringify({
    concurrents: [{ nom: "Concurrent A", siteUrl: "https://a.com", forces: ["Site moderne"], faiblesses: ["Pas de contact"], positionnement: "Généraliste" }],
    synthese: "Marché peu concurrentiel",
    recommandations: ["Se démarquer sur les délais"],
  })

  it("appelle analyzeWithClaude avec maxTokens=4096", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue(claudeResponse)
    await buildAnalyseResult(prospect, scraped)
    expect(analyzeWithClaude).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      4096
    )
  })

  it("parse le JSON Claude et retourne AnalyseResult", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue(claudeResponse)
    const result = await buildAnalyseResult(prospect, scraped)
    expect(result.concurrents).toHaveLength(1)
    expect(result.concurrents[0].nom).toBe("Concurrent A")
    expect(result.synthese).toBe("Marché peu concurrentiel")
    expect(result.recommandations).toHaveLength(1)
  })

  it("inclut les concurrents sans site dans le prompt", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue(claudeResponse)
    const noSite = [makePlace("ns1", null), makePlace("ns2", null)]
    await buildAnalyseResult(prospect, scraped, noSite as any)
    const call = vi.mocked(analyzeWithClaude).mock.calls[0]
    expect(call[1]).toContain("Concurrent ns1")
    expect(call[1]).toContain("sans site web")
  })

  it("lève une erreur si Claude retourne du JSON invalide", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue("ceci n'est pas du JSON valide")
    await expect(buildAnalyseResult(prospect, scraped)).rejects.toThrow()
  })
})
