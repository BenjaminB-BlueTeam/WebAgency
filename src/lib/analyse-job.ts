import { prisma } from "@/lib/db"
import type { AnalyseResult } from "@/lib/analyse"

export type StepName =
  | "search_competitors"
  | "scrape_competitors"
  | "analyse"
  | "recommandations"

export type StepStatut = "running" | "done" | "failed"

export interface AnalyseStep {
  nom: StepName | string
  statut: StepStatut
  message?: string
  data?: unknown
}

export async function createAnalyseJob(prospectId: string) {
  return prisma.analyseJob.create({
    data: { prospectId, statut: "pending", etapes: "[]" },
  })
}

export async function markJobRunning(jobId: string) {
  await prisma.analyseJob.update({
    where: { id: jobId },
    data: { statut: "running" },
  })
}

function parseEtapes(raw: string): AnalyseStep[] {
  try {
    return JSON.parse(raw) as AnalyseStep[]
  } catch {
    return []
  }
}

export async function appendStep(jobId: string, step: AnalyseStep) {
  await prisma.$transaction(async (tx) => {
    const job = await tx.analyseJob.findUnique({
      where: { id: jobId },
      select: { etapes: true },
    })
    if (!job) return
    const current = parseEtapes(job.etapes)
    current.push(step)
    await tx.analyseJob.update({
      where: { id: jobId },
      data: { etapes: JSON.stringify(current) },
    })
  })
}

export async function updateStep(
  jobId: string,
  nom: string,
  patch: Partial<Omit<AnalyseStep, "nom">>
) {
  await prisma.$transaction(async (tx) => {
    const job = await tx.analyseJob.findUnique({
      where: { id: jobId },
      select: { etapes: true },
    })
    if (!job) return
    const current = parseEtapes(job.etapes)
    for (let i = current.length - 1; i >= 0; i--) {
      if (current[i].nom === nom) {
        current[i] = { ...current[i], ...patch }
        break
      }
    }
    await tx.analyseJob.update({
      where: { id: jobId },
      data: { etapes: JSON.stringify(current) },
    })
  })
}

export async function markJobDone(jobId: string, resultat: AnalyseResult) {
  await prisma.analyseJob.update({
    where: { id: jobId },
    data: { statut: "done", resultat: JSON.stringify(resultat) },
  })
}

export async function markJobFailed(jobId: string, erreur: string) {
  await prisma.analyseJob.update({
    where: { id: jobId },
    data: { statut: "failed", erreur },
  })
}
