import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { validateClientUpdate } from "@/lib/validation"
import { Prisma } from "@prisma/client"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()
    const { id } = await params

    const client = await prisma.client.findUnique({
      where: { id },
      include: { prospect: true },
    })

    if (!client) {
      return NextResponse.json({ error: "Client non trouvé" }, { status: 404 })
    }

    return NextResponse.json({ data: client })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()
    const { id } = await params

    const body: unknown = await request.json()
    const { data, errors } = validateClientUpdate(
      body as Record<string, unknown>
    )

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ error: errors }, { status: 400 })
    }

    const client = await prisma.client.update({
      where: { id },
      data: data!,
      include: { prospect: true },
    })

    return NextResponse.json({ data: client })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Client non trouvé" }, { status: 404 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()
    const { id } = await params

    await prisma.client.delete({ where: { id } })

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Client non trouvé" }, { status: 404 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
