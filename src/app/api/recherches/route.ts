import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    await requireAuth()
    const recherches = await prisma.recherche.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, query: true, ville: true, rayon: true, createdAt: true },
    })
    return NextResponse.json({ data: recherches })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
