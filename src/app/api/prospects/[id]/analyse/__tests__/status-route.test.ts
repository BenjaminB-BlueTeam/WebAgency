/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn().mockResolvedValue({ id: "u1" }) }))
vi.mock("@/lib/db", () => ({
  prisma: { analyseJob: { findUnique: vi.fn() } },
}))

import { GET } from "@/app/api/prospects/[id]/analyse/status/[jobId]/route"
import { prisma } from "@/lib/db"

describe("GET /api/prospects/[id]/analyse/status/[jobId]", () => {
  beforeEach(() => vi.clearAllMocks())

  it("404 si job introuvable", async () => {
    ;(prisma.analyseJob.findUnique as any).mockResolvedValue(null)
    const res = await GET(new Request("http://x") as any, {
      params: Promise.resolve({ id: "p1", jobId: "nope" }),
    })
    expect(res.status).toBe(404)
  })

  it("403 si job ne correspond pas au prospect", async () => {
    ;(prisma.analyseJob.findUnique as any).mockResolvedValue({
      id: "j1",
      prospectId: "other",
      statut: "running",
      etapes: "[]",
      resultat: null,
      erreur: null,
    })
    const res = await GET(new Request("http://x") as any, {
      params: Promise.resolve({ id: "p1", jobId: "j1" }),
    })
    expect(res.status).toBe(403)
  })

  it("retourne statut + étapes parsées", async () => {
    ;(prisma.analyseJob.findUnique as any).mockResolvedValue({
      id: "j1",
      prospectId: "p1",
      statut: "running",
      etapes: JSON.stringify([{ nom: "search_competitors", statut: "running" }]),
      resultat: null,
      erreur: null,
    })
    const res = await GET(new Request("http://x") as any, {
      params: Promise.resolve({ id: "p1", jobId: "j1" }),
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.statut).toBe("running")
    expect(json.data.etapes).toHaveLength(1)
    expect(json.data.etapes[0].nom).toBe("search_competitors")
  })

  it("parse le resultat quand done", async () => {
    ;(prisma.analyseJob.findUnique as any).mockResolvedValue({
      id: "j1",
      prospectId: "p1",
      statut: "done",
      etapes: "[]",
      resultat: JSON.stringify({ concurrents: [], synthese: "s", recommandations: [] }),
      erreur: null,
    })
    const res = await GET(new Request("http://x") as any, {
      params: Promise.resolve({ id: "p1", jobId: "j1" }),
    })
    const json = await res.json()
    expect(json.data.resultat.synthese).toBe("s")
  })
})
