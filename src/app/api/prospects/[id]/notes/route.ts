import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { validateString } from "@/lib/validation"
import { NextRequest, NextResponse } from "next/server"

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()

    const { id } = await params

    // Check if prospect exists
    const prospect = await prisma.prospect.findUnique({
      where: { id },
      select: { id: true }
    })

    if (!prospect) {
      return NextResponse.json(
        { error: "Prospect non trouvé" },
        { status: 404 }
      )
    }

    // Parse and validate body
    const body = await request.json()
    const contenu = validateString(body.contenu, 5000)

    if (!contenu) {
      return NextResponse.json(
        { error: "Contenu requis (1-5000 caractères)" },
        { status: 400 }
      )
    }

    // Create note
    const note = await prisma.note.create({
      data: {
        prospectId: id,
        contenu
      }
    })

    return NextResponse.json({ data: note }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
