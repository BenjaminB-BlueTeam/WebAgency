import { NextRequest, NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { AuditPdfDocument } from "@/lib/pdf/audit-pdf"
import type { Concurrent } from "@/lib/analyse"

type RouteParams = { params: Promise<{ id: string }> }

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "prospect"
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()
    const { id } = await params

    if (typeof id !== "string" || id.length === 0 || id.length > 64) {
      return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 })
    }

    const prospect = await prisma.prospect.findUnique({
      where: { id },
      select: {
        id: true,
        nom: true,
        activite: true,
        ville: true,
        adresse: true,
        telephone: true,
        noteGoogle: true,
        analyses: {
          select: { id: true, concurrents: true, recommandations: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    })

    if (!prospect) {
      return NextResponse.json({ error: "Prospect introuvable" }, { status: 404 })
    }

    const raw = prospect.analyses[0]
    if (!raw) {
      return NextResponse.json({ error: "Analyse introuvable" }, { status: 404 })
    }

    let concurrents: Concurrent[]
    let synthese: string
    let recommandations: string[]
    try {
      concurrents = JSON.parse(raw.concurrents) as Concurrent[]
      const reco = JSON.parse(raw.recommandations) as { synthese: string; points: string[] }
      synthese = reco.synthese
      recommandations = reco.points
    } catch {
      return NextResponse.json({ error: "Analyse corrompue" }, { status: 500 })
    }

    const buffer = await renderToBuffer(
      AuditPdfDocument({
        prospect: {
          nom: prospect.nom,
          activite: prospect.activite,
          ville: prospect.ville,
          adresse: prospect.adresse,
          telephone: prospect.telephone,
          noteGoogle: prospect.noteGoogle,
        },
        analyse: { concurrents, synthese, recommandations },
      })
    )

    const filename = `audit-${slugify(prospect.nom)}.pdf`

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    const message = error instanceof Error ? error.message : "Erreur serveur"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
