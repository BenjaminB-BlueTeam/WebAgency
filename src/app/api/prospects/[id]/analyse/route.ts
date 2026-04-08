import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { createAnalyseJob } from "@/lib/analyse-job"
import { runAnalyseJob } from "@/lib/run-analyse-job"

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()
    const { id } = await params

    const prospect = await prisma.prospect.findUnique({
      where: { id },
      select: { id: true, nom: true, activite: true, ville: true, placeId: true },
    })
    if (!prospect) {
      return NextResponse.json({ error: "Prospect introuvable" }, { status: 404 })
    }

    const job = await createAnalyseJob(id)

    void runAnalyseJob({ jobId: job.id, prospect }).catch((err) => {
      console.error("runAnalyseJob failed", err)
    })

    return NextResponse.json({ data: { jobId: job.id } })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    const message = error instanceof Error ? error.message : "Erreur serveur"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
