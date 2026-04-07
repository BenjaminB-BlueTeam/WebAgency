// src/lib/relance.ts
import type { RelanceInfo, RelanceType } from "@/types/emails"
import { getParam } from "@/lib/params"

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

export async function computeProchainRelance(input: ProspectRelanceInput): Promise<ProchainRelanceResult> {
  const now = new Date()

  const [delaiDevis, delaiMaquette, delaiRdv, delaiEmail] = await Promise.all([
    getParam("relance.delai.devis", "10"),
    getParam("relance.delai.maquette", "5"),
    getParam("relance.delai.rdv", "3"),
    getParam("relance.delai.email", "7"),
  ])

  const DEVIS_JOURS = Math.max(0, parseInt(delaiDevis, 10) || 10) * MS_PER_DAY
  const MAQUETTE_JOURS = Math.max(0, parseInt(delaiMaquette, 10) || 5) * MS_PER_DAY
  const RDV_JOURS = Math.max(0, parseInt(delaiRdv, 10) || 3) * MS_PER_DAY
  const EMAIL_JOURS = Math.max(0, parseInt(delaiEmail, 10) || 7) * MS_PER_DAY

  // DEVIS — priorité 1
  if (input.statutPipeline === "NEGOCIATION") {
    const activite = input.activites.find((a) => a.type === "PIPELINE")
    if (activite) {
      return {
        prochaineRelance: new Date(activite.createdAt.getTime() + DEVIS_JOURS),
        relanceType: "DEVIS",
      }
    }
  }

  // RDV — priorité 2
  if (input.dateRdv && input.dateRdv < now) {
    return {
      prochaineRelance: new Date(input.dateRdv.getTime() + RDV_JOURS),
      relanceType: "RDV",
    }
  }

  // MAQUETTE — priorité 3
  if (input.dateMaquetteEnvoi) {
    return {
      prochaineRelance: new Date(input.dateMaquetteEnvoi.getTime() + MAQUETTE_JOURS),
      relanceType: "MAQUETTE",
    }
  }

  // EMAIL — priorité 4
  const lastSent = input.emails
    .filter((e) => e.statut === "ENVOYE" && e.dateEnvoi !== null)
    .sort((a, b) => b.dateEnvoi!.getTime() - a.dateEnvoi!.getTime())[0]
  if (lastSent?.dateEnvoi) {
    return {
      prochaineRelance: new Date(lastSent.dateEnvoi.getTime() + EMAIL_JOURS),
      relanceType: "EMAIL",
    }
  }

  return { prochaineRelance: null, relanceType: null }
}
