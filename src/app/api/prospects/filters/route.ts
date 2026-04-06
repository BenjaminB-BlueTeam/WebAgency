import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    await requireAuth()

    const [activites, villes] = await Promise.all([
      prisma.prospect.findMany({
        select: { activite: true },
        distinct: ["activite"],
        orderBy: { activite: "asc" },
      }),
      prisma.prospect.findMany({
        select: { ville: true },
        distinct: ["ville"],
        orderBy: { ville: "asc" },
      }),
    ])

    return NextResponse.json({
      data: {
        activites: activites.map((p) => p.activite).filter(Boolean),
        villes: villes.map((p) => p.ville).filter(Boolean),
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
