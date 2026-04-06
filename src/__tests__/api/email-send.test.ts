// src/__tests__/api/email-send.test.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/db", () => ({
  prisma: {
    prospect: { findUnique: vi.fn(), update: vi.fn() },
    email: { findUnique: vi.fn(), update: vi.fn() },
    activite: { create: vi.fn() },
  },
}))
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
  buildEmailHtml: vi.fn(),
}))
vi.mock("@/lib/relance-writer", () => ({ refreshProchainRelance: vi.fn().mockResolvedValue(undefined) }))

import { POST } from "@/app/api/prospects/[id]/email/send/route"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { sendEmail, buildEmailHtml } from "@/lib/email"
import { refreshProchainRelance } from "@/lib/relance-writer"

const params = Promise.resolve({ id: "p1" })
function makeReq(body = { emailId: "e1", sujet: "Votre site web", corps: "Bonjour Martin" }) {
  return new Request("http://localhost/api/prospects/p1/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

const mockProspect = {
  id: "p1",
  nom: "Garage Martin",
  activite: "garagiste",
  ville: "Steenvoorde",
  email: "martin@garage.fr",
  telephone: "03 28 50 94 90",
  statutPipeline: "A_DEMARCHER",
  maquettes: [],
}

const mockEmail = {
  id: "e1",
  prospectId: "p1",
  sujet: "Votre site web",
  contenu: "<html>...</html>",
  statut: "BROUILLON",
}

describe("POST /api/prospects/[id]/email/send", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(undefined)
    vi.mocked(prisma.prospect.findUnique).mockResolvedValue(mockProspect as any)
    vi.mocked(prisma.email.findUnique).mockResolvedValue(mockEmail as any)
    vi.mocked(buildEmailHtml).mockReturnValue("<html>rebuilt</html>")
    vi.mocked(sendEmail).mockResolvedValue(true)
    vi.mocked(prisma.email.update).mockResolvedValue({} as any)
    vi.mocked(prisma.activite.create).mockResolvedValue({} as any)
    vi.mocked(prisma.prospect.update).mockResolvedValue({} as any)
  })

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"))
    const res = await POST(makeReq() as any, { params })
    expect(res.status).toBe(401)
  })

  it("returns 400 when emailId is missing", async () => {
    const res = await POST(makeReq({ emailId: "", sujet: "S", corps: "C" }) as any, { params })
    expect(res.status).toBe(400)
  })

  it("returns 404 when prospect not found", async () => {
    vi.mocked(prisma.prospect.findUnique).mockResolvedValue(null)
    const res = await POST(makeReq() as any, { params })
    expect(res.status).toBe(404)
  })

  it("returns 400 when prospect has no email address", async () => {
    vi.mocked(prisma.prospect.findUnique).mockResolvedValue({ ...mockProspect, email: null } as any)
    const res = await POST(makeReq() as any, { params })
    expect(res.status).toBe(400)
  })

  it("returns 404 when email not found", async () => {
    vi.mocked(prisma.email.findUnique).mockResolvedValue(null)
    const res = await POST(makeReq() as any, { params })
    expect(res.status).toBe(404)
  })

  it("returns 400 when email already sent", async () => {
    vi.mocked(prisma.email.findUnique).mockResolvedValue({ ...mockEmail, statut: "ENVOYE" } as any)
    const res = await POST(makeReq() as any, { params })
    expect(res.status).toBe(400)
  })

  it("returns 502 when Resend fails", async () => {
    vi.mocked(sendEmail).mockResolvedValue(false)
    const res = await POST(makeReq() as any, { params })
    expect(res.status).toBe(502)
  })

  it("returns 200 on success", async () => {
    const res = await POST(makeReq() as any, { params })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.success).toBe(true)
  })

  it("updates email to ENVOYE with new sujet and rebuilt HTML", async () => {
    await POST(makeReq() as any, { params })
    expect(vi.mocked(prisma.email.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ statut: "ENVOYE", sujet: "Votre site web", contenu: "<html>rebuilt</html>" }),
      })
    )
  })

  it("creates EMAIL activite", async () => {
    await POST(makeReq() as any, { params })
    expect(vi.mocked(prisma.activite.create)).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: "EMAIL" }) })
    )
  })

  it("updates pipeline to MAQUETTE_EMAIL_ENVOYES when was A_DEMARCHER", async () => {
    await POST(makeReq() as any, { params })
    expect(vi.mocked(prisma.prospect.update)).toHaveBeenCalledWith(
      expect.objectContaining({ data: { statutPipeline: "MAQUETTE_EMAIL_ENVOYES" } })
    )
  })

  it("does not update pipeline when was not A_DEMARCHER", async () => {
    vi.mocked(prisma.prospect.findUnique).mockResolvedValue({ ...mockProspect, statutPipeline: "REPONDU" } as any)
    await POST(makeReq() as any, { params })
    expect(vi.mocked(prisma.prospect.update)).not.toHaveBeenCalled()
  })

  it("calls refreshProchainRelance after successful send", async () => {
    const res = await POST(makeReq() as any, { params })
    expect(res.status).toBe(200)
    expect(vi.mocked(refreshProchainRelance)).toHaveBeenCalledWith("p1")
  })
})
