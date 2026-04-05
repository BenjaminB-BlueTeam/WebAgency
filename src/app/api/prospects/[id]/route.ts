import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { validateProspectUpdate } from "@/lib/validation"
import { Prisma } from "@prisma/client"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()

    const { id } = await params

    const prospect = await prisma.prospect.findUnique({
      where: { id },
      include: {
        maquettes: true,
        analyses: true,
        emails: true,
        notes: { orderBy: { createdAt: "desc" } },
        activites: { orderBy: { createdAt: "desc" } },
      },
    })

    if (!prospect) {
      return NextResponse.json(
        { error: "Prospect non trouvé" },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: prospect })
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
    const { data, errors } = validateProspectUpdate(
      body as Record<string, unknown>
    )

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ error: errors }, { status: 400 })
    }

    const existing = await prisma.prospect.findUnique({
      where: { id },
      select: { statutPipeline: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Prospect non trouvé" },
        { status: 404 }
      )
    }

    const statusChanged =
      data!.statutPipeline !== undefined &&
      data!.statutPipeline !== existing.statutPipeline

    let prospect: Awaited<ReturnType<typeof prisma.prospect.update>>

    if (statusChanged) {
      const [updatedProspect] = await prisma.$transaction([
        prisma.prospect.update({
          where: { id },
          data: data! as Prisma.ProspectUpdateInput,
        }),
        prisma.activite.create({
          data: {
            prospectId: id,
            type: "PIPELINE",
            description: `Statut changé de ${existing.statutPipeline} vers ${data!.statutPipeline}`,
          },
        }),
      ])
      prospect = updatedProspect
    } else {
      prospect = await prisma.prospect.update({
        where: { id },
        data: data! as Prisma.ProspectUpdateInput,
      })
    }

    return NextResponse.json({ data: prospect })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "Un prospect avec ce nom dans cette ville existe déjà" },
          { status: 409 }
        )
      }
      if (error.code === "P2025") {
        return NextResponse.json(
          { error: "Prospect non trouvé" },
          { status: 404 }
        )
      }
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()

    const { id } = await params

    await prisma.prospect.delete({ where: { id } })

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Prospect non trouvé" },
        { status: 404 }
      )
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
