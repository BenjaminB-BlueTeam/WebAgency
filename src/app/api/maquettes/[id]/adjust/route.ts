import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { deployToNetlify } from "@/lib/netlify-deploy"
import { adjustSiteCode } from "@/lib/maquette/adjust-site"
import type { SiteFile } from "@/lib/maquette/generate-site"

export const maxDuration = 180

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()

    const { id: maquetteId } = await params

    if (!maquetteId || typeof maquetteId !== "string" || maquetteId.length > 50) {
      return NextResponse.json({ error: "maquetteId invalide" }, { status: 400 })
    }

    const body = await request.json() as { instructions?: unknown }
    const { instructions } = body

    if (
      !instructions ||
      typeof instructions !== "string" ||
      instructions.trim().length === 0 ||
      instructions.length > 2000
    ) {
      return NextResponse.json({ error: "instructions invalides" }, { status: 400 })
    }

    const maquette = await prisma.maquette.findUnique({
      where: { id: maquetteId },
      include: { prospect: true },
    })

    if (!maquette) {
      return NextResponse.json({ error: "Maquette introuvable" }, { status: 404 })
    }

    let currentFiles: SiteFile[]
    try {
      currentFiles = JSON.parse(maquette.html) as SiteFile[]
    } catch {
      return NextResponse.json({ error: "Fichiers de la maquette corrompus" }, { status: 500 })
    }

    const newFiles = await adjustSiteCode(currentFiles, instructions)

    const { url } = await deployToNetlify(
      newFiles.files,
      maquette.prospect.nom,
      maquette.prospect.ville,
      maquette.netlifySiteId
    )

    await prisma.maquette.update({
      where: { id: maquetteId },
      data: {
        html: JSON.stringify(newFiles.files),
        demoUrl: url,
      },
    })

    await prisma.activite.create({
      data: {
        prospectId: maquette.prospectId,
        type: "MAQUETTE",
        description: `Ajustement: ${instructions.slice(0, 100)}`,
      },
    })

    return NextResponse.json({ data: { demoUrl: url } })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
