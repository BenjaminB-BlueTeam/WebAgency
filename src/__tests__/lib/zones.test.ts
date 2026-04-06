import { describe, it, expect } from "vitest"
import { VILLES_NORD, VILLES_HAUTS_DE_FRANCE } from "@/lib/zones"

describe("VILLES_NORD", () => {
  it("has exactly 12 entries", () => {
    expect(VILLES_NORD).toHaveLength(12)
  })
})

describe("VILLES_HAUTS_DE_FRANCE", () => {
  it("contains all VILLES_NORD entries", () => {
    for (const ville of VILLES_NORD) {
      expect(VILLES_HAUTS_DE_FRANCE).toContain(ville)
    }
  })

  it("has no duplicates", () => {
    const unique = new Set(VILLES_HAUTS_DE_FRANCE)
    expect(VILLES_HAUTS_DE_FRANCE).toHaveLength(unique.size)
  })
})
