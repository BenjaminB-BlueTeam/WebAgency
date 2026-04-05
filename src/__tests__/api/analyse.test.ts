/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/db", () => ({
  prisma: {
    prospect: { findUnique: vi.fn() },
    analyse: { upsert: vi.fn() },
    activite: { create: vi.fn() },
  },
}))
vi.mock("@/lib/analyse", () => ({
  findCompetitorCandidates: vi.fn(),
  scrapeCompetitors: vi.fn(),
  buildAnalyseResult: vi.fn(),
}))

import { POST } from "@/app/api/prospects/[id]/analyse/route"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { findCompetitorCandidates, scrapeCompetitors, buildAnalyseResult } from "@/lib/analyse"

const mockProspect = {
  id: "prospect-1",
  nom: "Garage Martin",
  activite: "Garagiste",
  ville: "Steenvoorde",
  placeId: "place-1",
}

const mockAnalyseResult = {
  concurrents: [
    {
      nom: "Concurrent A",
      siteUrl: "https://a.com",
      forces: ["Bon site"],
      faiblesses: ["Pas de tarifs"],
      positionnement: "Généraliste",
    },
  ],
  synthese: "Marché local peu concurrentiel",
  recommandations: ["Mettre en avant les délais rapides"],
}

const mockDbAnalyse = {
  id: "analyse-1",
  prospectId: "prospect-1",
  concurrents: JSON.stringify(mockAnalyseResult.concurrents),
  recommandations: JSON.stringify({
    synthese: mockAnalyseResult.synthese,
    points: mockAnalyseResult.recommandations,
  }),
  createdAt: new Date("2024-01-01"),
}

function makeReq() {
  return new Request("http://localhost/api/prospects/prospect-1/analyse", { method: "POST" })
}

describe("POST /api/prospects/[id]/analyse", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(undefined)
    vi.mocked(prisma.prospect.findUnique).mockResolvedValue(mockProspect as any)
    vi.mocked(findCompetitorCandidates).mockResolvedValue([])
    vi.mocked(scrapeCompetitors).mockResolvedValue([])
    vi.mocked(buildAnalyseResult).mockResolvedValue(mockAnalyseResult)
    vi.mocked(prisma.analyse.upsert).mockResolvedValue(mockDbAnalyse as any)
    vi.mocked(prisma.activite.create).mockResolvedValue({ id: "act-1" } as any)
  })

  it("retourne 401 si non authentifié", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"))
    const res = await POST(makeReq() as any, { params: Promise.resolve({ id: "prospect-1" }) })
    expect(res.status).toBe(401)
  })

  it("retourne 404 si prospect introuvable", async () => {
    vi.mocked(prisma.prospect.findUnique).mockResolvedValue(null)
    const res = await POST(makeReq() as any, { params: Promise.resolve({ id: "prospect-1" }) })
    expect(res.status).toBe(404)
  })

  it("retourne 200 avec les données de l'analyse", async () => {
    const res = await POST(makeReq() as any, { params: Promise.resolve({ id: "prospect-1" }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.id).toBe("analyse-1")
    expect(json.data.concurrents).toHaveLength(1)
    expect(json.data.synthese).toBe("Marché local peu concurrentiel")
    expect(json.data.recommandations).toHaveLength(1)
  })

  it("appelle prisma.analyse.upsert avec where: { prospectId }", async () => {
    await POST(makeReq() as any, { params: Promise.resolve({ id: "prospect-1" }) })
    expect(prisma.analyse.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { prospectId: "prospect-1" } })
    )
  })

  it("crée une activité ANALYSE avec le bon prospectId", async () => {
    await POST(makeReq() as any, { params: Promise.resolve({ id: "prospect-1" }) })
    expect(prisma.activite.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "ANALYSE", prospectId: "prospect-1" }),
      })
    )
  })

  it("description activité contient le nombre de concurrents", async () => {
    await POST(makeReq() as any, { params: Promise.resolve({ id: "prospect-1" }) })
    const call = vi.mocked(prisma.activite.create).mock.calls[0][0] as any
    expect(call.data.description).toContain("1 concurrent")
  })
})
