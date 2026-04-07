// src/lib/relance.ts
import type { RelanceInfo, RelanceType } from "@/types/emails"

export const DELAI_JOURS = 7

const MS_PER_DAY = 86_400_000

type EmailLike = { statut: string; dateEnvoi: Date | null }

// Used by emails page for due/urgency display
export function computeRelance(
  prochaineRelance: Date | null,
  emails: EmailLike[]
): RelanceInfo {
  const now = new Date()

  if (prochaineRelance) {
    const diff = Math.floor((now.getTime() - prochaineRelance.getTime()) / MS_PER_DAY)
    if (diff >= 0) {
      return { due: true, urgente: diff > DELAI_JOURS, joursRetard: diff }
    }
    return { due: false, urgente: false, joursRetard: 0 }
  }

  const lastSent = emails
    .filter((e) => e.statut === "ENVOYE" && e.dateEnvoi !== null)
    .sort((a, b) => b.dateEnvoi!.getTime() - a.dateEnvoi!.getTime())[0]

  if (!lastSent?.dateEnvoi) return { due: false, urgente: false, joursRetard: 0 }

  const joursDepuis = Math.floor((now.getTime() - lastSent.dateEnvoi.getTime()) / MS_PER_DAY)
  const joursRetard = joursDepuis - DELAI_JOURS

  if (joursRetard < 0) return { due: false, urgente: false, joursRetard: 0 }
  return { due: true, urgente: joursRetard > DELAI_JOURS, joursRetard }
}

export type ProspectRelanceInput = {
  statutPipeline: string
  dateMaquetteEnvoi: Date | null
  dateRdv: Date | null
  emails: { statut: string; dateEnvoi: Date | null }[]
  activites: { type: string; description: string; createdAt: Date }[]
}

export type ProchainRelanceResult = {
  prochaineRelance: Date | null
  relanceType: RelanceType | null
}

export function computeProchainRelance(input: ProspectRelanceInput): ProchainRelanceResult {
  const now = new Date()

  // DEVIS — priorité 1
  if (input.statutPipeline === "NEGOCIATION") {
    const activite = input.activites.find((a) => a.type === "PIPELINE")
    if (activite) {
      return {
        prochaineRelance: new Date(activite.createdAt.getTime() + 10 * MS_PER_DAY),
        relanceType: "DEVIS",
      }
    }
  }

  // RDV — priorité 2
  if (input.dateRdv && input.dateRdv < now) {
    return {
      prochaineRelance: new Date(input.dateRdv.getTime() + 3 * MS_PER_DAY),
      relanceType: "RDV",
    }
  }

  // MAQUETTE — priorité 3
  if (input.dateMaquetteEnvoi) {
    return {
      prochaineRelance: new Date(input.dateMaquetteEnvoi.getTime() + 5 * MS_PER_DAY),
      relanceType: "MAQUETTE",
    }
  }

  // EMAIL — priorité 4
  const lastSent = input.emails
    .filter((e) => e.statut === "ENVOYE" && e.dateEnvoi !== null)
    .sort((a, b) => b.dateEnvoi!.getTime() - a.dateEnvoi!.getTime())[0]
  if (lastSent?.dateEnvoi) {
    return {
      prochaineRelance: new Date(lastSent.dateEnvoi.getTime() + 7 * MS_PER_DAY),
      relanceType: "EMAIL",
    }
  }

  return { prochaineRelance: null, relanceType: null }
}
