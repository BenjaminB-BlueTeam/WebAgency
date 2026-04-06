import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    await requireAuth()

    const prospects = await prisma.nouveauProspect.findMany({
      where: { ajouteComme: false },
      orderBy: { dateCreation: "desc" },
      take: 20,
    })

    return NextResponse.json({ data: prospects })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
