/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/dashboard", () => ({
  getDashboardStats: vi.fn(),
  getDashboardRelances: vi.fn(),
  getDashboardActivites: vi.fn(),
}))

import { GET as statsGET } from "@/app/api/dashboard/stats/route"
import { GET as relancesGET } from "@/app/api/dashboard/relances/route"
import { GET as activitesGET } from "@/app/api/dashboard/activites/route"
import { requireAuth } from "@/lib/auth"
import { getDashboardStats, getDashboardRelances, getDashboardActivites } from "@/lib/dashboard"

const mockStats = {
  totalProspects: 10,
  aDemarcher: 5,
  maquettesEnvoyees: 3,
  clientsSignes: 2,
  tauxConversion: 20,
  pipeline: [],
}

const mockRelances = { count: 1, prospects: [{ id: "p1", nom: "Test", activite: "X", ville: "Y", prochaineRelance: "2024-01-01T00:00:00.000Z" }] }
const mockActivites = [{ id: "a1", type: "EMAIL", description: "Email envoyé", createdAt: "2024-01-01T00:00:00.000Z", prospectId: "p1", prospectNom: "Garage Martin" }]

function makeReq(url: string) {
  return new Request(url, { method: "GET" })
}

describe("GET /api/dashboard/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(undefined)
    vi.mocked(getDashboardStats).mockResolvedValue(mockStats)
  })

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"))
    const res = await statsGET(makeReq("http://localhost/api/dashboard/stats") as any)
    expect(res.status).toBe(401)
  })

  it("returns 200 with stats data", async () => {
    const res = await statsGET(makeReq("http://localhost/api/dashboard/stats") as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.totalProspects).toBe(10)
    expect(json.data.tauxConversion).toBe(20)
  })
})

describe("GET /api/dashboard/relances", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(undefined)
    vi.mocked(getDashboardRelances).mockResolvedValue(mockRelances)
  })

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"))
    const res = await relancesGET(makeReq("http://localhost/api/dashboard/relances") as any)
    expect(res.status).toBe(401)
  })

  it("returns 200 with relances data", async () => {
    const res = await relancesGET(makeReq("http://localhost/api/dashboard/relances") as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.count).toBe(1)
    expect(json.data.prospects).toHaveLength(1)
  })
})

describe("GET /api/dashboard/activites", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(undefined)
    vi.mocked(getDashboardActivites).mockResolvedValue(mockActivites)
  })

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"))
    const res = await activitesGET(makeReq("http://localhost/api/dashboard/activites") as any)
    expect(res.status).toBe(401)
  })

  it("returns 200 with activites data", async () => {
    const res = await activitesGET(makeReq("http://localhost/api/dashboard/activites") as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toHaveLength(1)
    expect(json.data[0].type).toBe("EMAIL")
  })
})
