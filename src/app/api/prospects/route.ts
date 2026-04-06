import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma, isUniqueConstraintError, isNotFoundError } from "@/lib/db"
import { validateProspectCreate, isValidStatutPipeline } from "@/lib/validation"
import { Prisma } from "@prisma/client"

const ALLOWED_SORT_FIELDS = ["nom", "scoreGlobal", "createdAt"] as const
type SortField = (typeof ALLOWED_SORT_FIELDS)[number]

function isValidSortField(value: string): value is SortField {
  return (ALLOWED_SORT_FIELDS as readonly string[]).includes(value)
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")?.toLowerCase().trim() ?? null
    const statut = searchParams.get("statut")
    const scoreMinRaw = searchParams.get("scoreMin")
    const sortRaw = searchParams.get("sort") ?? "createdAt"
    const orderRaw = searchParams.get("order") ?? "desc"

    const where: Prisma.ProspectWhereInput = {}

    if (statut) {
      if (!isValidStatutPipeline(statut)) {
        return NextResponse.json({ error: "Statut invalide" }, { status: 400 })
      }
      where.statutPipeline = statut
    }

    if (scoreMinRaw !== null) {
      const scoreMin = parseFloat(scoreMinRaw)
      if (!isNaN(scoreMin)) {
        where.scoreGlobal = { gte: scoreMin }
      }
    }

    const sortField: SortField = isValidSortField(sortRaw) ? sortRaw : "createdAt"
    const sortOrder: "asc" | "desc" = orderRaw === "asc" ? "asc" : "desc"

    let prospects = await prisma.prospect.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
    })

    if (search) {
      prospects = prospects.filter(
        (p) =>
          p.nom.toLowerCase().includes(search) ||
          (p.activite?.toLowerCase().includes(search) ?? false) ||
          (p.ville?.toLowerCase().includes(search) ?? false)
      )
    }

    return NextResponse.json({ data: prospects })
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
    const { data, errors } = validateProspectCreate(body as Record<string, unknown>)

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ error: errors }, { status: 400 })
    }

    const prospect = await prisma.prospect.create({ data: data! })

    return NextResponse.json({ data: prospect }, { status: 201 })
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

export async function DELETE(request: NextRequest) {
  try {
    await requireAuth()

    const body: unknown = await request.json()
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 })
    }
    const ids = (body as Record<string, unknown>).ids
    if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === "string")) {
      return NextResponse.json({ error: "ids doit être un tableau de strings non vide" }, { status: 400 })
    }

    let deleted = 0
    for (const id of ids as string[]) {
      try {
        await prisma.prospect.delete({ where: { id } })
        deleted++
      } catch (err) {
        if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025")) {
          throw err
        }
      }
    }

    return NextResponse.json({ data: { deleted } })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
