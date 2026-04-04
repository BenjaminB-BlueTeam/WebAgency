import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock auth — hoisted automatically by vitest
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(),
}))

// Mock Prisma with hoisting-safe approach using vi.hoisted
const { mockPrismaProspect, mockPrismaActivite, mockTransaction } = vi.hoisted(() => {
  const mockPrismaProspect = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }
  const mockPrismaActivite = {
    create: vi.fn(),
  }
  const mockTransaction = vi.fn()
  return { mockPrismaProspect, mockPrismaActivite, mockTransaction }
})

vi.mock("@/lib/db", () => ({
  prisma: {
    prospect: mockPrismaProspect,
    activite: mockPrismaActivite,
    $transaction: mockTransaction,
  },
}))

// Import routes AFTER mocks
import { GET, POST } from "@/app/api/prospects/route"
import { PATCH } from "@/app/api/prospects/[id]/route"
import { Prisma } from "@prisma/client"

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

// ─────────────────────────────────────────────────────────────────────────────
// Group 1: POST /api/prospects — validation (Task 7)
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/prospects — validation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("creates a prospect with valid data (nom+activite+ville) → 201", async () => {
    const created = {
      id: "clx123",
      nom: "Boulangerie Dupont",
      activite: "Boulangerie",
      ville: "Lille",
      statutPipeline: "A_DEMARCHER",
    }
    mockPrismaProspect.create.mockResolvedValue(created)

    const req = makeRequest("http://localhost:3000/api/prospects", {
      method: "POST",
      body: { nom: "Boulangerie Dupont", activite: "Boulangerie", ville: "Lille" },
    })
    const res = await POST(req)

    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.data).toEqual(created)
    expect(mockPrismaProspect.create).toHaveBeenCalledOnce()
  })

  it("returns 400 when nom is missing", async () => {
    const req = makeRequest("http://localhost:3000/api/prospects", {
      method: "POST",
      body: { activite: "Boulangerie", ville: "Lille" },
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toHaveProperty("nom")
    expect(mockPrismaProspect.create).not.toHaveBeenCalled()
  })

  it("returns 400 when activite is missing", async () => {
    const req = makeRequest("http://localhost:3000/api/prospects", {
      method: "POST",
      body: { nom: "Boulangerie Dupont", ville: "Lille" },
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toHaveProperty("activite")
    expect(mockPrismaProspect.create).not.toHaveBeenCalled()
  })

  it("returns 400 when ville is missing", async () => {
    const req = makeRequest("http://localhost:3000/api/prospects", {
      method: "POST",
      body: { nom: "Boulangerie Dupont", activite: "Boulangerie" },
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toHaveProperty("ville")
    expect(mockPrismaProspect.create).not.toHaveBeenCalled()
  })

  it("returns 409 on duplicate nom+ville (P2002)", async () => {
    mockPrismaProspect.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "7.0.0",
        meta: { target: ["nom", "ville"] },
      })
    )

    const req = makeRequest("http://localhost:3000/api/prospects", {
      method: "POST",
      body: { nom: "Boulangerie Dupont", activite: "Boulangerie", ville: "Lille" },
    })
    const res = await POST(req)

    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toBeTruthy()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Group 2: Allowlist (Task 8)
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/prospects — allowlist", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("ignores id, createdAt, scoreGlobal, updatedAt from body — not passed to prisma.create", async () => {
    const created = {
      id: "clx999",
      nom: "Test Prospect",
      activite: "Test",
      ville: "Paris",
      statutPipeline: "A_DEMARCHER",
    }
    mockPrismaProspect.create.mockResolvedValue(created)

    const req = makeRequest("http://localhost:3000/api/prospects", {
      method: "POST",
      body: {
        nom: "Test Prospect",
        activite: "Test",
        ville: "Paris",
        id: "injected-id",
        createdAt: "2020-01-01T00:00:00.000Z",
        scoreGlobal: 999,
        updatedAt: "2020-01-01T00:00:00.000Z",
      },
    })
    const res = await POST(req)

    expect(res.status).toBe(201)
    const callArg = mockPrismaProspect.create.mock.calls[0][0] as { data: Record<string, unknown> }
    expect(callArg.data).not.toHaveProperty("id")
    expect(callArg.data).not.toHaveProperty("createdAt")
    expect(callArg.data).not.toHaveProperty("scoreGlobal")
    expect(callArg.data).not.toHaveProperty("updatedAt")
  })
})

describe("PATCH /api/prospects/[id] — allowlist", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("ignores id, createdAt, scoreGlobal from body — not passed to prisma.update", async () => {
    mockPrismaProspect.findUnique.mockResolvedValue({
      id: "clx123",
      statutPipeline: "A_DEMARCHER",
    })
    const updated = {
      id: "clx123",
      nom: "Nouveau Nom",
      activite: "Boulangerie",
      ville: "Lille",
      statutPipeline: "A_DEMARCHER",
    }
    mockPrismaProspect.update.mockResolvedValue(updated)

    const req = makeRequest("http://localhost:3000/api/prospects/clx123", {
      method: "PATCH",
      body: {
        nom: "Nouveau Nom",
        id: "injected-id",
        createdAt: "2020-01-01T00:00:00.000Z",
        scoreGlobal: 999,
      },
    })
    const params = Promise.resolve({ id: "clx123" })
    const res = await PATCH(req, { params })

    expect(res.status).toBe(200)
    const callArg = mockPrismaProspect.update.mock.calls[0][0] as { data: Record<string, unknown> }
    expect(callArg.data).not.toHaveProperty("id")
    expect(callArg.data).not.toHaveProperty("createdAt")
    expect(callArg.data).not.toHaveProperty("scoreGlobal")
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Group 3: Search filter (Task 9)
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/prospects — search filter", () => {
  const mockProspects = [
    { id: "1", nom: "Boulangerie Dupont", activite: "Boulangerie", ville: "Lille", statutPipeline: "A_DEMARCHER" },
    { id: "2", nom: "Garage Martin", activite: "Garage automobile", ville: "Roubaix", statutPipeline: "CONTACTE" },
    { id: "3", nom: "Salon Beauté", activite: "Coiffure", ville: "Tourcoing", statutPipeline: "A_DEMARCHER" },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockPrismaProspect.findMany.mockResolvedValue(mockProspects)
  })

  it("search=boulang → matches 'Boulangerie Dupont' only", async () => {
    const req = makeRequest("http://localhost:3000/api/prospects?search=boulang")
    const res = await GET(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toHaveLength(1)
    expect(json.data[0].id).toBe("1")
  })

  it("search=lille → matches 'Lille' only (case insensitive)", async () => {
    const req = makeRequest("http://localhost:3000/api/prospects?search=lille")
    const res = await GET(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toHaveLength(1)
    expect(json.data[0].id).toBe("1")
  })

  it("search=garage → matches 'Garage automobile' via activite", async () => {
    const req = makeRequest("http://localhost:3000/api/prospects?search=garage")
    const res = await GET(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toHaveLength(1)
    expect(json.data[0].id).toBe("2")
  })

  it("search=xyz → returns empty array", async () => {
    const req = makeRequest("http://localhost:3000/api/prospects?search=xyz")
    const res = await GET(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toHaveLength(0)
  })
})
