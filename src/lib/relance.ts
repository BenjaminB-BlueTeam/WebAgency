// src/lib/relance.ts
import type { RelanceInfo } from "@/types/emails"

export const DELAI_JOURS = 7

type EmailLike = { statut: string; dateEnvoi: Date | null }

export function computeRelance(
  prochaineRelance: Date | null,
  emails: EmailLike[]
): RelanceInfo {
  const now = new Date()
  const MS_PER_DAY = 86_400_000

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
