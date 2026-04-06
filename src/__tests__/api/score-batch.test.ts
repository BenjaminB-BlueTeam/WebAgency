/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/db", () => ({
  prisma: {
    prospect: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    activite: { create: vi.fn() },
  },
}))
vi.mock("@/lib/scoring", () => ({ scoreProspect: vi.fn() }))

import { POST } from "@/app/api/prospection/score-batch/route"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { scoreProspect } from "@/lib/scoring"

function makeReq(body: unknown) {
  return new Request("http://localhost/api/prospection/score-batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

const mockProspect = {
  id: "p1",
  siteUrl: "https://example.com",
  activite: "Boulangerie",
  ville: "Lille",
  noteGoogle: 4.5,
  nbAvisGoogle: 30,
}

const mockScores = {
  scorePresenceWeb: 3,
  scoreSEO: 6,
  scoreDesign: 5,
  scoreFinancier: 7,
  scorePotentiel: 8,
  scoreGlobal: 6,
}

describe("POST /api/prospection/score-batch", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(undefined)
    vi.mocked(prisma.prospect.findUnique).mockResolvedValue(mockProspect as any)
    vi.mocked(prisma.prospect.update).mockResolvedValue({} as any)
    vi.mocked(prisma.activite.create).mockResolvedValue({} as any)
    vi.mocked(scoreProspect).mockResolvedValue(mockScores)
  })

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"))
    const res = await POST(makeReq({ prospectIds: ["p1"] }) as any)
    expect(res.status).toBe(401)
  })

  it("returns 400 when prospectIds is missing", async () => {
    const res = await POST(makeReq({}) as any)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/prospectIds/)
  })

  it("returns 400 when prospectIds is not an array", async () => {
    const res = await POST(makeReq({ prospectIds: "p1" }) as any)
    expect(res.status).toBe(400)
  })

  it("returns 400 when prospectIds is an empty array", async () => {
    const res = await POST(makeReq({ prospectIds: [] }) as any)
    expect(res.status).toBe(400)
  })

  it("returns scores for valid prospectIds", async () => {
    const res = await POST(makeReq({ prospectIds: ["p1"] }) as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.scores).toHaveLength(1)
    expect(json.data.scores[0]).toEqual({ id: "p1", scoreGlobal: 6 })
  })

  it("calls scoreProspect with prospect data", async () => {
    await POST(makeReq({ prospectIds: ["p1"] }) as any)
    expect(vi.mocked(scoreProspect)).toHaveBeenCalledWith({
      siteUrl: mockProspect.siteUrl,
      activite: mockProspect.activite,
      ville: mockProspect.ville,
      noteGoogle: mockProspect.noteGoogle,
      nbAvisGoogle: mockProspect.nbAvisGoogle,
    })
  })

  it("updates prospect with score data after scoring", async () => {
    await POST(makeReq({ prospectIds: ["p1"] }) as any)
    expect(vi.mocked(prisma.prospect.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "p1" },
        data: expect.objectContaining({ scoreGlobal: 6 }),
      })
    )
  })

  it("returns null scoreGlobal when prospect not found", async () => {
    vi.mocked(prisma.prospect.findUnique).mockResolvedValue(null)
    const res = await POST(makeReq({ prospectIds: ["unknown"] }) as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.scores[0]).toEqual({ id: "unknown", scoreGlobal: null })
  })

  it("returns null scoreGlobal when scoring throws (graceful error handling)", async () => {
    vi.mocked(scoreProspect).mockRejectedValue(new Error("API key missing"))
    const res = await POST(makeReq({ prospectIds: ["p1"] }) as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.scores[0]).toEqual({ id: "p1", scoreGlobal: null })
  })

  it("processes multiple prospect IDs and returns scores for each", async () => {
    vi.mocked(prisma.prospect.findUnique)
      .mockResolvedValueOnce({ ...mockProspect, id: "p1" } as any)
      .mockResolvedValueOnce({ ...mockProspect, id: "p2" } as any)
    vi.mocked(scoreProspect)
      .mockResolvedValueOnce({ ...mockScores, scoreGlobal: 7 })
      .mockResolvedValueOnce({ ...mockScores, scoreGlobal: 4 })

    const res = await POST(makeReq({ prospectIds: ["p1", "p2"] }) as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.scores).toHaveLength(2)
    expect(json.data.scores[0]).toEqual({ id: "p1", scoreGlobal: 7 })
    expect(json.data.scores[1]).toEqual({ id: "p2", scoreGlobal: 4 })
  })
})
