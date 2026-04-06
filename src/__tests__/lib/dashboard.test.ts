/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  prisma: {
    prospect: {
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    activite: {
      findMany: vi.fn(),
    },
  },
}))

import { getDashboardStats, getDashboardRelances, getDashboardActivites } from "@/lib/dashboard"
import { prisma } from "@/lib/db"

describe("getDashboardStats", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns zero counts when no prospects", async () => {
    vi.mocked(prisma.prospect.groupBy).mockResolvedValue([] as any)
    const stats = await getDashboardStats()
    expect(stats.totalProspects).toBe(0)
    expect(stats.aDemarcher).toBe(0)
    expect(stats.maquettesEnvoyees).toBe(0)
    expect(stats.clientsSignes).toBe(0)
    expect(stats.tauxConversion).toBe(0)
  })

  it("calculates tauxConversion excluding A_DEMARCHER from denominator", async () => {
    vi.mocked(prisma.prospect.groupBy).mockResolvedValue([
      { statutPipeline: "A_DEMARCHER", _count: { _all: 6 } },
      { statutPipeline: "NEGOCIATION", _count: { _all: 2 } },
      { statutPipeline: "CLIENT", _count: { _all: 2 } },
    ] as any)
    const stats = await getDashboardStats()
    expect(stats.totalProspects).toBe(10)
    expect(stats.clientsSignes).toBe(2)
    // denominator = 10 - 6 (A_DEMARCHER) = 4 → 2/4 = 50%
    expect(stats.tauxConversion).toBe(50)
  })

  it("returns pipeline with 7 entries, zero-filling missing statuts", async () => {
    vi.mocked(prisma.prospect.groupBy).mockResolvedValue([
      { statutPipeline: "A_DEMARCHER", _count: { _all: 5 } },
    ] as any)
    const stats = await getDashboardStats()
    expect(stats.pipeline).toHaveLength(7)
    expect(stats.pipeline[0].statut).toBe("A_DEMARCHER")
    expect(stats.pipeline[0].count).toBe(5)
    expect(stats.pipeline[1].count).toBe(0)
  })

  it("counts maquettesEnvoyees from MAQUETTE_EMAIL_ENVOYES statut", async () => {
    vi.mocked(prisma.prospect.groupBy).mockResolvedValue([
      { statutPipeline: "MAQUETTE_EMAIL_ENVOYES", _count: { _all: 3 } },
    ] as any)
    const stats = await getDashboardStats()
    expect(stats.maquettesEnvoyees).toBe(3)
  })
})

describe("getDashboardRelances", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns count=0 when no relances due", async () => {
    vi.mocked(prisma.prospect.findMany).mockResolvedValue([] as any)
    const result = await getDashboardRelances()
    expect(result.count).toBe(0)
    expect(result.prospects).toHaveLength(0)
  })

  it("returns prospects due for relance", async () => {
    const past = new Date(Date.now() - 86400000)
    vi.mocked(prisma.prospect.findMany).mockResolvedValue([
      { id: "p1", nom: "Garage Martin", activite: "Garagiste", ville: "Steenvoorde", prochaineRelance: past },
    ] as any)
    const result = await getDashboardRelances()
    expect(result.count).toBe(1)
    expect(result.prospects[0].id).toBe("p1")
    expect(result.prospects[0].prochaineRelance).toBe(past.toISOString())
  })

  it("queries with lte:now and excludes CLIENT and PERDU", async () => {
    vi.mocked(prisma.prospect.findMany).mockResolvedValue([] as any)
    await getDashboardRelances()
    const call = vi.mocked(prisma.prospect.findMany).mock.calls[0][0] as any
    expect(call.where.prochaineRelance.lte).toBeInstanceOf(Date)
    expect(call.where.statutPipeline).toEqual({ notIn: ["CLIENT", "PERDU"] })
  })
})

describe("getDashboardActivites", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns activites with prospectNom", async () => {
    vi.mocked(prisma.activite.findMany).mockResolvedValue([
      {
        id: "a1",
        type: "EMAIL",
        description: "Email envoyé",
        createdAt: new Date("2024-01-01T10:00:00Z"),
        prospectId: "p1",
        prospect: { nom: "Garage Martin" },
      },
    ] as any)
    const result = await getDashboardActivites()
    expect(result).toHaveLength(1)
    expect(result[0].prospectNom).toBe("Garage Martin")
    expect(result[0].type).toBe("EMAIL")
    expect(result[0].createdAt).toBe("2024-01-01T10:00:00.000Z")
  })

  it("returns prospectNom=null for orphaned activites", async () => {
    vi.mocked(prisma.activite.findMany).mockResolvedValue([
      {
        id: "a2",
        type: "RECHERCHE",
        description: "Recherche Places",
        createdAt: new Date("2024-01-01T10:00:00Z"),
        prospectId: null,
        prospect: null,
      },
    ] as any)
    const result = await getDashboardActivites()
    expect(result[0].prospectNom).toBeNull()
  })

  it("fetches max 10 activites ordered by createdAt desc", async () => {
    vi.mocked(prisma.activite.findMany).mockResolvedValue([] as any)
    await getDashboardActivites()
    const call = vi.mocked(prisma.activite.findMany).mock.calls[0][0] as any
    expect(call.take).toBe(10)
    expect(call.orderBy).toEqual({ createdAt: "desc" })
  })
})
