import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma, isUniqueConstraintError } from "@/lib/db"
import { validateClientCreate } from "@/lib/validation"

export async function GET() {
  try {
    await requireAuth()

    const clients = await prisma.client.findMany({
      include: { prospect: true },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ data: clients })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const body: unknown = await request.json()
    const { data, errors } = validateClientCreate(
      body as Record<string, unknown>
    )

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ error: errors }, { status: 400 })
    }

    const prospect = await prisma.prospect.findUnique({
      where: { id: data!.prospectId },
      select: { id: true },
    })
    if (!prospect) {
      return NextResponse.json(
        { error: { prospectId: "Prospect introuvable" } },
        { status: 400 }
      )
    }

    const client = await prisma.client.create({
      data: {
        prospectId: data!.prospectId,
        siteUrl: data!.siteUrl,
        offreType: data!.offreType,
        dateLivraison: data!.dateLivraison,
        ...(data!.maintenanceActive !== undefined
          ? { maintenanceActive: data!.maintenanceActive }
          : {}),
      },
      include: { prospect: true },
    })

    return NextResponse.json({ data: client }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { error: "Ce prospect est déjà client" },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
