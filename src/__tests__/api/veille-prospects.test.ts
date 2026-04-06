import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))

const { mockNouveauProspect, mockProspect } = vi.hoisted(() => {
  const mockNouveauProspect = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
  }
  const mockProspect = {
    create: vi.fn(),
    update: vi.fn(),
  }
  return { mockNouveauProspect, mockProspect }
})

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>()
  return {
    ...actual,
    prisma: {
      nouveauProspect: mockNouveauProspect,
      prospect: mockProspect,
    },
  }
})

vi.mock("@/lib/scoring", () => ({
  scoreProspect: vi.fn().mockResolvedValue({
    scorePresenceWeb: 10,
    scoreSEO: null,
    scoreDesign: null,
    scoreFinancier: null,
    scorePotentiel: null,
    scoreGlobal: null,
  }),
}))

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { GET as getVeille } from "@/app/api/veille-prospects/route"
import { POST as postAjouter } from "@/app/api/veille-prospects/[id]/ajouter/route"
import { GET as getCron } from "@/app/api/cron/veille-prospects/route"
import { requireAuth } from "@/lib/auth"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockNouveauProspectData = {
  id: "np-1",
  siren: "123456789",
  nom: "Boulangerie Martin",
  activite: "Boulangerie",
  codeNAF: "10.71C",
  ville: "Lille",
  dateCreation: new Date("2026-04-05"),
  ajouteComme: false,
  prospectId: null,
  createdAt: new Date("2026-04-06"),
}

function makeRequest(url: string, options?: { method?: string; headers?: Record<string, string> }) {
  const { method = "GET", headers = {} } = options ?? {}
  return new Request(url, { method, headers })
}

// ─── Tests: GET /api/veille-prospects ─────────────────────────────────────────

describe("GET /api/veille-prospects", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(undefined)
    mockNouveauProspect.findMany.mockResolvedValue([mockNouveauProspectData])
  })

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"))
    const res = await getVeille()
    expect(res.status).toBe(401)
  })

  it("returns filtered list where ajouteComme=false", async () => {
    const res = await getVeille()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toHaveLength(1)
    expect(json.data[0].siren).toBe("123456789")

    expect(mockNouveauProspect.findMany).toHaveBeenCalledWith({
      where: { ajouteComme: false },
      orderBy: { dateCreation: "desc" },
      take: 20,
    })
  })
})

// ─── Tests: POST /api/veille-prospects/[id]/ajouter ───────────────────────────

describe("POST /api/veille-prospects/[id]/ajouter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(undefined)
    mockNouveauProspect.findUnique.mockResolvedValue(mockNouveauProspectData)
    mockProspect.create.mockResolvedValue({ id: "prospect-new", nom: "Boulangerie Martin", activite: "Boulangerie", ville: "Lille" })
    mockNouveauProspect.update.mockResolvedValue({ ...mockNouveauProspectData, ajouteComme: true, prospectId: "prospect-new" })
    mockProspect.update.mockResolvedValue({})
  })

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"))
    const req = makeRequest("http://localhost/api/veille-prospects/np-1/ajouter", { method: "POST" })
    const res = await postAjouter(req, { params: Promise.resolve({ id: "np-1" }) })
    expect(res.status).toBe(401)
  })

  it("returns 404 when NouveauProspect not found", async () => {
    mockNouveauProspect.findUnique.mockResolvedValue(null)
    const req = makeRequest("http://localhost/api/veille-prospects/np-999/ajouter", { method: "POST" })
    const res = await postAjouter(req, { params: Promise.resolve({ id: "np-999" }) })
    expect(res.status).toBe(404)
  })

  it("creates Prospect and marks NouveauProspect as added", async () => {
    const req = makeRequest("http://localhost/api/veille-prospects/np-1/ajouter", { method: "POST" })
    const res = await postAjouter(req, { params: Promise.resolve({ id: "np-1" }) })
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.data.prospectId).toBe("prospect-new")

    expect(mockProspect.create).toHaveBeenCalledWith({
      data: {
        nom: "Boulangerie Martin",
        activite: "Boulangerie",
        ville: "Lille",
      },
    })
    expect(mockNouveauProspect.update).toHaveBeenCalledWith({
      where: { id: "np-1" },
      data: { ajouteComme: true, prospectId: "prospect-new" },
    })
  })

  it("returns 409 when already added", async () => {
    mockNouveauProspect.findUnique.mockResolvedValue({
      ...mockNouveauProspectData,
      ajouteComme: true,
      prospectId: "existing-prospect",
    })
    const req = makeRequest("http://localhost/api/veille-prospects/np-1/ajouter", { method: "POST" })
    const res = await postAjouter(req, { params: Promise.resolve({ id: "np-1" }) })
    expect(res.status).toBe(409)
  })
})

// ─── Tests: GET /api/cron/veille-prospects ────────────────────────────────────

describe("GET /api/cron/veille-prospects", () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv, CRON_SECRET: "test-secret", PAPPERS_API_KEY: "pappers-key" }
    mockNouveauProspect.upsert.mockResolvedValue({})
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    process.env = originalEnv
    vi.unstubAllGlobals()
  })

  it("returns 401 without correct CRON_SECRET", async () => {
    const req = makeRequest("http://localhost/api/cron/veille-prospects", {
      headers: { authorization: "Bearer wrong-secret" },
    })
    const res = await getCron(req)
    expect(res.status).toBe(401)
  })

  it("returns 401 with missing authorization header", async () => {
    const req = makeRequest("http://localhost/api/cron/veille-prospects")
    const res = await getCron(req)
    expect(res.status).toBe(401)
  })

  it("fetches Pappers and upserts NouveauProspect", async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        entreprises: [
          {
            siren: "987654321",
            nom_entreprise: "Plomberie Dupont",
            libelle_code_naf: "Travaux de plomberie",
            code_naf: "43.22A",
            siege: { ville: "Roubaix" },
            date_creation: "2026-04-05",
          },
        ],
      }),
    } as Response)

    const req = makeRequest("http://localhost/api/cron/veille-prospects", {
      headers: { authorization: "Bearer test-secret" },
    })
    const res = await getCron(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.found).toBe(1)
    expect(json.data.inserted).toBe(1)

    expect(mockNouveauProspect.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { siren: "987654321" },
        update: {},
        create: expect.objectContaining({
          siren: "987654321",
          nom: "Plomberie Dupont",
          ville: "Roubaix",
          codeNAF: "43.22A",
        }),
      })
    )
  })

  it("returns error when Pappers fetch fails", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 429,
    } as Response)

    const req = makeRequest("http://localhost/api/cron/veille-prospects", {
      headers: { authorization: "Bearer test-secret" },
    })
    const res = await getCron(req)
    expect(res.status).toBe(502)
  })
})
