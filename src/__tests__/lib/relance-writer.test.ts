/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  prisma: {
    prospect: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock("@/lib/relance", () => ({
  computeProchainRelance: vi.fn(),
  computeRelance: vi.fn(),
  DELAI_JOURS: 7,
}))

import { refreshProchainRelance } from "@/lib/relance-writer"
import { prisma } from "@/lib/db"
import { computeProchainRelance } from "@/lib/relance"

const mockProspect = {
  statutPipeline: "A_DEMARCHER",
  dateMaquetteEnvoi: null,
  dateRdv: null,
  emails: [],
  activites: [],
}

describe("refreshProchainRelance", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.prospect.findUnique).mockResolvedValue(mockProspect as any)
    vi.mocked(prisma.prospect.update).mockResolvedValue({} as any)
    vi.mocked(computeProchainRelance).mockResolvedValue({ prochaineRelance: null, relanceType: null })
  })

  it("calls prisma.prospect.update with computed prochaineRelance", async () => {
    const date = new Date("2026-02-01")
    vi.mocked(computeProchainRelance).mockResolvedValue({ prochaineRelance: date, relanceType: "EMAIL" })
    await refreshProchainRelance("p1")
    expect(vi.mocked(prisma.prospect.update)).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { prochaineRelance: date },
    })
  })

  it("does nothing when prospect not found", async () => {
    vi.mocked(prisma.prospect.findUnique).mockResolvedValue(null)
    await refreshProchainRelance("p1")
    expect(vi.mocked(prisma.prospect.update)).not.toHaveBeenCalled()
  })

  it("resolves without throwing when prisma.prospect.update rejects", async () => {
    vi.mocked(prisma.prospect.update).mockRejectedValue(new Error("DB error"))
    await expect(refreshProchainRelance("p1")).resolves.toBeUndefined()
  })
})
