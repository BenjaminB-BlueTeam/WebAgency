import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { searchPlaces } from "@/lib/places"
import { validateString } from "@/lib/validation"
import type { SearchResult } from "@/types/places"

const VALID_RAYONS = [5000, 10000, 20000, 30000] as const

export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const body: unknown = await request.json()
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 })
    }
    const b = body as Record<string, unknown>

    const queryRaw = typeof b.query === "string" && b.query.trim().length > 0
      ? b.query.trim()
      : "entreprise"
    if (queryRaw.length > 100) {
      return NextResponse.json({ error: "Le champ query est trop long (max 100 caractères)" }, { status: 400 })
    }
    const query = queryRaw

    const ville = validateString(b.ville, 100)
    if (!ville) {
      return NextResponse.json({ error: "Le champ ville est requis (max 100 caractères)" }, { status: 400 })
    }

    const rayonRaw = b.rayon
    if (!VALID_RAYONS.includes(rayonRaw as (typeof VALID_RAYONS)[number])) {
      return NextResponse.json(
        { error: "Le rayon doit être l'une des valeurs suivantes : 5000, 10000, 20000, 30000" },
        { status: 400 }
      )
    }

    const places = await searchPlaces(query, ville)

    const placeIds = places.map((p) => p.placeId).filter((id) => id !== "")

    const existingProspects = await prisma.prospect.findMany({
      where: { placeId: { in: placeIds } },
      select: { placeId: true },
    })

    const existingPlaceIds = new Set(
      existingProspects.map((p) => p.placeId).filter((id): id is string => id !== null)
    )

    const resultats: SearchResult[] = places.map((p) => ({
      ...p,
      dejaEnBase: existingPlaceIds.has(p.placeId),
    }))

    const recherche = await prisma.recherche.create({
      data: {
        query,
        ville,
        rayon: rayonRaw as number,
        resultatsCount: resultats.length,
        prospectsAjoutes: 0,
      },
    })

    return NextResponse.json({ data: { rechercheId: recherche.id, resultats } })
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      if (err.message.includes("Clé API")) {
        return NextResponse.json({ error: err.message }, { status: 502 })
      }
      if (err.message.includes("Quota")) {
        return NextResponse.json({ error: err.message }, { status: 429 })
      }
      if (err.message.includes("Erreur Google Places API")) {
        return NextResponse.json({ error: err.message }, { status: 502 })
      }
    }
    console.error("[prospection/search] unhandled error:", err)
    return NextResponse.json(
      { error: process.env.NODE_ENV === "development" ? String(err) : "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}
