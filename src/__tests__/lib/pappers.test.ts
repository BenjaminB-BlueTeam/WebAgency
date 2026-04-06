import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Mock anthropic before importing pappers
vi.mock("@/lib/anthropic", () => ({
  analyzeWithClaude: vi.fn(),
}))

import { matchPappers } from "@/lib/maquette/pappers"
import { analyzeWithClaude } from "@/lib/anthropic"

// ─── Helpers ────────────────────────────────────────────────────────────────

const makePappersResult = (overrides: Record<string, unknown> = {}) => ({
  siret: "12345678900012",
  siren: "123456789",
  nom_entreprise: "Boulangerie Dupont",
  nom_commercial: null,
  dirigeants: [{ nom: "DUPONT", prenom: "Jean" }],
  date_creation: "1998-03-15",
  forme_juridique: "SARL",
  finances: [{ chiffre_affaires: 150000, resultat_net: 12000, effectifs: "5 à 9 salariés" }],
  code_naf: "10.71C",
  libelle_code_naf: "Boulangerie et boulangerie-pâtisserie",
  siege: {
    adresse_ligne_1: "12 Rue du Four",
    code_postal: "59670",
    ville: "Cassel",
    latitude: 50.7998,
    longitude: 2.4867,
  },
  statut_rcs: "inscrit",
  convention_collective_info: null,
  ...overrides,
})

const makeSearchResponse = (results: unknown[] = [makePappersResult()]) => ({
  resultats: results,
})

const makeDetailResponse = (overrides: Record<string, unknown> = {}) => ({
  ...makePappersResult(overrides),
})

const prospect = {
  nom: "Boulangerie Dupont",
  activite: "boulangerie",
  adresse: "12 Rue du Four, 59670 Cassel",
  ville: "Cassel",
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("matchPappers", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("PAPPERS_API_KEY", "test-key")
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it("retourne null si PAPPERS_API_KEY est absent", async () => {
    vi.stubEnv("PAPPERS_API_KEY", "")
    const result = await matchPappers(prospect)
    expect(result).toBeNull()
  })

  it("Niveau 1 — trouve un match par nom + code postal (levenshtein proche)", async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal("fetch", mockFetch)

    // Search result
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => makeSearchResponse(),
    })
    // Detail fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => makeDetailResponse(),
    })

    const result = await matchPappers(prospect)

    expect(result).not.toBeNull()
    expect(result?.matchMethod).toBe("nom")
    expect(result?.matchConfidence).toBe("high")
    expect(result?.siret).toBe("12345678900012")
    expect(result?.denominationSociale).toBe("Boulangerie Dupont")
    expect(result?.anciennete).toMatch(/\d+ ans/)
    expect(result?.codeNAF).toBe("10.71C")
  })

  it("Niveau 1 échoue (0 résultats) → tente Niveau 2", async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal("fetch", mockFetch)

    // Level 1: no results
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => makeSearchResponse([]),
    })
    // Level 2 search: one result
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () =>
        makeSearchResponse([
          makePappersResult({
            siege: {
              adresse_ligne_1: "12 Rue du Four",
              code_postal: "59670",
              ville: "Cassel",
              latitude: 50.7998,
              longitude: 2.4867,
            },
          }),
        ]),
    })
    // Detail
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => makeDetailResponse(),
    })

    const result = await matchPappers(prospect)

    expect(result).not.toBeNull()
    expect(result?.matchMethod).toBe("naf_cp")
    expect(result?.matchConfidence).toBe("medium")
  })

  it("Niveau 2 trouve un match → matchMethod naf_cp, matchConfidence medium", async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal("fetch", mockFetch)

    // Level 1: no results
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => makeSearchResponse([]),
    })
    // Level 2: match
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => makeSearchResponse(),
    })
    // Detail
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => makeDetailResponse(),
    })

    const result = await matchPappers(prospect)
    expect(result?.matchMethod).toBe("naf_cp")
    expect(result?.matchConfidence).toBe("medium")
  })

  it("Niveau 2 échoue → tente Niveau 3", async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal("fetch", mockFetch)

    // Level 1: no results
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => makeSearchResponse([]) })
    // Level 2: no results
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => makeSearchResponse([]) })
    // Level 3: match
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => makeSearchResponse() })
    // Detail
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => makeDetailResponse() })

    const result = await matchPappers(prospect)
    expect(result?.matchMethod).toBe("adresse")
    expect(result?.matchConfidence).toBe("medium")
  })

  it("Niveau 3 trouve un match → matchMethod adresse", async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal("fetch", mockFetch)

    // Level 1: no
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => makeSearchResponse([]) })
    // Level 2: no
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => makeSearchResponse([]) })
    // Level 3: match
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => makeSearchResponse() })
    // Detail
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => makeDetailResponse() })

    const result = await matchPappers(prospect)
    expect(result?.matchMethod).toBe("adresse")
  })

  it("Niveau 4 trouve un match → matchMethod departement, matchConfidence low", async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal("fetch", mockFetch)

    // Level 1: no
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => makeSearchResponse([]) })
    // Level 2: no
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => makeSearchResponse([]) })
    // Level 3: no
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => makeSearchResponse([]) })
    // Level 4: match
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => makeSearchResponse() })
    // Detail
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => makeDetailResponse() })

    const result = await matchPappers(prospect)
    expect(result?.matchMethod).toBe("departement")
    expect(result?.matchConfidence).toBe("low")
  })

  it("Niveau 5 — Claude trouve un match → matchMethod claude, matchConfidence low", async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal("fetch", mockFetch)

    // Levels 1-4: no results
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => makeSearchResponse([]) }) // L1
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => makeSearchResponse([]) }) // L2
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => makeSearchResponse([]) }) // L3
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => makeSearchResponse([]) }) // L4

    // Claude returns a variante
    vi.mocked(analyzeWithClaude).mockResolvedValue(JSON.stringify({ variantes: ["variante_nom"] }))

    // Level 5 search with variante: returns a matching result
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => makeSearchResponse([makePappersResult({ nom_entreprise: "variante_nom" })]),
    })
    // Detail fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => makeDetailResponse({ nom_entreprise: "variante_nom" }),
    })

    const result = await matchPappers(prospect)

    expect(result).not.toBeNull()
    expect(result?.matchMethod).toBe("claude")
    expect(result?.matchConfidence).toBe("low")
    expect(result?.siret).toBe("12345678900012")
  })

  it("Tous les niveaux échouent → retourne null", async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal("fetch", mockFetch)

    // Levels 1-4: no results
    mockFetch.mockResolvedValue({ ok: true, json: async () => makeSearchResponse([]) })

    // Level 5: Claude returns no useful variants
    vi.mocked(analyzeWithClaude).mockResolvedValue(JSON.stringify({ variantes: [] }))

    const result = await matchPappers({
      nom: "XYZNOTFOUND",
      activite: "boulangerie",
      adresse: "1 rue Inexistante, 59670 Cassel",
      ville: "Cassel",
    })

    expect(result).toBeNull()
  })
})

// ─── Helper unit tests ───────────────────────────────────────────────────────

describe("extractCodePostal", () => {
  it("extrait correctement 59670 de '8 Grand Place, 59670 Cassel'", async () => {
    // We test via matchPappers behavior indirectly, but we also export the helper
    const { extractCodePostal } = await import("@/lib/maquette/pappers")
    expect(extractCodePostal("8 Grand Place, 59670 Cassel")).toBe("59670")
    expect(extractCodePostal("12 Rue du Four")).toBeNull()
  })
})

describe("activiteToNAF", () => {
  it("retourne 43.22A pour plombier", async () => {
    const { activiteToNAF } = await import("@/lib/maquette/pappers")
    expect(activiteToNAF("plombier")).toBe("43.22A")
    expect(activiteToNAF("plomberie")).toBe("43.22A")
    expect(activiteToNAF("boulangerie")).toBe("10.71C")
    expect(activiteToNAF("inconnu xyz")).toBeNull()
  })
})
