import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { scoreProspect } from "@/lib/scoring"

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()

    const { id } = await params

    const prospect = await prisma.prospect.findUnique({
      where: { id },
      select: {
        id: true,
        siteUrl: true,
        activite: true,
        ville: true,
        noteGoogle: true,
        nbAvisGoogle: true,
      },
    })

    if (!prospect) {
      return NextResponse.json(
        { error: "Prospect non trouvé" },
        { status: 404 }
      )
    }

    const scores = await scoreProspect({
      siteUrl: prospect.siteUrl,
      activite: prospect.activite,
      ville: prospect.ville,
      noteGoogle: prospect.noteGoogle,
      nbAvisGoogle: prospect.nbAvisGoogle,
    })

    await prisma.prospect.update({
      where: { id },
      data: {
        scorePresenceWeb: scores.scorePresenceWeb,
        scoreSEO: scores.scoreSEO,
        scoreDesign: scores.scoreDesign,
        scoreFinancier: scores.scoreFinancier,
        scorePotentiel: scores.scorePotentiel,
        scoreGlobal: scores.scoreGlobal,
      },
    })

    await prisma.activite.create({
      data: {
        prospectId: id,
        type: "SCORING",
        description: `Scoring effectué — Score global : ${scores.scoreGlobal ?? "N/A"}/10`,
      },
    })

    return NextResponse.json({ data: scores })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
