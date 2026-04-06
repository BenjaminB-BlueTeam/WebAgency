import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { scoreProspect } from "@/lib/scoring"

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const body: unknown = await request.json()
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 })
    }
    const b = body as Record<string, unknown>

    if (!Array.isArray(b.prospectIds) || b.prospectIds.length === 0) {
      return NextResponse.json(
        { error: "Le champ prospectIds doit être un tableau non vide" },
        { status: 400 }
      )
    }

    const prospectIds = b.prospectIds as unknown[]
    if (!prospectIds.every((id) => typeof id === "string")) {
      return NextResponse.json(
        { error: "Tous les éléments de prospectIds doivent être des chaînes" },
        { status: 400 }
      )
    }

    const scores: { id: string; scoreGlobal: number | null }[] = []

    for (const id of prospectIds as string[]) {
      try {
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
          scores.push({ id, scoreGlobal: null })
          continue
        }

        const result = await scoreProspect({
          siteUrl: prospect.siteUrl,
          activite: prospect.activite,
          ville: prospect.ville,
          noteGoogle: prospect.noteGoogle,
          nbAvisGoogle: prospect.nbAvisGoogle,
        })

        await prisma.prospect.update({
          where: { id },
          data: {
            scorePresenceWeb: result.scorePresenceWeb,
            scoreSEO: result.scoreSEO,
            scoreDesign: result.scoreDesign,
            scoreFinancier: result.scoreFinancier,
            scorePotentiel: result.scorePotentiel,
            scoreGlobal: result.scoreGlobal,
          },
        })

        await prisma.activite.create({
          data: {
            prospectId: id,
            type: "SCORING",
            description: `Scoring effectué — Score global : ${result.scoreGlobal ?? "N/A"}/10`,
          },
        })

        scores.push({ id, scoreGlobal: result.scoreGlobal })
      } catch {
        scores.push({ id, scoreGlobal: null })
      }
    }

    return NextResponse.json({ data: { scores } })
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 })
  }
}
