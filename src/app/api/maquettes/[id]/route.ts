import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { deleteNetlifySite } from "@/lib/netlify-deploy"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()

    const { id } = await params

    const maquette = await prisma.maquette.findUnique({
      where: { id },
      select: {
        id: true,
        demoUrl: true,
        version: true,
        statut: true,
        promptUsed: true,
        createdAt: true,
      },
    })

    if (!maquette) {
      return NextResponse.json(
        { error: "Maquette introuvable" },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: maquette })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()

    const { id } = await params
    if (!id || typeof id !== "string" || id.length > 50) {
      return NextResponse.json({ error: "id invalide" }, { status: 400 })
    }

    const maquette = await prisma.maquette.findUnique({
      where: { id },
      select: { id: true, prospectId: true, version: true, netlifySiteId: true },
    })

    if (!maquette) {
      return NextResponse.json({ error: "Maquette introuvable" }, { status: 404 })
    }

    // Best-effort: supprime le site Netlify avant la ligne en base
    if (maquette.netlifySiteId) {
      try {
        await deleteNetlifySite(maquette.netlifySiteId)
      } catch (e) {
        console.error("[/api/maquettes/:id DELETE] netlify cleanup failed:", e)
      }
    }

    await prisma.maquette.delete({ where: { id } })

    await prisma.activite.create({
      data: {
        prospectId: maquette.prospectId,
        type: "MAQUETTE",
        description: `Maquette v${maquette.version} supprimée`,
      },
    })

    return NextResponse.json({ data: { id } })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    console.error("[/api/maquettes/:id DELETE] error:", error)
    const message = error instanceof Error ? error.message : "Erreur serveur"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
