import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma, isUniqueConstraintError } from "@/lib/db"
import { validateString } from "@/lib/validation"
import type { PlaceResult } from "@/types/places"

function extractVille(adresse: string): string {
  const parts = adresse.split(",").map((p) => p.trim())
  if (parts.length < 2) return parts[0] ?? adresse
  const candidate = parts[parts.length - 2] ?? ""
  // Remove leading postal code (e.g. "59000 Lille" → "Lille")
  return candidate.replace(/^\d{4,6}\s+/, "").trim() || candidate
}

function extractActivite(types: string[]): string {
  if (types.length === 0) return "Non renseigné"
  const raw = types[0].replace(/_/g, " ")
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const body: unknown = await request.json()
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 })
    }
    const b = body as Record<string, unknown>

    const rechercheId = validateString(b.rechercheId, 200)
    if (!rechercheId) {
      return NextResponse.json({ error: "Le champ rechercheId est requis" }, { status: 400 })
    }

    if (!Array.isArray(b.prospects) || b.prospects.length === 0) {
      return NextResponse.json({ error: "Le champ prospects doit être un tableau non vide" }, { status: 400 })
    }

    const prospects = b.prospects as PlaceResult[]

    // Collect placeIds to check duplicates
    const incomingPlaceIds = prospects
      .map((p) => p.placeId)
      .filter((id): id is string => typeof id === "string" && id.length > 0)

    const existingProspects = await prisma.prospect.findMany({
      where: { placeId: { in: incomingPlaceIds } },
      select: { placeId: true },
    })

    const existingPlaceIds = new Set(
      existingProspects.map((p) => p.placeId).filter((id): id is string => id !== null)
    )

    let saved = 0
    let skipped = 0

    for (const p of prospects) {
      if (typeof p.placeId === "string" && existingPlaceIds.has(p.placeId)) {
        skipped++
        continue
      }

      const ville = extractVille(p.adresse)
      const activite = extractActivite(p.types)

      try {
        const created = await prisma.prospect.create({
          data: {
            nom: p.nom,
            activite,
            ville,
            adresse: p.adresse || undefined,
            telephone: p.telephone || undefined,
            siteUrl: p.siteUrl || undefined,
            placeId: p.placeId || undefined,
            noteGoogle: p.noteGoogle ?? undefined,
            nbAvisGoogle: p.nbAvisGoogle ?? undefined,
            statutPipeline: "A_DEMARCHER",
            scorePresenceWeb: p.siteUrl ? 3 : 10,
          },
        })

        await prisma.activite.create({
          data: {
            prospectId: created.id,
            type: "RECHERCHE",
            description: `Prospect ajouté via recherche Google Places — ${p.nom} (${ville})`,
          },
        })

        saved++
      } catch (createErr) {
        if (isUniqueConstraintError(createErr)) {
          skipped++
        } else {
          throw createErr
        }
      }
    }

    if (saved > 0) {
      await prisma.recherche.update({
        where: { id: rechercheId },
        data: { prospectsAjoutes: { increment: saved } },
      })
    }

    return NextResponse.json({ data: { saved, skipped } })
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("[prospection/save] unhandled error:", err)
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 })
  }
}
