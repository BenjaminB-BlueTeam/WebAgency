import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { validateString } from "@/lib/validation"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()
    const { id } = await params

    // Check prospect exists
    const prospect = await prisma.prospect.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!prospect) {
      return NextResponse.json(
        { error: "Prospect non trouvé" },
        { status: 404 }
      )
    }

    // Get all activities for this prospect
    const activites = await prisma.activite.findMany({
      where: { prospectId: id },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ data: activites })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()
    const { id } = await params

    // Check prospect exists
    const prospect = await prisma.prospect.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!prospect) {
      return NextResponse.json(
        { error: "Prospect non trouvé" },
        { status: 404 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const description = validateString(body.description, 1000)

    if (!description) {
      return NextResponse.json(
        { error: "Description requise (1-1000 caractères)" },
        { status: 400 }
      )
    }

    // Create activity
    const activite = await prisma.activite.create({
      data: {
        prospectId: id,
        type: "NOTE",
        description,
      },
    })

    return NextResponse.json({ data: activite }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
