import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/scrape", () => ({ scrapeUrl: vi.fn() }))
vi.mock("@/lib/anthropic", () => ({
  analyzeWithClaude: vi.fn(),
}))

import { scrapeIdentity } from "@/lib/maquette/scrape-identity"
import { scrapeUrl } from "@/lib/scrape"
import { analyzeWithClaude } from "@/lib/anthropic"

const emptySiteIdentity = {
  colors: [],
  fonts: [],
  logoUrl: null,
  styleDescription: "",
  slogan: null,
  services: [],
  tarifs: null,
  horaires: null,
  equipe: null,
  temoignages: [],
  certifications: [],
  zoneIntervention: null,
  historique: null,
  faq: null,
  galerieUrls: [],
  moyensPaiement: [],
}

const fullClaudeResponse = JSON.stringify({
  colors: ["#ff0000", "#00ff00"],
  fonts: ["Roboto", "Arial"],
  logoUrl: "https://example.com/logo.png",
  styleDescription: "moderne, minimaliste, clair",
  slogan: "Le meilleur service",
  services: ["Plomberie", "Électricité"],
  tarifs: "À partir de 50€/h",
  horaires: "Lun-Ven 8h-18h",
  equipe: "3 techniciens expérimentés",
  temoignages: ["Super service !", "Très professionnel"],
  certifications: ["RGE", "Qualibat"],
  zoneIntervention: "Nord-Pas-de-Calais",
  historique: "Fondée en 2005",
  faq: "Q: Devis gratuit ? R: Oui",
  galerieUrls: ["https://example.com/img1.jpg"],
  moyensPaiement: ["CB", "Espèces"],
})

describe("scrapeIdentity", () => {
  beforeEach(() => vi.clearAllMocks())

  it("retourne SiteIdentity complet quand scraping et Claude réussissent", async () => {
    vi.mocked(scrapeUrl).mockResolvedValue("<html><body>content</body></html>")
    vi.mocked(analyzeWithClaude).mockResolvedValue(fullClaudeResponse)

    const result = await scrapeIdentity("https://example.com")

    expect(result.colors).toEqual(["#ff0000", "#00ff00"])
    expect(result.fonts).toEqual(["Roboto", "Arial"])
    expect(result.logoUrl).toBe("https://example.com/logo.png")
    expect(result.styleDescription).toBe("moderne, minimaliste, clair")
    expect(result.slogan).toBe("Le meilleur service")
    expect(result.services).toEqual(["Plomberie", "Électricité"])
    expect(result.tarifs).toBe("À partir de 50€/h")
    expect(result.temoignages).toEqual(["Super service !", "Très professionnel"])
    expect(result.certifications).toEqual(["RGE", "Qualibat"])
  })

  it("retourne SiteIdentity vide si scraping lance une erreur", async () => {
    vi.mocked(scrapeUrl).mockRejectedValue(new Error("Timeout Firecrawl (30s)"))

    const result = await scrapeIdentity("https://example.com")

    expect(result).toEqual(emptySiteIdentity)
    expect(analyzeWithClaude).not.toHaveBeenCalled()
  })

  it("retourne SiteIdentity vide si Claude retourne un JSON invalide", async () => {
    vi.mocked(scrapeUrl).mockResolvedValue("<html>content</html>")
    vi.mocked(analyzeWithClaude).mockResolvedValue("ceci n'est pas du JSON valide")

    const result = await scrapeIdentity("https://example.com")

    expect(result).toEqual(emptySiteIdentity)
  })

  it("inclut les couleurs, fonts et logo trouvés dans le retour", async () => {
    vi.mocked(scrapeUrl).mockResolvedValue("<html><body>site</body></html>")
    vi.mocked(analyzeWithClaude).mockResolvedValue(fullClaudeResponse)

    const result = await scrapeIdentity("https://site.com")

    expect(result.colors).toHaveLength(2)
    expect(result.fonts).toHaveLength(2)
    expect(result.logoUrl).not.toBeNull()
  })

  it("services et temoignages sont des tableaux vides si absents", async () => {
    const partialResponse = JSON.stringify({
      colors: [],
      fonts: [],
      logoUrl: null,
      styleDescription: "",
      slogan: null,
      services: [],
      tarifs: null,
      horaires: null,
      equipe: null,
      temoignages: [],
      certifications: [],
      zoneIntervention: null,
      historique: null,
      faq: null,
      galerieUrls: [],
      moyensPaiement: [],
    })
    vi.mocked(scrapeUrl).mockResolvedValue("<html>empty site</html>")
    vi.mocked(analyzeWithClaude).mockResolvedValue(partialResponse)

    const result = await scrapeIdentity("https://empty-site.com")

    expect(result.services).toEqual([])
    expect(result.temoignages).toEqual([])
  })

  it("retourne SiteIdentity vide si scraping retourne une chaîne vide", async () => {
    vi.mocked(scrapeUrl).mockResolvedValue("")

    const result = await scrapeIdentity("https://example.com")

    expect(result).toEqual(emptySiteIdentity)
    expect(analyzeWithClaude).not.toHaveBeenCalled()
  })

  it("appelle analyzeWithClaude avec le bon system prompt", async () => {
    vi.mocked(scrapeUrl).mockResolvedValue("<html>content</html>")
    vi.mocked(analyzeWithClaude).mockResolvedValue(fullClaudeResponse)

    await scrapeIdentity("https://example.com")

    const [systemPrompt, userPrompt] = vi.mocked(analyzeWithClaude).mock.calls[0]
    expect(systemPrompt).toContain("expert en extraction de données")
    expect(userPrompt).toContain("<html>content</html>")
    expect(userPrompt).toContain("SiteIdentity")
  })
})
