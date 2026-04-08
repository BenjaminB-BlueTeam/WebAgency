import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import type { AnalyseStep } from "@/lib/analyse-job"

type RouteParams = { params: Promise<{ id: string; jobId: string }> }

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()
    const { id, jobId } = await params

    const job = await prisma.analyseJob.findUnique({ where: { id: jobId } })
    if (!job) {
      return NextResponse.json({ error: "Job introuvable" }, { status: 404 })
    }
    if (job.prospectId !== id) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    let etapes: AnalyseStep[] = []
    try {
      etapes = JSON.parse(job.etapes) as AnalyseStep[]
    } catch {
      etapes = []
    }

    let resultat: unknown = null
    if (job.resultat) {
      try {
        resultat = JSON.parse(job.resultat)
      } catch {
        resultat = null
      }
    }

    return NextResponse.json({
      data: {
        id: job.id,
        statut: job.statut,
        etapes,
        resultat,
        erreur: job.erreur,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    const message = error instanceof Error ? error.message : "Erreur serveur"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
