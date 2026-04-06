import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/lib/places", () => ({
  searchPlaces: vi.fn().mockResolvedValue([]),
}))
vi.mock("@/lib/db", () => ({
  prisma: {
    prospect: { findMany: vi.fn().mockResolvedValue([]) },
    recherche: { create: vi.fn().mockResolvedValue({ id: "r1" }) },
  },
}))

import { POST } from "@/app/api/prospection/search/route"
import { searchPlaces } from "@/lib/places"

const mockSearchPlaces = searchPlaces as ReturnType<typeof vi.fn>

function makeReq(body: unknown) {
  return new Request("http://localhost/api/prospection/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("POST /api/prospection/search — optional query", () => {
  beforeEach(() => vi.clearAllMocks())

  it("uses 'entreprise' as default when query is empty string", async () => {
    const req = makeReq({ query: "", ville: "Lille", rayon: 10000 })
    const res = await POST(req as Parameters<typeof POST>[0])
    expect(res.status).toBe(200)
    const firstArg = mockSearchPlaces.mock.calls[0][0] as string
    expect(firstArg).toBe("entreprise")
  })

  it("uses 'entreprise' as default when query is missing", async () => {
    const req = makeReq({ ville: "Roubaix", rayon: 5000 })
    const res = await POST(req as Parameters<typeof POST>[0])
    expect(res.status).toBe(200)
    const firstArg = mockSearchPlaces.mock.calls[0][0] as string
    expect(firstArg).toBe("entreprise")
  })

  it("uses provided query 'boulangerie' as-is", async () => {
    const req = makeReq({ query: "boulangerie", ville: "Lille", rayon: 10000 })
    const res = await POST(req as Parameters<typeof POST>[0])
    expect(res.status).toBe(200)
    const firstArg = mockSearchPlaces.mock.calls[0][0] as string
    expect(firstArg).toBe("boulangerie")
  })
})
