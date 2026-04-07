import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

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

import { getParam, setParam, _clearParamCacheForTesting } from "@/lib/params"

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("getParam", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _clearParamCacheForTesting()
  })

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

describe("getParam cache", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    _clearParamCacheForTesting()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("5. returns cached value on second call without hitting DB", async () => {
    mockParametre.findUnique.mockResolvedValue({ id: "1", cle: "test.key", valeur: "cached-value" })

    await getParam("test.key", "default")
    await getParam("test.key", "default")

    // Should only call DB once
    expect(mockParametre.findUnique).toHaveBeenCalledTimes(1)
  })

  it("6. setParam invalidates the cache key", async () => {
    mockParametre.findUnique.mockResolvedValue({ id: "1", cle: "test.key", valeur: "old-value" })
    mockParametre.upsert.mockResolvedValue({ id: "1", cle: "test.key", valeur: "new-value" })

    // Prime the cache
    await getParam("test.key", "default")
    expect(mockParametre.findUnique).toHaveBeenCalledTimes(1)

    // Invalidate via setParam
    await setParam("test.key", "new-value")

    // Change mock to return new value
    mockParametre.findUnique.mockResolvedValue({ id: "1", cle: "test.key", valeur: "new-value" })

    // Next getParam should hit DB again
    const result = await getParam("test.key", "default")
    expect(mockParametre.findUnique).toHaveBeenCalledTimes(2)
    expect(result).toBe("new-value")
  })

  it("7. cache expires after 60 seconds", async () => {
    mockParametre.findUnique.mockResolvedValue({ id: "1", cle: "test.key", valeur: "value" })

    // First call - hits DB
    await getParam("test.key", "default")
    expect(mockParametre.findUnique).toHaveBeenCalledTimes(1)

    // Advance time by 61s (past TTL)
    vi.advanceTimersByTime(61_000)

    // Should hit DB again
    await getParam("test.key", "default")
    expect(mockParametre.findUnique).toHaveBeenCalledTimes(2)
  })
})
