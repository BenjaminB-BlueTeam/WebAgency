// src/__tests__/api/email-generate.test.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/db", () => ({
  prisma: {
    prospect: { findUnique: vi.fn() },
    email: { create: vi.fn() },
  },
}))
vi.mock("@/lib/email", () => ({
  generateProspectionEmail: vi.fn(),
  buildEmailHtml: vi.fn(),
}))

import { POST } from "@/app/api/prospects/[id]/email/generate/route"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { generateProspectionEmail, buildEmailHtml } from "@/lib/email"

const params = Promise.resolve({ id: "p1" })
function makeReq() {
  return new Request("http://localhost/api/prospects/p1/email/generate", { method: "POST" })
}

const mockProspect = {
  id: "p1",
  nom: "Garage Martin",
  activite: "garagiste",
  ville: "Steenvoorde",
  email: "martin@garage.fr",
  telephone: "03 28 50 94 90",
  maquettes: [],
  analyses: [],
}

describe("POST /api/prospects/[id]/email/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(undefined)
    vi.mocked(prisma.prospect.findUnique).mockResolvedValue(mockProspect as any)
    vi.mocked(generateProspectionEmail).mockResolvedValue({ sujet: "Votre site web", corps: "Bonjour Martin" })
    vi.mocked(buildEmailHtml).mockReturnValue("<html>preview</html>")
    vi.mocked(prisma.email.create).mockResolvedValue({
      id: "e1", sujet: "Votre site web", contenu: "<html>preview</html>", statut: "BROUILLON",
    } as any)
  })

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"))
    const res = await POST(makeReq() as any, { params })
    expect(res.status).toBe(401)
  })

  it("returns 404 when prospect not found", async () => {
    vi.mocked(prisma.prospect.findUnique).mockResolvedValue(null)
    const res = await POST(makeReq() as any, { params })
    expect(res.status).toBe(404)
  })

  it("returns 200 with id, sujet, contenu, htmlPreview", async () => {
    const res = await POST(makeReq() as any, { params })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.id).toBe("e1")
    expect(json.data.sujet).toBe("Votre site web")
    expect(json.data.corps).toBe("Bonjour Martin")
    expect(json.data.htmlPreview).toBe("<html>preview</html>")
  })

  it("creates email with type PROSPECTION and statut BROUILLON", async () => {
    await POST(makeReq() as any, { params })
    expect(vi.mocked(prisma.email.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "PROSPECTION", statut: "BROUILLON" }),
      })
    )
  })

  it("passes last maquette demoUrl to buildEmailHtml", async () => {
    vi.mocked(prisma.prospect.findUnique).mockResolvedValue({
      ...mockProspect,
      maquettes: [{ id: "m1", demoUrl: "https://test.netlify.app", version: 1, createdAt: new Date() }],
    } as any)
    await POST(makeReq() as any, { params })
    expect(vi.mocked(buildEmailHtml)).toHaveBeenCalledWith(
      "Bonjour Martin",
      expect.anything(),
      "https://test.netlify.app"
    )
  })

  it("passes relance:false to generateProspectionEmail when no body", async () => {
    await POST(makeReq() as any, { params })
    const calls = vi.mocked(generateProspectionEmail).mock.calls
    expect(calls[0][3]).toBe(false)
  })

  it("passes relance:true to generateProspectionEmail when body has relance:true", async () => {
    const req = new Request("http://localhost/api/prospects/p1/email/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ relance: true }),
    })
    await POST(req as any, { params })
    const calls = vi.mocked(generateProspectionEmail).mock.calls
    expect(calls[0][3]).toBe(true)
  })
})
