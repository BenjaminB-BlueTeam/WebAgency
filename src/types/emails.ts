// src/types/emails.ts

export interface RelanceInfo {
  due: boolean
  urgente: boolean
  joursRetard: number
}

export interface EmailProspectItem {
  id: string
  nom: string
  activite: string
  ville: string
  email: string | null
  statutPipeline: string
  dernierEmail: {
    id: string
    sujet: string
    dateEnvoi: string | null
    statut: string
  } | null
  emailsHistory: {
    id: string
    sujet: string
    dateEnvoi: string | null
    statut: string
    createdAt: string
  }[]
  relance: RelanceInfo
}
