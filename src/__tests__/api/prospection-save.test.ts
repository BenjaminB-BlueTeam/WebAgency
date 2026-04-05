import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/db", () => ({
  prisma: {
    prospect: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    activite: { create: vi.fn() },
    recherche: { update: vi.fn() },
  },
}))

import { POST } from "@/app/api/prospection/save/route"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"

function makeReq(body: unknown) {
  return new Request("http://localhost/api/prospection/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

const mockPlace = {
  placeId: "ChIJ123",
  nom: "Boulangerie Martin",
  adresse: "12 rue de la Paix, 59000 Lille, France",
  types: ["bakery"],
  telephone: "03 20 00 11 22",
  siteUrl: null,
  noteGoogle: 4.5,
  nbAvisGoogle: 30,
}

describe("POST /api/prospection/save", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(undefined)
    vi.mocked(prisma.prospect.findMany).mockResolvedValue([])
    vi.mocked(prisma.prospect.create).mockResolvedValue({ id: "p1" } as any)
    vi.mocked(prisma.activite.create).mockResolvedValue({} as any)
    vi.mocked(prisma.recherche.update).mockResolvedValue({} as any)
  })

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"))
    const res = await POST(makeReq({ rechercheId: "r1", prospects: [mockPlace] }) as any)
    expect(res.status).toBe(401)
  })

  it("returns 400 when rechercheId is missing", async () => {
    const res = await POST(makeReq({ prospects: [mockPlace] }) as any)
    expect(res.status).toBe(400)
  })

  it("returns 400 when prospects is empty array", async () => {
    const res = await POST(makeReq({ rechercheId: "r1", prospects: [] }) as any)
    expect(res.status).toBe(400)
  })

  it("returns 400 when prospects is not an array", async () => {
    const res = await POST(makeReq({ rechercheId: "r1", prospects: "not-array" }) as any)
    expect(res.status).toBe(400)
  })

  it("returns 200 with saved=1 skipped=0 for a new prospect", async () => {
    const res = await POST(makeReq({ rechercheId: "r1", prospects: [mockPlace] }) as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.saved).toBe(1)
    expect(json.data.skipped).toBe(0)
  })

  it("skips prospect when placeId already exists in DB", async () => {
    vi.mocked(prisma.prospect.findMany).mockResolvedValue([
      { placeId: "ChIJ123" } as any,
    ])
    const res = await POST(makeReq({ rechercheId: "r1", prospects: [mockPlace] }) as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.saved).toBe(0)
    expect(json.data.skipped).toBe(1)
    expect(vi.mocked(prisma.prospect.create)).not.toHaveBeenCalled()
  })

  it("creates a RECHERCHE activite for each saved prospect", async () => {
    const res = await POST(makeReq({ rechercheId: "r1", prospects: [mockPlace] }) as any)
    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.activite.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "RECHERCHE" }),
      })
    )
  })

  it("updates recherche.prospectsAjoutes when prospects are saved", async () => {
    const res = await POST(makeReq({ rechercheId: "r1", prospects: [mockPlace] }) as any)
    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.recherche.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "r1" },
        data: { prospectsAjoutes: { increment: 1 } },
      })
    )
  })

  it("does not update recherche when all prospects are skipped", async () => {
    vi.mocked(prisma.prospect.findMany).mockResolvedValue([
      { placeId: "ChIJ123" } as any,
    ])
    await POST(makeReq({ rechercheId: "r1", prospects: [mockPlace] }) as any)
    expect(vi.mocked(prisma.recherche.update)).not.toHaveBeenCalled()
  })
})
