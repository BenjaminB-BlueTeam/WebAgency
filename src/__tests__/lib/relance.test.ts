// src/__tests__/lib/relance.test.ts
import { describe, it, expect } from "vitest"
import { computeRelance, DELAI_JOURS } from "@/lib/relance"

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000)
}

describe("computeRelance", () => {
  it("returns not due when no emails and no prochaineRelance", () => {
    expect(computeRelance(null, [])).toEqual({ due: false, urgente: false, joursRetard: 0 })
  })

  it("returns not due when last email sent < DELAI_JOURS days ago", () => {
    const result = computeRelance(null, [{ statut: "ENVOYE", dateEnvoi: daysAgo(3) }])
    expect(result).toEqual({ due: false, urgente: false, joursRetard: 0 })
  })

  it("returns due when last email sent exactly DELAI_JOURS days ago", () => {
    const result = computeRelance(null, [{ statut: "ENVOYE", dateEnvoi: daysAgo(DELAI_JOURS) }])
    expect(result.due).toBe(true)
    expect(result.joursRetard).toBe(0)
    expect(result.urgente).toBe(false)
  })

  it("returns due and not urgente when joursRetard <= DELAI_JOURS", () => {
    const result = computeRelance(null, [{ statut: "ENVOYE", dateEnvoi: daysAgo(10) }])
    expect(result.due).toBe(true)
    expect(result.joursRetard).toBe(3)
    expect(result.urgente).toBe(false)
  })

  it("returns urgente when joursRetard > DELAI_JOURS", () => {
    const result = computeRelance(null, [{ statut: "ENVOYE", dateEnvoi: daysAgo(20) }])
    expect(result.due).toBe(true)
    expect(result.urgente).toBe(true)
    expect(result.joursRetard).toBe(13)
  })

  it("ignores BROUILLON emails", () => {
    expect(computeRelance(null, [{ statut: "BROUILLON", dateEnvoi: daysAgo(20) }])).toEqual({
      due: false, urgente: false, joursRetard: 0,
    })
  })

  it("uses prochaineRelance when defined and in the future — not due", () => {
    const future = new Date(Date.now() + 3 * 86_400_000)
    expect(computeRelance(future, [])).toEqual({ due: false, urgente: false, joursRetard: 0 })
  })

  it("uses prochaineRelance when defined and in the past — due", () => {
    const result = computeRelance(daysAgo(5), [])
    expect(result.due).toBe(true)
    expect(result.joursRetard).toBe(5)
    expect(result.urgente).toBe(false)
  })

  it("uses prochaineRelance when defined — urgente when joursRetard > DELAI_JOURS", () => {
    const result = computeRelance(daysAgo(15), [])
    expect(result.due).toBe(true)
    expect(result.urgente).toBe(true)
  })
})
