/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/db", () => ({
  prisma: {
    maquette: { findUnique: vi.fn(), update: vi.fn() },
    activite: { create: vi.fn() },
  },
}))
vi.mock("@/lib/maquette/adjust-site", () => ({
  adjustSiteCode: vi.fn(),
}))
vi.mock("@/lib/netlify-deploy", () => ({
  deployToNetlify: vi.fn(),
}))

import { POST } from "@/app/api/maquettes/[id]/adjust/route"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { adjustSiteCode } from "@/lib/maquette/adjust-site"
import { deployToNetlify } from "@/lib/netlify-deploy"

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockFiles = [
  { path: "index.html", content: "<html><body>Test</body></html>" },
  { path: "css/style.css", content: "body { margin: 0; }" },
]

const mockMaquette = {
  id: "maquette-1",
  prospectId: "prospect-1",
  html: JSON.stringify(mockFiles),
  demoUrl: "https://fwa-test.netlify.app",
  netlifySiteId: "site-1",
  version: 1,
  statut: "BROUILLON",
  prospect: {
    id: "prospect-1",
    nom: "Plomberie Dupont",
    ville: "Hazebrouck",
  },
}

const mockAdjustedFiles = {
  files: [
    { path: "index.html", content: "<html><body>Test modifié</body></html>" },
    { path: "css/style.css", content: "body { margin: 0; background: blue; }" },
  ],
}

const mockDeployResult = {
  url: "https://fwa-test.netlify.app",
  siteId: "site-1",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown>, maquetteId = "maquette-1") {
  return new Request(`http://localhost/api/maquettes/${maquetteId}/adjust`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function makeParams(id = "maquette-1") {
  return { params: Promise.resolve({ id }) }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/maquettes/[id]/adjust", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(undefined)
    vi.mocked(prisma.maquette.findUnique).mockResolvedValue(mockMaquette as any)
    vi.mocked(adjustSiteCode).mockResolvedValue(mockAdjustedFiles)
    vi.mocked(deployToNetlify).mockResolvedValue(mockDeployResult)
    vi.mocked(prisma.maquette.update).mockResolvedValue({ ...mockMaquette, demoUrl: mockDeployResult.url } as any)
    vi.mocked(prisma.activite.create).mockResolvedValue({ id: "act-1" } as any)
  })

  it("1. Returns 404 when maquette not found", async () => {
    vi.mocked(prisma.maquette.findUnique).mockResolvedValue(null)

    const res = await POST(
      makeRequest({ instructions: "Change la couleur en bleu" }) as any,
      makeParams()
    )

    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe("Maquette introuvable")
  })

  it("2. Returns 400 when instructions missing", async () => {
    const res = await POST(
      makeRequest({}) as any,
      makeParams()
    )

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  it("3. Calls adjustSiteCode + deployToNetlify + updates DB", async () => {
    const res = await POST(
      makeRequest({ instructions: "Change la couleur principale en bleu" }) as any,
      makeParams()
    )

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.demoUrl).toBe("https://fwa-test.netlify.app")

    expect(adjustSiteCode).toHaveBeenCalledWith(
      mockFiles,
      "Change la couleur principale en bleu"
    )
    expect(deployToNetlify).toHaveBeenCalledWith(
      mockAdjustedFiles.files,
      "Plomberie Dupont",
      "Hazebrouck",
      "site-1"
    )
    expect(prisma.maquette.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "maquette-1" },
        data: expect.objectContaining({
          html: JSON.stringify(mockAdjustedFiles.files),
          demoUrl: "https://fwa-test.netlify.app",
        }),
      })
    )
    expect(prisma.activite.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "MAQUETTE",
          description: expect.stringContaining("Ajustement:"),
        }),
      })
    )
  })

  it("4. Returns 401 if not authenticated", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"))

    const res = await POST(
      makeRequest({ instructions: "Change la couleur en bleu" }) as any,
      makeParams()
    )

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe("Non autorisé")
  })

  it("5. Returns 400 when instructions exceed 2000 chars", async () => {
    const res = await POST(
      makeRequest({ instructions: "a".repeat(2001) }) as any,
      makeParams()
    )

    expect(res.status).toBe(400)
  })

  it("6. Returns 400 when instructions is empty string", async () => {
    const res = await POST(
      makeRequest({ instructions: "   " }) as any,
      makeParams()
    )

    expect(res.status).toBe(400)
  })
})
