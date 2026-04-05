import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { generateProspectionEmail, buildEmailHtml } from "@/lib/email"

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()
    const { id } = await params

    const prospect = await prisma.prospect.findUnique({
      where: { id },
      include: {
        maquettes: { orderBy: { createdAt: "desc" }, take: 1 },
        analyses: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    })

    if (!prospect) {
      return NextResponse.json({ error: "Prospect introuvable" }, { status: 404 })
    }

    const lastMaquette = prospect.maquettes[0] ?? null
    const lastAnalyse = prospect.analyses[0] ?? null

    const { sujet, corps } = await generateProspectionEmail(
      prospect,
      lastMaquette ? { demoUrl: lastMaquette.demoUrl, version: lastMaquette.version } : null,
      lastAnalyse ? { recommandations: lastAnalyse.recommandations } : null
    )

    const htmlContent = buildEmailHtml(corps, prospect, lastMaquette?.demoUrl ?? null)

    const email = await prisma.email.create({
      data: {
        prospectId: id,
        type: "PROSPECTION",
        sujet,
        contenu: htmlContent,
        statut: "BROUILLON",
      },
    })

    return NextResponse.json({
      data: {
        id: email.id,
        sujet: email.sujet,
        corps,
        contenu: email.contenu,
        htmlPreview: email.contenu,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
