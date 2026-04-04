import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"

type RouteParams = { params: Promise<{ id: string }> }

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()

    const { id } = await params

    // Delete note
    await prisma.note.delete({
      where: { id }
    })

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      )
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Note non trouvée" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
