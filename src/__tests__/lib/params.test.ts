import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mock db ──────────────────────────────────────────────────────────────────

const { mockParametre } = vi.hoisted(() => {
  const mockParametre = {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  }
  return { mockParametre }
})

vi.mock("@/lib/db", () => ({
  prisma: {
    parametre: mockParametre,
  },
}))

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { getParam, setParam } from "@/lib/params"

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("getParam", () => {
  beforeEach(() => vi.clearAllMocks())

  it("1. returns DB value when key exists", async () => {
    mockParametre.findUnique.mockResolvedValue({ id: "1", cle: "agence.nom", valeur: "Flandre Web" })
    const result = await getParam("agence.nom", "default")
    expect(result).toBe("Flandre Web")
    expect(mockParametre.findUnique).toHaveBeenCalledWith({ where: { cle: "agence.nom" } })
  })

  it("2. returns defaultValue when key is missing", async () => {
    mockParametre.findUnique.mockResolvedValue(null)
    const result = await getParam("agence.nom", "mon-default")
    expect(result).toBe("mon-default")
  })

  it("3. never throws — returns defaultValue even on DB error", async () => {
    mockParametre.findUnique.mockRejectedValue(new Error("DB connection failed"))
    const result = await getParam("agence.nom", "fallback")
    expect(result).toBe("fallback")
  })
})

describe("setParam", () => {
  beforeEach(() => vi.clearAllMocks())

  it("4. upserts correctly", async () => {
    mockParametre.upsert.mockResolvedValue({ id: "1", cle: "agence.nom", valeur: "New Value" })
    await setParam("agence.nom", "New Value")
    expect(mockParametre.upsert).toHaveBeenCalledWith({
      where: { cle: "agence.nom" },
      update: { valeur: "New Value" },
      create: { cle: "agence.nom", valeur: "New Value" },
    })
  })
})
