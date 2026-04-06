import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { findCompetitorCandidates, scrapeCompetitors, buildAnalyseResult } from "@/lib/analyse"

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

    const candidates = await findCompetitorCandidates(
      prospect.activite,
      prospect.ville,
      prospect.placeId
    )
    const scraped = await scrapeCompetitors(candidates)
    const noSite = candidates.filter((c) => c.siteUrl === null)
    const result = await buildAnalyseResult(prospect, scraped, noSite)

    const concurrents = JSON.stringify(result.concurrents)
    const recommandations = JSON.stringify({
      synthese: result.synthese,
      points: result.recommandations,
    })

    const analyse = await prisma.analyse.upsert({
      where: { prospectId: id },
      create: { prospectId: id, concurrents, recommandations },
      update: { concurrents, recommandations, createdAt: new Date() },
    })

    await prisma.activite.create({
      data: {
        prospectId: id,
        type: "ANALYSE",
        description: `Analyse concurrentielle effectuée (${result.concurrents.length} concurrent${result.concurrents.length > 1 ? "s" : ""})`,
      },
    })

    return NextResponse.json({
      data: {
        id: analyse.id,
        concurrents: result.concurrents,
        synthese: result.synthese,
        recommandations: result.recommandations,
        createdAt: analyse.createdAt,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    console.error("[/api/prospects/[id]/analyse]", error)
    const message = error instanceof Error ? error.message : "Erreur serveur"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
