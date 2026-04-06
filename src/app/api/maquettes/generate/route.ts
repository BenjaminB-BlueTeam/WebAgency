import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { deployToNetlify } from "@/lib/netlify-deploy"

export const maxDuration = 300

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
        maquettes: { orderBy: { createdAt: "asc" } },
        analyses: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    })

    if (!prospect) {
      return NextResponse.json({ error: "Prospect introuvable" }, { status: 404 })
    }

    if (prospect.maquettes.length >= 3) {
      return NextResponse.json(
        { error: "Nombre maximum de maquettes atteint" },
        { status: 409 }
      )
    }

    const lastMaquette = prospect.maquettes[prospect.maquettes.length - 1] ?? null

    // TODO step 8: replace with new generation pipeline (Pexels + Claude + Netlify)
    const files: { path: string; content: string }[] = []
    const promptUsed = ""
    const { url, siteId } = await deployToNetlify(
      files,
      prospect.nom,
      prospect.ville,
      lastMaquette?.netlifySiteId ?? null
    )

    const version = prospect.maquettes.length + 1

    const maquette = await prisma.maquette.create({
      data: {
        prospectId,
        html: JSON.stringify(files),
        demoUrl: url,
        netlifySiteId: siteId,
        version,
        promptUsed,
        statut: "BROUILLON",
      },
    })

    await prisma.activite.create({
      data: {
        prospectId,
        type: "MAQUETTE",
        description: `Maquette v${version} générée`,
      },
    })

    return NextResponse.json({ data: { id: maquette.id, demoUrl: maquette.demoUrl, version: maquette.version } })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
