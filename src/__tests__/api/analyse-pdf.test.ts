/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/db", () => ({
  prisma: {
    prospect: { findUnique: vi.fn() },
  },
}))
vi.mock("@react-pdf/renderer", () => ({
  renderToBuffer: vi.fn(async () => Buffer.from("%PDF-1.4 fake")),
  Document: () => null,
  Page: () => null,
  Text: () => null,
  View: () => null,
  StyleSheet: { create: (s: any) => s },
  Font: { registerHyphenationCallback: () => undefined },
}))

import { GET } from "@/app/api/prospects/[id]/analyse/pdf/route"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"

const mockProspect = {
  id: "prospect-1",
  nom: "Garage Martin",
  activite: "Garagiste",
  ville: "Steenvoorde",
  adresse: "12 rue de Cassel",
  telephone: "0320000000",
  noteGoogle: 4.5,
  analyses: [
    {
      id: "analyse-1",
      concurrents: JSON.stringify([
        {
          nom: "Concurrent A",
          siteUrl: "https://a.com",
          forces: ["Bon site"],
          faiblesses: ["Pas de tarifs"],
          positionnement: "Généraliste",
        },
      ]),
      recommandations: JSON.stringify({
        synthese: "Marché peu concurrentiel",
        points: ["Mettre en avant les délais"],
      }),
      createdAt: new Date("2024-01-01"),
    },
  ],
}

function makeReq() {
  return new Request("http://localhost/api/prospects/prospect-1/analyse/pdf")
}

describe("GET /api/prospects/[id]/analyse/pdf", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(undefined)
    vi.mocked(prisma.prospect.findUnique).mockResolvedValue(mockProspect as any)
  })

  it("retourne 401 si non authentifié", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"))
    const res = await GET(makeReq() as any, { params: Promise.resolve({ id: "prospect-1" }) })
    expect(res.status).toBe(401)
  })

  it("retourne 404 si prospect introuvable", async () => {
    vi.mocked(prisma.prospect.findUnique).mockResolvedValue(null)
    const res = await GET(makeReq() as any, { params: Promise.resolve({ id: "prospect-1" }) })
    expect(res.status).toBe(404)
  })

  it("retourne 404 si pas d'analyse", async () => {
    vi.mocked(prisma.prospect.findUnique).mockResolvedValue({
      ...mockProspect,
      analyses: [],
    } as any)
    const res = await GET(makeReq() as any, { params: Promise.resolve({ id: "prospect-1" }) })
    expect(res.status).toBe(404)
  })

  it("retourne 200 + content-type pdf", async () => {
    const res = await GET(makeReq() as any, { params: Promise.resolve({ id: "prospect-1" }) })
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toBe("application/pdf")
    expect(res.headers.get("content-disposition")).toContain("audit-garage-martin.pdf")
  })
})
