import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/anthropic", () => ({
  analyzeWithClaude: vi.fn(),
}))

vi.mock("@/lib/maquette/investigate", () => ({}))

import { buildMaquettePrompt } from "@/lib/maquette/build-prompt"
import { analyzeWithClaude } from "@/lib/anthropic"
import type { InvestigationResult, ProspectData } from "@/lib/maquette/investigate"

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockProspect: ProspectData = {
  id: "prospect-1",
  nom: "Plomberie Dupont",
  activite: "Plombier",
  ville: "Cassel",
  adresse: "8 Grand Place, 59670 Cassel",
  telephone: "0320123456",
  siteUrl: "https://plomberie-dupont.fr",
  noteGoogle: 4.7,
  nbAvisGoogle: 89,
}

const mockSiteIdentity = {
  colors: ["#003366", "#ffffff"],
  fonts: ["Arial", "Helvetica"],
  logoUrl: "https://plomberie-dupont.fr/logo.png",
  styleDescription: "Professionnel et sobre",
  slogan: "L'eau, notre passion depuis 1990",
  services: ["Dépannage urgent", "Rénovation salle de bain", "Chauffage"],
  tarifs: "Déplacement 50€ + main d'œuvre 60€/h",
  horaires: "Lun-Ven 8h-18h, urgences 24h/24",
  equipe: "Jean Dupont et 3 compagnons",
  temoignages: ["Intervention rapide !", "Tarifs raisonnables"],
  certifications: ["RGE", "Qualibat"],
  zoneIntervention: "Cassel, Hazebrouck, Bailleul",
  historique: "Fondée en 1990",
  faq: null,
  galerieUrls: [],
  moyensPaiement: ["CB", "Chèque"],
}

const mockPappersData = {
  siret: "12345678901234",
  siren: "123456789",
  denominationSociale: "PLOMBERIE DUPONT SARL",
  nomCommercial: "Plomberie Dupont",
  dirigeant: "Jean Dupont",
  dateCreation: "1990-06-01",
  anciennete: "35 ans",
  formeJuridique: "SARL",
  chiffreAffaires: 420000,
  resultatNet: 32000,
  effectifs: "5-9",
  codeNAF: "43.22A",
  libelleNAF: "Travaux d'installation d'eau et de gaz",
  adresseSiege: "8 Grand Place, 59670 Cassel",
  latitude: 50.8,
  longitude: 2.48,
  statutEntreprise: "Actif",
  conventionCollective: null,
  matchConfidence: "high" as const,
  matchMethod: "nom" as const,
}

const mockClientPerception = {
  motsClesPositifs: ["rapide", "professionnel", "sérieux"],
  motsClesNegatifs: ["délai d'attente"],
  perceptionDominante: "Plombier de confiance recommandé localement",
  forcesPercues: ["Réactivité", "Sérieux"],
  pointsAmelioration: ["Délai RDV trop long en saison"],
}

const mockAnalyse = {
  concurrents: JSON.stringify([{ nom: "Plomberie Martin", note: 4.2 }]),
  recommandations: JSON.stringify(["Mettre en avant les urgences 24h/24", "Photos avant/après"]),
}

const CLAUDE_RESPONSE = `## CONTENU

Hero : Dépannage plomberie rapide à Cassel

## DESIGN

Couleurs : #003366, #ffffff

## SEO

Plombier Cassel, dépannage urgence`

function makeInvestigation(overrides: Partial<InvestigationResult> = {}): InvestigationResult {
  return {
    prospect: mockProspect,
    siteIdentity: mockSiteIdentity,
    pappersData: mockPappersData,
    pexelsImages: ["https://images.pexels.com/1.jpg", "https://images.pexels.com/2.jpg"],
    pexelsVideo: { videoUrl: "https://videos.pexels.com/1.mp4", duration: 30 },
    clientPerception: mockClientPerception,
    analyse: mockAnalyse,
    ...overrides,
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("buildMaquettePrompt", () => {
  beforeEach(() => vi.clearAllMocks())

  it("1. retourne un string avec les 3 sections ## CONTENU, ## DESIGN, ## SEO", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue(CLAUDE_RESPONSE)

    const result = await buildMaquettePrompt(makeInvestigation(), mockProspect)

    expect(typeof result).toBe("string")
    expect(result).toContain("## CONTENU")
    expect(result).toContain("## DESIGN")
    expect(result).toContain("## SEO")
  })

  it("2. inclut le nom et la ville du prospect dans le prompt envoyé à Claude", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue(CLAUDE_RESPONSE)

    await buildMaquettePrompt(makeInvestigation(), mockProspect)

    const [, userPrompt] = vi.mocked(analyzeWithClaude).mock.calls[0]
    expect(userPrompt).toContain("Plomberie Dupont")
    expect(userPrompt).toContain("Cassel")
  })

  it("2bis. inclut l'activité du prospect dans le prompt envoyé à Claude", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue(CLAUDE_RESPONSE)

    await buildMaquettePrompt(makeInvestigation(), mockProspect)

    const [, userPrompt] = vi.mocked(analyzeWithClaude).mock.calls[0]
    expect(userPrompt).toContain("Plombier")
  })

  it("3. inclut les données Pappers si disponibles", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue(CLAUDE_RESPONSE)

    await buildMaquettePrompt(makeInvestigation(), mockProspect)

    const [, userPrompt] = vi.mocked(analyzeWithClaude).mock.calls[0]
    expect(userPrompt).toContain("Jean Dupont")
    expect(userPrompt).toContain("PLOMBERIE DUPONT SARL")
    expect(userPrompt).toContain("12345678901234")
  })

  it("4. mentionne ⚠️ Confiance faible si matchConfidence === 'low'", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue(CLAUDE_RESPONSE)

    const lowConfidencePappers = { ...mockPappersData, matchConfidence: "low" as const }
    const investigation = makeInvestigation({ pappersData: lowConfidencePappers })

    await buildMaquettePrompt(investigation, mockProspect)

    const [, userPrompt] = vi.mocked(analyzeWithClaude).mock.calls[0]
    expect(userPrompt).toContain("Confiance faible")
  })

  it("5. inclut les services scrapés si siteIdentity est présente", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue(CLAUDE_RESPONSE)

    await buildMaquettePrompt(makeInvestigation(), mockProspect)

    const [, userPrompt] = vi.mocked(analyzeWithClaude).mock.calls[0]
    expect(userPrompt).toContain("Dépannage urgent")
    expect(userPrompt).toContain("Rénovation salle de bain")
  })

  it("6. retourne le fallback si Claude ne retourne pas le bon format", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue("Je ne sais pas quoi répondre.")

    const result = await buildMaquettePrompt(makeInvestigation(), mockProspect)

    expect(result).toContain("## CONTENU")
    expect(result).toContain("## DESIGN")
    expect(result).toContain("## SEO")
    expect(result).toContain("Plomberie Dupont")
    expect(result).toContain("Cassel")
  })

  it("7. inclut la vidéo Pexels si disponible", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue(CLAUDE_RESPONSE)

    await buildMaquettePrompt(makeInvestigation(), mockProspect)

    const [, userPrompt] = vi.mocked(analyzeWithClaude).mock.calls[0]
    expect(userPrompt).toContain("https://videos.pexels.com/1.mp4")
  })
})
