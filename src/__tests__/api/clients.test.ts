import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(),
}))

const { mockClient, mockProspect } = vi.hoisted(() => {
  const mockClient = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }
  const mockProspect = {
    findUnique: vi.fn(),
  }
  return { mockClient, mockProspect }
})

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>()
  return {
    ...actual,
    prisma: {
      client: mockClient,
      prospect: mockProspect,
    },
  }
})

import { GET, POST } from "@/app/api/clients/route"
import { GET as GET_ID, PATCH, DELETE } from "@/app/api/clients/[id]/route"
import { requireAuth } from "@/lib/auth"
import { Prisma } from "@prisma/client"
import { validateClientCreate, validateClientUpdate } from "@/lib/validation"

function makeRequest(
  url: string,
  options?: { method?: string; body?: Record<string, unknown> }
): NextRequest {
  const { method = "GET", body } = options ?? {}
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method,
    ...(body ? { body: JSON.stringify(body) } : {}),
    headers: body ? { "Content-Type": "application/json" } : {},
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(requireAuth).mockResolvedValue(undefined)
})

describe("validateClientCreate (unitaire)", () => {
  it("valide un payload correct", () => {
    const { data, errors } = validateClientCreate({
      prospectId: "p1",
      siteUrl: "https://exemple.fr",
      offreType: "VITRINE",
      dateLivraison: "2026-04-07",
    })
    expect(errors).toEqual({})
    expect(data?.prospectId).toBe("p1")
    expect(data?.offreType).toBe("VITRINE")
    expect(data?.dateLivraison).toBeInstanceOf(Date)
  })

  it("rejette URL invalide", () => {
    const { data, errors } = validateClientCreate({
      prospectId: "p1",
      siteUrl: "pas une url",
      offreType: "VITRINE",
      dateLivraison: "2026-04-07",
    })
    expect(data).toBeNull()
    expect(errors.siteUrl).toBeDefined()
  })

  it("rejette offreType inconnu", () => {
    const { errors } = validateClientCreate({
      prospectId: "p1",
      siteUrl: "https://exemple.fr",
      offreType: "AUTRE",
      dateLivraison: "2026-04-07",
    })
    expect(errors.offreType).toBeDefined()
  })

  it("rejette date invalide", () => {
    const { errors } = validateClientCreate({
      prospectId: "p1",
      siteUrl: "https://exemple.fr",
      offreType: "VITRINE",
      dateLivraison: "pas une date",
    })
    expect(errors.dateLivraison).toBeDefined()
  })
})

describe("validateClientUpdate (unitaire)", () => {
  it("accepte la mise à jour de maintenanceActive seule", () => {
    const { data, errors } = validateClientUpdate({ maintenanceActive: false })
    expect(errors).toEqual({})
    expect(data?.maintenanceActive).toBe(false)
  })

  it("ignore les champs hors allowlist", () => {
    const { data } = validateClientUpdate({
      maintenanceActive: true,
      prospectId: "injecté",
      id: "injecté",
      dateLivraison: "2099-01-01",
    } as Record<string, unknown>)
    expect(data).toEqual({ maintenanceActive: true })
  })

  it("retourne _general si rien à modifier", () => {
    const { data, errors } = validateClientUpdate({})
    expect(data).toBeNull()
    expect(errors._general).toBeDefined()
  })
})

describe("POST /api/clients", () => {
  it("retourne 401 sans auth", async () => {
    vi.mocked(requireAuth).mockRejectedValueOnce(new Error("Unauthorized"))
    const req = makeRequest("http://localhost:3000/api/clients", {
      method: "POST",
      body: {
        prospectId: "p1",
        siteUrl: "https://x.fr",
        offreType: "VITRINE",
        dateLivraison: "2026-04-07",
      },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it("retourne 400 sur payload invalide", async () => {
    const req = makeRequest("http://localhost:3000/api/clients", {
      method: "POST",
      body: { prospectId: "p1" },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect(mockClient.create).not.toHaveBeenCalled()
  })

  it("retourne 400 si prospect introuvable", async () => {
    mockProspect.findUnique.mockResolvedValue(null)
    const req = makeRequest("http://localhost:3000/api/clients", {
      method: "POST",
      body: {
        prospectId: "p1",
        siteUrl: "https://x.fr",
        offreType: "VITRINE",
        dateLivraison: "2026-04-07",
      },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect(mockClient.create).not.toHaveBeenCalled()
  })

  it("crée un client (201) avec allowlist stricte", async () => {
    mockProspect.findUnique.mockResolvedValue({ id: "p1" })
    const created = {
      id: "c1",
      prospectId: "p1",
      siteUrl: "https://x.fr",
      offreType: "VITRINE",
      dateLivraison: new Date("2026-04-07"),
      maintenanceActive: true,
      prospect: { id: "p1", nom: "X" },
    }
    mockClient.create.mockResolvedValue(created)

    const req = makeRequest("http://localhost:3000/api/clients", {
      method: "POST",
      body: {
        prospectId: "p1",
        siteUrl: "https://x.fr",
        offreType: "VITRINE",
        dateLivraison: "2026-04-07",
        id: "injecté",
        stripeCustomerId: "cus_inj",
      },
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const callArg = mockClient.create.mock.calls[0][0] as { data: Record<string, unknown> }
    expect(callArg.data).not.toHaveProperty("id")
    expect(callArg.data).not.toHaveProperty("stripeCustomerId")
    expect(callArg.data.prospectId).toBe("p1")
    expect(callArg.data.offreType).toBe("VITRINE")
  })

  it("retourne 409 si prospect déjà client (P2002)", async () => {
    mockProspect.findUnique.mockResolvedValue({ id: "p1" })
    mockClient.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("UNIQUE constraint failed", {
        code: "P2002",
        clientVersion: "7.0.0",
      })
    )
    const req = makeRequest("http://localhost:3000/api/clients", {
      method: "POST",
      body: {
        prospectId: "p1",
        siteUrl: "https://x.fr",
        offreType: "VITRINE",
        dateLivraison: "2026-04-07",
      },
    })
    const res = await POST(req)
    expect(res.status).toBe(409)
  })
})

describe("GET /api/clients", () => {
  it("retourne 401 sans auth", async () => {
    vi.mocked(requireAuth).mockRejectedValueOnce(new Error("Unauthorized"))
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it("liste les clients avec prospect", async () => {
    mockClient.findMany.mockResolvedValue([{ id: "c1" }])
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toHaveLength(1)
    expect(mockClient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ include: { prospect: true } })
    )
  })
})

describe("GET /api/clients/[id]", () => {
  it("404 si introuvable", async () => {
    mockClient.findUnique.mockResolvedValue(null)
    const res = await GET_ID(makeRequest("http://localhost:3000/api/clients/c1"), {
      params: Promise.resolve({ id: "c1" }),
    })
    expect(res.status).toBe(404)
  })

  it("200 si trouvé", async () => {
    mockClient.findUnique.mockResolvedValue({ id: "c1" })
    const res = await GET_ID(makeRequest("http://localhost:3000/api/clients/c1"), {
      params: Promise.resolve({ id: "c1" }),
    })
    expect(res.status).toBe(200)
  })
})

describe("PATCH /api/clients/[id]", () => {
  it("met à jour avec allowlist (ignore prospectId)", async () => {
    mockClient.update.mockResolvedValue({ id: "c1", maintenanceActive: false })
    const req = makeRequest("http://localhost:3000/api/clients/c1", {
      method: "PATCH",
      body: { maintenanceActive: false, prospectId: "injecté" },
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: "c1" }) })
    expect(res.status).toBe(200)
    const callArg = mockClient.update.mock.calls[0][0] as { data: Record<string, unknown> }
    expect(callArg.data).not.toHaveProperty("prospectId")
    expect(callArg.data.maintenanceActive).toBe(false)
  })

  it("400 si aucun champ valide", async () => {
    const req = makeRequest("http://localhost:3000/api/clients/c1", {
      method: "PATCH",
      body: {},
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: "c1" }) })
    expect(res.status).toBe(400)
  })

  it("404 si client introuvable (P2025)", async () => {
    mockClient.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Not found", {
        code: "P2025",
        clientVersion: "7.0.0",
      })
    )
    const req = makeRequest("http://localhost:3000/api/clients/c1", {
      method: "PATCH",
      body: { maintenanceActive: false },
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: "c1" }) })
    expect(res.status).toBe(404)
  })
})

describe("DELETE /api/clients/[id]", () => {
  it("supprime un client", async () => {
    mockClient.delete.mockResolvedValue({ id: "c1" })
    const res = await DELETE(makeRequest("http://localhost:3000/api/clients/c1"), {
      params: Promise.resolve({ id: "c1" }),
    })
    expect(res.status).toBe(200)
  })

  it("404 si client introuvable", async () => {
    mockClient.delete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Not found", {
        code: "P2025",
        clientVersion: "7.0.0",
      })
    )
    const res = await DELETE(makeRequest("http://localhost:3000/api/clients/c1"), {
      params: Promise.resolve({ id: "c1" }),
    })
    expect(res.status).toBe(404)
  })
})
