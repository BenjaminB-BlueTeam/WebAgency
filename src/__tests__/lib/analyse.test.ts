/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/places", () => ({ searchPlaces: vi.fn() }))
vi.mock("@/lib/scrape", () => ({ crawlSite: vi.fn() }))
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
import { crawlSite } from "@/lib/scrape"
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

  it("crawl en parallèle et retourne les pages par concurrent", async () => {
    const candidates = [makePlace("p1", "https://a.com"), makePlace("p2", "https://b.com")]
    vi.mocked(crawlSite).mockResolvedValue([
      { pageUrl: "https://a.com", content: "# Accueil" },
      { pageUrl: "https://a.com/services", content: "# Services" },
    ])
    const result = await scrapeCompetitors(candidates as any)
    expect(result).toHaveLength(2)
    expect(result[0].nom).toBe("Concurrent p1")
    expect(result[0].pages).toHaveLength(2)
    expect(result[0].pages[0].content).toBe("# Accueil")
  })

  it("ignore les candidats sans siteUrl", async () => {
    const candidates = [makePlace("p1", "https://a.com"), makePlace("p2", null)]
    vi.mocked(crawlSite).mockResolvedValue([
      { pageUrl: "https://a.com", content: "# Home" },
    ])
    const result = await scrapeCompetitors(candidates as any)
    expect(result).toHaveLength(1)
    expect(result[0].nom).toBe("Concurrent p1")
  })

  it("ignore les échecs de crawl", async () => {
    const candidates = [makePlace("p1", "https://a.com"), makePlace("p2", "https://b.com")]
    vi.mocked(crawlSite)
      .mockResolvedValueOnce([{ pageUrl: "https://a.com", content: "# A" }])
      .mockRejectedValueOnce(new Error("Timeout"))
    const result = await scrapeCompetitors(candidates as any)
    expect(result).toHaveLength(1)
    expect(result[0].nom).toBe("Concurrent p1")
  })

  it("retourne [] si tout échoue", async () => {
    const candidates = [makePlace("p1", "https://a.com")]
    vi.mocked(crawlSite).mockRejectedValue(new Error("Timeout"))
    const result = await scrapeCompetitors(candidates as any)
    expect(result).toHaveLength(0)
  })
})

describe("buildAnalyseResult", () => {
  beforeEach(() => vi.clearAllMocks())

  const prospect = { nom: "Garage Martin", activite: "Garagiste", ville: "Steenvoorde" }
  const scraped = [{
    nom: "Concurrent A",
    siteUrl: "https://a.com",
    pages: [
      { pageUrl: "https://a.com", content: "# Accueil\nGarage généraliste" },
      { pageUrl: "https://a.com/services", content: "# Services\nVidange, freins" },
    ],
  }]
  const claudeResponse = JSON.stringify({
    concurrents: [{ nom: "Concurrent A", siteUrl: "https://a.com", forces: ["Site moderne"], faiblesses: ["Pas de contact"], positionnement: "Généraliste" }],
    synthese: "Marché peu concurrentiel",
    recommandations: ["Se démarquer sur les délais"],
  })

  it("appelle analyzeWithClaude avec maxTokens=4096 et haiku", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue(claudeResponse)
    await buildAnalyseResult(prospect, scraped)
    expect(analyzeWithClaude).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      4096,
      "claude-haiku-4-5-20251001"
    )
  })

  it("inclut le contenu multi-pages dans le prompt", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue(claudeResponse)
    await buildAnalyseResult(prospect, scraped)
    const call = vi.mocked(analyzeWithClaude).mock.calls[0]
    const userPrompt = call[1]
    expect(userPrompt).toContain("https://a.com")
    expect(userPrompt).toContain("https://a.com/services")
    expect(userPrompt).toContain("Vidange, freins")
  })

  it("parse le JSON Claude et retourne AnalyseResult", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue(claudeResponse)
    const result = await buildAnalyseResult(prospect, scraped)
    expect(result.concurrents).toHaveLength(1)
    expect(result.concurrents[0].nom).toBe("Concurrent A")
    expect(result.synthese).toBe("Marché peu concurrentiel")
  })

  it("tronque le contenu à 6000 chars par concurrent", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue(claudeResponse)
    const longScraped = [{
      nom: "Big Corp",
      siteUrl: "https://big.com",
      pages: [
        { pageUrl: "https://big.com", content: "x".repeat(4000) },
        { pageUrl: "https://big.com/services", content: "y".repeat(4000) },
      ],
    }]
    await buildAnalyseResult(prospect, longScraped)
    const call = vi.mocked(analyzeWithClaude).mock.calls[0]
    const userPrompt = call[1]
    // The full content would be 8000 chars but should be capped at 6000
    // First page: 4000 chars, second page: 2000 chars (remaining)
    expect(userPrompt).toContain("x".repeat(4000))
    expect(userPrompt).not.toContain("y".repeat(4000))
  })

  it("inclut les concurrents sans site dans le prompt", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue(claudeResponse)
    const noSite = [makePlace("ns1", null)]
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
