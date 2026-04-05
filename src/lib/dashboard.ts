import { prisma } from "@/lib/db"

const PIPELINE_ORDER = [
  "A_DEMARCHER",
  "MAQUETTE_EMAIL_ENVOYES",
  "REPONDU",
  "RDV_PLANIFIE",
  "NEGOCIATION",
  "CLIENT",
  "PERDU",
] as const

const PIPELINE_LABELS: Record<string, string> = {
  A_DEMARCHER: "À démarcher",
  MAQUETTE_EMAIL_ENVOYES: "Email envoyé",
  REPONDU: "Répondu",
  RDV_PLANIFIE: "RDV planifié",
  NEGOCIATION: "Négociation",
  CLIENT: "Client",
  PERDU: "Perdu",
}

const PIPELINE_COLORS: Record<string, string> = {
  A_DEMARCHER: "#737373",
  MAQUETTE_EMAIL_ENVOYES: "#60a5fa",
  REPONDU: "#fbbf24",
  RDV_PLANIFIE: "#fbbf24",
  NEGOCIATION: "#fafafa",
  CLIENT: "#4ade80",
  PERDU: "#f87171",
}

export interface PipelineSlice {
  statut: string
  label: string
  count: number
  color: string
}

export interface DashboardStats {
  totalProspects: number
  aDemarcher: number
  maquettesEnvoyees: number
  clientsSignes: number
  tauxConversion: number
  pipeline: PipelineSlice[]
}

export interface DashboardRelance {
  id: string
  nom: string
  activite: string
  ville: string
  prochaineRelance: string
}

export interface DashboardRelances {
  count: number
  prospects: DashboardRelance[]
}

export interface DashboardActivite {
  id: string
  type: string
  description: string
  createdAt: string
  prospectNom: string | null
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const rows = await prisma.prospect.groupBy({
    by: ["statutPipeline"],
    _count: { _all: true },
  })

  const countByStatut: Record<string, number> = {}
  let total = 0
  for (const row of rows) {
    countByStatut[row.statutPipeline] = row._count._all
    total += row._count._all
  }

  const clientsSignes = countByStatut["CLIENT"] ?? 0
  const tauxConversion = total > 0 ? Math.round((clientsSignes / total) * 100) : 0

  const pipeline: PipelineSlice[] = PIPELINE_ORDER.map((statut) => ({
    statut,
    label: PIPELINE_LABELS[statut] ?? statut,
    count: countByStatut[statut] ?? 0,
    color: PIPELINE_COLORS[statut] ?? "#737373",
  }))

  return {
    totalProspects: total,
    aDemarcher: countByStatut["A_DEMARCHER"] ?? 0,
    maquettesEnvoyees: countByStatut["MAQUETTE_EMAIL_ENVOYES"] ?? 0,
    clientsSignes,
    tauxConversion,
    pipeline,
  }
}

export async function getDashboardRelances(): Promise<DashboardRelances> {
  const now = new Date()
  const prospects = await prisma.prospect.findMany({
    where: {
      prochaineRelance: { lte: now },
      statutPipeline: { notIn: ["CLIENT", "PERDU"] },
    },
    select: {
      id: true,
      nom: true,
      activite: true,
      ville: true,
      prochaineRelance: true,
    },
    orderBy: { prochaineRelance: "asc" },
    take: 10,
  })

  return {
    count: prospects.length,
    prospects: prospects.map((p) => ({
      id: p.id,
      nom: p.nom,
      activite: p.activite,
      ville: p.ville,
      prochaineRelance: p.prochaineRelance!.toISOString(),
    })),
  }
}

export async function getDashboardActivites(): Promise<DashboardActivite[]> {
  const activites = await prisma.activite.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      prospect: { select: { nom: true } },
    },
  })

  return activites.map((a) => ({
    id: a.id,
    type: a.type,
    description: a.description,
    createdAt: a.createdAt.toISOString(),
    prospectNom: a.prospect?.nom ?? null,
  }))
}
