import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/maquette/scrape-identity", () => ({
  scrapeIdentity: vi.fn(),
}))
vi.mock("@/lib/maquette/pappers", () => ({
  matchPappers: vi.fn(),
}))
vi.mock("@/lib/maquette/pexels", () => ({
  searchPexelsImages: vi.fn(),
  searchPexelsVideo: vi.fn(),
}))
vi.mock("@/lib/anthropic", () => ({
  analyzeWithClaude: vi.fn(),
}))

import { investigate } from "@/lib/maquette/investigate"
import { scrapeIdentity } from "@/lib/maquette/scrape-identity"
import { matchPappers } from "@/lib/maquette/pappers"
import { searchPexelsImages, searchPexelsVideo } from "@/lib/maquette/pexels"
import { analyzeWithClaude } from "@/lib/anthropic"

const mockProspect = {
  id: "prospect-1",
  nom: "Boulangerie Martin",
  activite: "Boulangerie",
  ville: "Lille",
  adresse: "12 Rue de la Paix, 59000 Lille",
  telephone: "0320123456",
  siteUrl: "https://boulangerie-martin.fr",
  noteGoogle: 4.5,
  nbAvisGoogle: 128,
}

const mockProspectWithoutData = {
  id: "prospect-2",
  nom: "Épicerie Dupont",
  activite: "Épicerie",
  ville: "Roubaix",
  adresse: "5 Rue Verte, 59100 Roubaix",
  telephone: null,
  siteUrl: null,
  noteGoogle: null,
  nbAvisGoogle: null,
}

const mockSiteIdentity = {
  colors: ["#ff6b35", "#ffffff"],
  fonts: ["Georgia", "Arial"],
  logoUrl: "https://boulangerie-martin.fr/logo.png",
  styleDescription: "Chaleureux et traditionnel",
  slogan: "Le pain artisanal depuis 1985",
  services: ["Pain", "Viennoiseries", "Pâtisseries"],
  tarifs: null,
  horaires: "Lun-Sam 7h-19h",
  equipe: "Famille Martin",
  temoignages: ["Excellent pain !", "Très bonne baguette"],
  certifications: [],
  zoneIntervention: null,
  historique: "Fondée en 1985",
  faq: null,
  galerieUrls: [],
  moyensPaiement: ["CB", "Espèces"],
}

const mockPappersData = {
  siret: "12345678901234",
  siren: "123456789",
  denominationSociale: "BOULANGERIE MARTIN SAS",
  nomCommercial: "Boulangerie Martin",
  dirigeant: "Jean Martin",
  dateCreation: "1985-03-15",
  anciennete: "41 ans",
  formeJuridique: "SAS",
  chiffreAffaires: 350000,
  resultatNet: 25000,
  effectifs: "3-5",
  codeNAF: "10.71C",
  libelleNAF: "Boulangerie et boulangerie-pâtisserie",
  adresseSiege: "12 Rue de la Paix, 59000 Lille",
  latitude: 50.6292,
  longitude: 3.0573,
  statutEntreprise: "Actif",
  conventionCollective: null,
  matchConfidence: "high" as const,
  matchMethod: "nom" as const,
}

const mockAnalyse = {
  concurrents: JSON.stringify([{ nom: "Boulangerie Durand", note: 4.2 }]),
  recommandations: JSON.stringify(["Site moderne", "Commande en ligne"]),
}

const mockClientPerception = {
  motsClesPositifs: ["excellent", "artisanal", "frais"],
  motsClesNegatifs: [],
  perceptionDominante: "Très bien perçue par les clients locaux",
  forcesPercues: ["Qualité des produits", "Accueil chaleureux"],
  pointsAmelioration: ["Horaires limités le dimanche"],
}

describe("investigate", () => {
  beforeEach(() => vi.clearAllMocks())

  it("retourne un InvestigationResult complet quand toutes les sources réussissent", async () => {
    vi.mocked(scrapeIdentity).mockResolvedValue(mockSiteIdentity)
    vi.mocked(matchPappers).mockResolvedValue(mockPappersData)
    vi.mocked(searchPexelsImages).mockResolvedValue([
      "https://images.pexels.com/1.jpg",
      "https://images.pexels.com/2.jpg",
    ])
    vi.mocked(searchPexelsVideo).mockResolvedValue({
      videoUrl: "https://videos.pexels.com/1.mp4",
      duration: 15,
    })
    vi.mocked(analyzeWithClaude).mockResolvedValue(
      JSON.stringify(mockClientPerception)
    )

    const result = await investigate(mockProspect, mockAnalyse)

    expect(result.prospect).toEqual(mockProspect)
    expect(result.siteIdentity).toEqual(mockSiteIdentity)
    expect(result.pappersData).toEqual(mockPappersData)
    expect(result.pexelsImages).toHaveLength(2)
    expect(result.pexelsVideo).toEqual({ videoUrl: "https://videos.pexels.com/1.mp4", duration: 15 })
    expect(result.clientPerception).toEqual(mockClientPerception)
    expect(result.analyse).toEqual(mockAnalyse)
  })

  it("retourne siteIdentity: null si scrapeIdentity est rejeté, le reste est OK", async () => {
    vi.mocked(scrapeIdentity).mockRejectedValue(new Error("Timeout scraping"))
    vi.mocked(matchPappers).mockResolvedValue(mockPappersData)
    vi.mocked(searchPexelsImages).mockResolvedValue(["https://images.pexels.com/1.jpg"])
    vi.mocked(searchPexelsVideo).mockResolvedValue({ videoUrl: "https://vid.mp4", duration: 10 })
    vi.mocked(analyzeWithClaude).mockResolvedValue(JSON.stringify(mockClientPerception))

    const result = await investigate(mockProspect, mockAnalyse)

    expect(result.siteIdentity).toBeNull()
    expect(result.pappersData).toEqual(mockPappersData)
    expect(result.pexelsImages).toHaveLength(1)
    expect(result.pexelsVideo).not.toBeNull()
    expect(result.clientPerception).toEqual(mockClientPerception)
  })

  it("retourne pappersData: null si matchPappers retourne null", async () => {
    vi.mocked(scrapeIdentity).mockResolvedValue(mockSiteIdentity)
    vi.mocked(matchPappers).mockResolvedValue(null)
    vi.mocked(searchPexelsImages).mockResolvedValue([])
    vi.mocked(searchPexelsVideo).mockResolvedValue(null)
    vi.mocked(analyzeWithClaude).mockResolvedValue(JSON.stringify(mockClientPerception))

    const result = await investigate(mockProspect, mockAnalyse)

    expect(result.pappersData).toBeNull()
    expect(result.siteIdentity).toEqual(mockSiteIdentity)
  })

  it("ne pas appeler scrapeIdentity si pas de siteUrl, siteIdentity: null", async () => {
    vi.mocked(matchPappers).mockResolvedValue(null)
    vi.mocked(searchPexelsImages).mockResolvedValue([])
    vi.mocked(searchPexelsVideo).mockResolvedValue(null)
    vi.mocked(analyzeWithClaude).mockResolvedValue("null")

    const result = await investigate(mockProspectWithoutData, null)

    expect(scrapeIdentity).not.toHaveBeenCalled()
    expect(result.siteIdentity).toBeNull()
  })

  it("retourne clientPerception: null si pas de noteGoogle ni d'analyse", async () => {
    vi.mocked(scrapeIdentity).mockResolvedValue(mockSiteIdentity)
    vi.mocked(matchPappers).mockResolvedValue(null)
    vi.mocked(searchPexelsImages).mockResolvedValue([])
    vi.mocked(searchPexelsVideo).mockResolvedValue(null)

    // No noteGoogle, no nbAvisGoogle, no analyse
    const result = await investigate(mockProspectWithoutData, null)

    expect(result.clientPerception).toBeNull()
    expect(analyzeWithClaude).not.toHaveBeenCalled()
  })

  it("retourne pexelsImages: [] si searchPexelsImages est rejeté, le reste est OK", async () => {
    vi.mocked(scrapeIdentity).mockResolvedValue(mockSiteIdentity)
    vi.mocked(matchPappers).mockResolvedValue(mockPappersData)
    vi.mocked(searchPexelsImages).mockRejectedValue(new Error("Pexels API error"))
    vi.mocked(searchPexelsVideo).mockResolvedValue({ videoUrl: "https://vid.mp4", duration: 20 })
    vi.mocked(analyzeWithClaude).mockResolvedValue(JSON.stringify(mockClientPerception))

    const result = await investigate(mockProspect, mockAnalyse)

    expect(result.pexelsImages).toEqual([])
    expect(result.siteIdentity).toEqual(mockSiteIdentity)
    expect(result.pappersData).toEqual(mockPappersData)
    expect(result.pexelsVideo).not.toBeNull()
  })

  it("retourne InvestigationResult avec toutes valeurs null/vides si toutes les sources échouent", async () => {
    vi.mocked(scrapeIdentity).mockRejectedValue(new Error("Scrape failed"))
    vi.mocked(matchPappers).mockRejectedValue(new Error("Pappers failed"))
    vi.mocked(searchPexelsImages).mockRejectedValue(new Error("Pexels images failed"))
    vi.mocked(searchPexelsVideo).mockRejectedValue(new Error("Pexels video failed"))
    vi.mocked(analyzeWithClaude).mockRejectedValue(new Error("Claude failed"))

    const result = await investigate(mockProspect, mockAnalyse)

    expect(result.prospect).toEqual(mockProspect)
    expect(result.siteIdentity).toBeNull()
    expect(result.pappersData).toBeNull()
    expect(result.pexelsImages).toEqual([])
    expect(result.pexelsVideo).toBeNull()
    expect(result.clientPerception).toBeNull()
    expect(result.analyse).toEqual(mockAnalyse)
  })
})
