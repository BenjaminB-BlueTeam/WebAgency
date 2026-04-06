import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { investigate } from "@/lib/maquette/investigate"
import { buildMaquettePrompt } from "@/lib/maquette/build-prompt"
import type { ProspectData } from "@/lib/maquette/investigate"

export const maxDuration = 120

export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const body = await request.json()
    const { prospectId } = body

    if (!prospectId || typeof prospectId !== "string" || prospectId.length > 50) {
      return NextResponse.json({ error: "prospectId invalide" }, { status: 400 })
    }

    const prospect = await prisma.prospect.findUnique({
      where: { id: prospectId },
      include: {
        analyses: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    })

    if (!prospect) {
      return NextResponse.json({ error: "Prospect introuvable" }, { status: 404 })
    }

    const prospectData: ProspectData = {
      id: prospect.id,
      nom: prospect.nom,
      activite: prospect.activite,
      ville: prospect.ville,
      adresse: prospect.adresse ?? "",
      telephone: prospect.telephone,
      siteUrl: prospect.siteUrl,
      noteGoogle: prospect.noteGoogle,
      nbAvisGoogle: prospect.nbAvisGoogle,
    }

    const dbAnalyse = prospect.analyses[0] ?? null
    const analyse = dbAnalyse
      ? { concurrents: dbAnalyse.concurrents, recommandations: dbAnalyse.recommandations }
      : null

    const investigation = await investigate(prospectData, analyse)
    const prompt = await buildMaquettePrompt(investigation, prospectData)

    return NextResponse.json({
      data: {
        prompt,
        context: {
          pexelsImages: investigation.pexelsImages,
          pexelsVideoUrl: investigation.pexelsVideo?.videoUrl ?? null,
          logoUrl: investigation.siteIdentity?.logoUrl ?? null,
          identity: investigation.siteIdentity,
        },
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
