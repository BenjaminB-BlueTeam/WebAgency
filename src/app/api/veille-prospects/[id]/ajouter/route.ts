import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma, isUniqueConstraintError } from "@/lib/db"
import { scoreProspect } from "@/lib/scoring"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()

    const { id } = await params

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 })
    }

    const nouveauProspect = await prisma.nouveauProspect.findUnique({
      where: { id },
    })

    if (!nouveauProspect) {
      return NextResponse.json({ error: "Introuvable" }, { status: 404 })
    }

    if (nouveauProspect.ajouteComme) {
      return NextResponse.json(
        { error: "Déjà ajouté comme prospect" },
        { status: 409 }
      )
    }

    // Create the Prospect
    const newProspect = await prisma.prospect.create({
      data: {
        nom: nouveauProspect.nom,
        activite: nouveauProspect.activite,
        ville: nouveauProspect.ville,
      },
    })

    // Mark NouveauProspect as added
    await prisma.nouveauProspect.update({
      where: { id },
      data: {
        ajouteComme: true,
        prospectId: newProspect.id,
      },
    })

    // Score the prospect asynchronously (best-effort)
    scoreProspect({
      siteUrl: null,
      activite: newProspect.activite,
      ville: newProspect.ville,
      noteGoogle: null,
      nbAvisGoogle: null,
    })
      .then((scores) =>
        prisma.prospect.update({
          where: { id: newProspect.id },
          data: scores,
        })
      )
      .catch(() => {
        // Scoring failure is non-critical
      })

    return NextResponse.json({ data: { prospectId: newProspect.id } }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { error: "Un prospect avec ce nom dans cette ville existe déjà" },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
