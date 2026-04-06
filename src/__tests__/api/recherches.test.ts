import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/lib/db", () => ({
  prisma: {
    recherche: {
      findMany: vi.fn(),
      delete: vi.fn(),
    },
  },
  isNotFoundError: (err: unknown) => {
    // Mirror actual implementation: Prisma P2025 = not found
    if (
      err !== null &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2025"
    ) {
      return true
    }
    return false
  },
}))

import { GET } from "@/app/api/recherches/route"
import { DELETE } from "@/app/api/recherches/[id]/route"
import { prisma } from "@/lib/db"

const mockRecherche = prisma.recherche as unknown as {
  findMany: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

describe("GET /api/recherches", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns last 10 searches ordered by createdAt desc", async () => {
    const entries = [
      { id: "r1", query: "plombier", ville: "Cassel", rayon: 10000, createdAt: new Date("2026-04-01") },
    ]
    mockRecherche.findMany.mockResolvedValue(entries)

    const response = await GET()
    const json = await response.json() as { data: unknown[] }

    expect(response.status).toBe(200)
    expect(json.data).toHaveLength(1)
    expect(mockRecherche.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10, orderBy: { createdAt: "desc" } })
    )
  })
})

describe("DELETE /api/recherches/[id]", () => {
  beforeEach(() => vi.clearAllMocks())

  it("deletes the specified search entry", async () => {
    mockRecherche.delete.mockResolvedValue({ id: "r1" })

    const request = new Request("http://localhost/api/recherches/r1", { method: "DELETE" })
    const response = await DELETE(request as Parameters<typeof DELETE>[0], { params: Promise.resolve({ id: "r1" }) })
    const json = await response.json() as { data: { deleted: boolean } }

    expect(response.status).toBe(200)
    expect(json.data.deleted).toBe(true)
  })

  it("returns 404 if not found", async () => {
    const { Prisma } = await import("@prisma/client")
    mockRecherche.delete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Not found", { code: "P2025", clientVersion: "5.0.0", meta: {} })
    )

    const request = new Request("http://localhost/api/recherches/bad-id", { method: "DELETE" })
    const response = await DELETE(request as Parameters<typeof DELETE>[0], { params: Promise.resolve({ id: "bad-id" }) })

    expect(response.status).toBe(404)
  })
})
