export interface Prospect {
  id: string
  nom: string
  activite: string
  ville: string
  adresse: string | null
  telephone: string | null
  email: string | null
  siteUrl: string | null
  placeId: string | null
  noteGoogle: number | null
  nbAvisGoogle: number | null
  scorePresenceWeb: number | null
  scoreSEO: number | null
  scoreDesign: number | null
  scoreFinancier: number | null
  scorePotentiel: number | null
  scoreGlobal: number | null
  statutPipeline: string
  dateContact: string | null
  dateRdv: string | null
  dateMaquetteEnvoi: string | null
  dateSignature: string | null
  raisonPerte: string | null
  derniereRelance: string | null
  prochaineRelance: string | null
  createdAt: string
  updatedAt: string
}

export interface ProspectWithRelations extends Prospect {
  maquettes: Maquette[]
  analyses: Analyse[]
  emails: Email[]
  notes: Note[]
  activites: Activite[]
}

export interface Maquette {
  id: string
  prospectId: string
  html: string
  demoUrl: string | null
  version: number
  statut: string
  createdAt: string
}

export interface Analyse {
  id: string
  prospectId: string
  concurrents: string
  recommandations: string
  createdAt: string
}

export interface Email {
  id: string
  prospectId: string
  type: string
  sujet: string
  contenu: string
  statut: string
  dateEnvoi: string | null
  createdAt: string
}

export interface Note {
  id: string
  prospectId: string
  contenu: string
  createdAt: string
}

export interface Activite {
  id: string
  prospectId: string | null
  type: string
  description: string
  createdAt: string
}
