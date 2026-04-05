import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/db", () => ({
  prisma: {
    prospect: { findUnique: vi.fn() },
    maquette: { create: vi.fn() },
    activite: { create: vi.fn() },
  },
}))
vi.mock("@/lib/stitch", () => ({
  generateMaquette: vi.fn().mockResolvedValue({
    screens: [
      { name: "accueil", html: "<html>accueil</html>" },
      { name: "services", html: "<html>services</html>" },
      { name: "contact", html: "<html>contact</html>" },
      { name: "a-propos", html: "<html>a-propos</html>" },
    ],
    projectId: "proj-123",
    promptUsed: "Design plombier",
  }),
}))
vi.mock("@/lib/netlify-deploy", () => ({
  deployToNetlify: vi.fn().mockResolvedValue({
    url: "https://fwa-test.netlify.app",
    siteId: "site-abc",
  }),
}))

import { POST } from "@/app/api/maquettes/generate/route"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

const baseMockProspect = {
  id: "prospect-1",
  nom: "Plomberie Martin",
  activite: "Plombier",
  ville: "Steenvoorde",
  telephone: null,
  siteUrl: null,
  maquettes: [],
  analyses: [],
}

function makeRequest(body: object) {
  return new NextRequest("http://localhost/api/maquettes/generate", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

describe("POST /api/maquettes/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(prisma.prospect.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(baseMockProspect)
    ;(prisma.maquette.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "maq-1",
      demoUrl: "https://fwa-test.netlify.app",
      version: 1,
    })
    ;(prisma.activite.create as ReturnType<typeof vi.fn>).mockResolvedValue({})
  })

  it("returns 400 if prospectId is missing", async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
  })

  it("returns 400 if prospectId is not a string", async () => {
    const res = await POST(makeRequest({ prospectId: 123 }))
    expect(res.status).toBe(400)
  })

  it("returns 401 if not authenticated", async () => {
    ;(requireAuth as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Unauthorized"))
    const res = await POST(makeRequest({ prospectId: "prospect-1" }))
    expect(res.status).toBe(401)
  })

  it("returns 404 if prospect not found", async () => {
    ;(prisma.prospect.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    const res = await POST(makeRequest({ prospectId: "unknown" }))
    expect(res.status).toBe(404)
  })

  it("returns 409 if 3 maquettes already exist", async () => {
    ;(prisma.prospect.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseMockProspect,
      maquettes: [{ id: "1" }, { id: "2" }, { id: "3" }],
    })
    const res = await POST(makeRequest({ prospectId: "prospect-1" }))
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toContain("maximum")
  })

  it("returns 200 with id, demoUrl, version on success", async () => {
    const res = await POST(makeRequest({ prospectId: "prospect-1" }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.demoUrl).toBe("https://fwa-test.netlify.app")
    expect(json.data.version).toBe(1)
    expect(json.data.id).toBeDefined()
  })

  it("creates an activite with type MAQUETTE", async () => {
    await POST(makeRequest({ prospectId: "prospect-1" }))
    expect(prisma.activite.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "MAQUETTE", prospectId: "prospect-1" }),
      })
    )
  })

  it("saves maquette with statut BROUILLON", async () => {
    await POST(makeRequest({ prospectId: "prospect-1" }))
    expect(prisma.maquette.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ statut: "BROUILLON", prospectId: "prospect-1" }),
      })
    )
  })

  it("passes existingSiteId to deployToNetlify when prospect has a previous maquette", async () => {
    const { deployToNetlify } = await import("@/lib/netlify-deploy")
    ;(prisma.prospect.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseMockProspect,
      maquettes: [{ id: "m1", netlifySiteId: "site-existing" }],
    })
    await POST(makeRequest({ prospectId: "prospect-1" }))
    expect(deployToNetlify).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      "site-existing"
    )
  })
})
