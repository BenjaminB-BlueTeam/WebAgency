/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/db", () => ({
  prisma: {
    prospect: { findUnique: vi.fn() },
    maquette: { create: vi.fn() },
    activite: { create: vi.fn() },
  },
}))
vi.mock("@/lib/maquette/investigate", () => ({
  investigate: vi.fn(),
}))
vi.mock("@/lib/maquette/build-prompt", () => ({
  buildMaquettePrompt: vi.fn(),
}))
vi.mock("@/lib/maquette/generate-site", () => ({
  generateSiteCode: vi.fn(),
}))
vi.mock("@/lib/netlify-deploy", () => ({
  deployToNetlify: vi.fn(),
}))

import { POST as POSTPrompt } from "@/app/api/maquettes/generate/prompt/route"
import { POST } from "@/app/api/maquettes/generate/route"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { investigate } from "@/lib/maquette/investigate"
import { buildMaquettePrompt } from "@/lib/maquette/build-prompt"
import { generateSiteCode } from "@/lib/maquette/generate-site"
import { deployToNetlify } from "@/lib/netlify-deploy"

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const mockProspect = {
  id: "prospect-1",
  nom: "Plomberie Dupont",
  activite: "Plombier",
  ville: "Hazebrouck",
  adresse: "12 rue de la Paix",
  telephone: "0320001122",
  email: null,
  siteUrl: "https://plomberie-dupont.fr",
  noteGoogle: 4.5,
  nbAvisGoogle: 32,
  analyses: [],
  maquettes: [],
}

const mockInvestigation = {
  prospect: {
    id: "prospect-1",
    nom: "Plomberie Dupont",
    activite: "Plombier",
    ville: "Hazebrouck",
    adresse: "12 rue de la Paix",
    telephone: "0320001122",
    siteUrl: "https://plomberie-dupont.fr",
    noteGoogle: 4.5,
    nbAvisGoogle: 32,
  },
  siteIdentity: {
    colors: ["#003366", "#ffffff"],
    fonts: ["Arial"],
    logoUrl: "https://plomberie-dupont.fr/logo.png",
    styleDescription: "Professionnel",
    slogan: null,
    services: ["Installation", "Dépannage"],
    tarifs: null,
    horaires: null,
    equipe: null,
    temoignages: [],
    certifications: [],
    zoneIntervention: null,
    historique: null,
    faq: null,
    galerieUrls: [],
    moyensPaiement: [],
  },
  pappersData: null,
  pexelsImages: [
    "https://images.pexels.com/photos/1/photo1.jpg",
    "https://images.pexels.com/photos/2/photo2.jpg",
  ],
  pexelsVideo: {
    videoUrl: "https://videos.pexels.com/video-1.mp4",
    duration: 15,
  },
  clientPerception: null,
  analyse: null,
}

const mockPrompt =
  "## CONTENU\nPlombier Hazebrouck\n## DESIGN\nBleu professionnel\n## SEO\nPlombier Hazebrouck"

const mockSiteFiles = {
  files: [{ path: "index.html", content: "<html>...</html>" }],
}

const mockDeployResult = {
  url: "https://fwa-test.netlify.app",
  siteId: "site-1",
}

const mockMaquette = {
  id: "maquette-1",
  demoUrl: "https://fwa-test.netlify.app",
  version: 1,
}

const mockContext = {
  pexelsImages: mockInvestigation.pexelsImages,
  pexelsVideoUrl: "https://videos.pexels.com/video-1.mp4",
  logoUrl: "https://plomberie-dupont.fr/logo.png",
  identity: mockInvestigation.siteIdentity,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePromptReq(body: Record<string, unknown>) {
  return new Request("http://localhost/api/maquettes/generate/prompt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function makeGenerateReq(body: Record<string, unknown>) {
  return new Request("http://localhost/api/maquettes/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

// ─── POST /api/maquettes/generate/prompt ──────────────────────────────────────

describe("POST /api/maquettes/generate/prompt", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(undefined)
    vi.mocked(prisma.prospect.findUnique).mockResolvedValue(mockProspect as any)
    vi.mocked(investigate).mockResolvedValue(mockInvestigation as any)
    vi.mocked(buildMaquettePrompt).mockResolvedValue(mockPrompt)
  })

  it("retourne 400 si prospectId manquant", async () => {
    const res = await POSTPrompt(makePromptReq({}) as any)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  it("retourne 404 si prospect introuvable", async () => {
    vi.mocked(prisma.prospect.findUnique).mockResolvedValue(null)
    const res = await POSTPrompt(makePromptReq({ prospectId: "prospect-1" }) as any)
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe("Prospect introuvable")
  })

  it("retourne le prompt et le context quand le prospect existe", async () => {
    const res = await POSTPrompt(makePromptReq({ prospectId: "prospect-1" }) as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.prompt).toBe(mockPrompt)
    expect(json.data.context.pexelsImages).toEqual(mockInvestigation.pexelsImages)
    expect(json.data.context.pexelsVideoUrl).toBe("https://videos.pexels.com/video-1.mp4")
    expect(json.data.context.logoUrl).toBe("https://plomberie-dupont.fr/logo.png")
    expect(json.data.context.identity).toBeDefined()
  })

  it("retourne 401 si non authentifié", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"))
    const res = await POSTPrompt(makePromptReq({ prospectId: "prospect-1" }) as any)
    expect(res.status).toBe(401)
  })
})

// ─── POST /api/maquettes/generate ─────────────────────────────────────────────

describe("POST /api/maquettes/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(undefined)
    vi.mocked(prisma.prospect.findUnique).mockResolvedValue(mockProspect as any)
    vi.mocked(generateSiteCode).mockResolvedValue(mockSiteFiles)
    vi.mocked(deployToNetlify).mockResolvedValue(mockDeployResult)
    vi.mocked(prisma.maquette.create).mockResolvedValue(mockMaquette as any)
    vi.mocked(prisma.activite.create).mockResolvedValue({ id: "act-1" } as any)
  })

  it("retourne 400 si prompt manquant", async () => {
    const res = await POST(
      makeGenerateReq({ prospectId: "prospect-1", context: mockContext }) as any
    )
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  it("retourne 404 si prospect introuvable", async () => {
    vi.mocked(prisma.prospect.findUnique).mockResolvedValue(null)
    const res = await POST(
      makeGenerateReq({ prospectId: "prospect-1", prompt: mockPrompt, context: mockContext }) as any
    )
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe("Prospect introuvable")
  })

  it("retourne 409 si 3 maquettes déjà créées", async () => {
    vi.mocked(prisma.prospect.findUnique).mockResolvedValue({
      ...mockProspect,
      maquettes: [
        { id: "m1", netlifySiteId: "s1" },
        { id: "m2", netlifySiteId: "s2" },
        { id: "m3", netlifySiteId: "s3" },
      ],
    } as any)
    const res = await POST(
      makeGenerateReq({ prospectId: "prospect-1", prompt: mockPrompt, context: mockContext }) as any
    )
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toBe("Nombre maximum de maquettes atteint")
  })

  it("génère le site, déploie, sauvegarde et retourne id/demoUrl/version", async () => {
    const res = await POST(
      makeGenerateReq({ prospectId: "prospect-1", prompt: mockPrompt, context: mockContext }) as any
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.id).toBe("maquette-1")
    expect(json.data.demoUrl).toBe("https://fwa-test.netlify.app")
    expect(json.data.version).toBe(1)

    expect(generateSiteCode).toHaveBeenCalledWith(mockPrompt, expect.objectContaining({
      pexelsImages: mockContext.pexelsImages,
    }))
    expect(deployToNetlify).toHaveBeenCalledWith(
      mockSiteFiles.files,
      "Plomberie Dupont",
      "Hazebrouck",
      null
    )
    expect(prisma.maquette.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          prospectId: "prospect-1",
          demoUrl: "https://fwa-test.netlify.app",
          netlifySiteId: "site-1",
          version: 1,
          promptUsed: mockPrompt,
          statut: "BROUILLON",
        }),
      })
    )
    expect(prisma.activite.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "MAQUETTE",
          description: "Maquette v1 générée",
        }),
      })
    )
  })

  it("retourne 401 si non authentifié", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"))
    const res = await POST(
      makeGenerateReq({ prospectId: "prospect-1", prompt: mockPrompt, context: mockContext }) as any
    )
    expect(res.status).toBe(401)
  })
})
