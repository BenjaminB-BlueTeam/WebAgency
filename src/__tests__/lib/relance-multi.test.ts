import { describe, it, expect } from "vitest"
import { computeProchainRelance } from "@/lib/relance"
import type { ProspectRelanceInput } from "@/lib/relance"

const MS = 86_400_000

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * MS)
}

function base(): ProspectRelanceInput {
  return {
    statutPipeline: "A_DEMARCHER",
    dateMaquetteEnvoi: null,
    dateRdv: null,
    emails: [],
    activites: [],
  }
}

describe("computeProchainRelance", () => {
  it("returns null when no data", () => {
    expect(computeProchainRelance(base())).toEqual({ prochaineRelance: null, relanceType: null })
  })

  it("EMAIL: returns dateEnvoi + 7j", () => {
    const dateEnvoi = daysAgo(10)
    const result = computeProchainRelance({ ...base(), emails: [{ statut: "ENVOYE", dateEnvoi }] })
    expect(result.relanceType).toBe("EMAIL")
    expect(result.prochaineRelance?.getTime()).toBe(dateEnvoi.getTime() + 7 * MS)
  })

  it("EMAIL: ignores BROUILLON emails", () => {
    const result = computeProchainRelance({ ...base(), emails: [{ statut: "BROUILLON", dateEnvoi: daysAgo(10) }] })
    expect(result.relanceType).toBeNull()
  })

  it("MAQUETTE: returns dateMaquetteEnvoi + 5j", () => {
    const dateMaquetteEnvoi = daysAgo(10)
    const result = computeProchainRelance({ ...base(), dateMaquetteEnvoi })
    expect(result.relanceType).toBe("MAQUETTE")
    expect(result.prochaineRelance?.getTime()).toBe(dateMaquetteEnvoi.getTime() + 5 * MS)
  })

  it("RDV: returns dateRdv + 3j when dateRdv is in the past", () => {
    const dateRdv = daysAgo(10)
    const result = computeProchainRelance({ ...base(), dateRdv })
    expect(result.relanceType).toBe("RDV")
    expect(result.prochaineRelance?.getTime()).toBe(dateRdv.getTime() + 3 * MS)
  })

  it("RDV: ignores dateRdv in the future", () => {
    const dateRdv = new Date(Date.now() + 10 * MS)
    const result = computeProchainRelance({ ...base(), dateRdv })
    expect(result.relanceType).toBeNull()
  })

  it("DEVIS: returns activite.createdAt + 10j for NEGOCIATION statut", () => {
    const createdAt = daysAgo(15)
    const result = computeProchainRelance({
      ...base(),
      statutPipeline: "NEGOCIATION",
      activites: [{ type: "PIPELINE", description: "Statut changé de RDV_PLANIFIE vers NEGOCIATION", createdAt }],
    })
    expect(result.relanceType).toBe("DEVIS")
    expect(result.prochaineRelance?.getTime()).toBe(createdAt.getTime() + 10 * MS)
  })

  it("DEVIS: returns null when statut is NEGOCIATION but no matching activite", () => {
    const result = computeProchainRelance({ ...base(), statutPipeline: "NEGOCIATION" })
    expect(result.relanceType).toBeNull()
  })

  it("DEVIS > RDV: DEVIS wins when both apply", () => {
    const createdAt = daysAgo(15)
    const dateRdv = daysAgo(5)
    const result = computeProchainRelance({
      ...base(),
      statutPipeline: "NEGOCIATION",
      dateRdv,
      activites: [{ type: "PIPELINE", description: "vers NEGOCIATION", createdAt }],
    })
    expect(result.relanceType).toBe("DEVIS")
  })

  it("MAQUETTE > EMAIL: MAQUETTE wins when both apply", () => {
    const dateMaquetteEnvoi = daysAgo(10)
    const dateEnvoi = daysAgo(10)
    const result = computeProchainRelance({
      ...base(),
      dateMaquetteEnvoi,
      emails: [{ statut: "ENVOYE", dateEnvoi }],
    })
    expect(result.relanceType).toBe("MAQUETTE")
  })

  it("RDV > MAQUETTE: RDV wins when both apply", () => {
    const dateRdv = daysAgo(5)
    const dateMaquetteEnvoi = daysAgo(10)
    const result = computeProchainRelance({ ...base(), dateRdv, dateMaquetteEnvoi })
    expect(result.relanceType).toBe("RDV")
  })
})
