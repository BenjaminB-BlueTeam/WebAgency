// src/__tests__/api/emails-list.test.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/db", () => ({
  prisma: { prospect: { findMany: vi.fn() } },
}))
vi.mock("@/lib/relance", () => ({
  computeRelance: vi.fn().mockReturnValue({ due: false, urgente: false, joursRetard: 0 }),
}))

import { GET } from "@/app/api/emails/route"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { computeRelance } from "@/lib/relance"

function makeProspect(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    nom: "Test",
    activite: "Boulanger",
    ville: "Bailleul",
    email: "test@test.fr",
    statutPipeline: "A_DEMARCHER",
    prochaineRelance: null,
    updatedAt: new Date(),
    emails: [],
    ...overrides,
  }
}

describe("GET /api/emails", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(undefined)
    vi.mocked(prisma.prospect.findMany).mockResolvedValue([] as any)
    vi.mocked(computeRelance).mockReturnValue({ due: false, urgente: false, joursRetard: 0 })
  })

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"))
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it("excludes CLIENT and PERDU prospects", async () => {
    await GET()
    expect(vi.mocked(prisma.prospect.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { statutPipeline: { notIn: ["CLIENT", "PERDU"] } },
      })
    )
  })

  it("returns 200 with data array", async () => {
    vi.mocked(prisma.prospect.findMany).mockResolvedValue([makeProspect()] as any)
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json.data)).toBe(true)
    expect(json.data).toHaveLength(1)
  })

  it("returns relance from computeRelance", async () => {
    vi.mocked(prisma.prospect.findMany).mockResolvedValue([makeProspect()] as any)
    vi.mocked(computeRelance).mockReturnValue({ due: true, urgente: false, joursRetard: 3 })
    const res = await GET()
    const json = await res.json()
    expect(json.data[0].relance).toEqual({ due: true, urgente: false, joursRetard: 3 })
  })

  it("returns dernierEmail null when no emails", async () => {
    vi.mocked(prisma.prospect.findMany).mockResolvedValue([makeProspect()] as any)
    const res = await GET()
    const json = await res.json()
    expect(json.data[0].dernierEmail).toBeNull()
  })

  it("returns dernierEmail with last ENVOYE email", async () => {
    const email = {
      id: "e1", sujet: "Mon email", statut: "ENVOYE",
      dateEnvoi: new Date("2026-01-01"), contenu: "", type: "PROSPECTION",
      prospectId: "p1", createdAt: new Date(),
    }
    vi.mocked(prisma.prospect.findMany).mockResolvedValue([
      makeProspect({ emails: [email] }),
    ] as any)
    const res = await GET()
    const json = await res.json()
    expect(json.data[0].dernierEmail.sujet).toBe("Mon email")
  })

  it("sorts urgentes before dues before normal", async () => {
    const normal = makeProspect({ id: "p1" })
    const due = makeProspect({ id: "p2" })
    const urgente = makeProspect({ id: "p3" })

    vi.mocked(prisma.prospect.findMany).mockResolvedValue([normal, due, urgente] as any)
    vi.mocked(computeRelance)
      .mockReturnValueOnce({ due: false, urgente: false, joursRetard: 0 })
      .mockReturnValueOnce({ due: true, urgente: false, joursRetard: 3 })
      .mockReturnValueOnce({ due: true, urgente: true, joursRetard: 10 })

    const res = await GET()
    const json = await res.json()
    expect(json.data.map((d: any) => d.id)).toEqual(["p3", "p2", "p1"])
  })
})
