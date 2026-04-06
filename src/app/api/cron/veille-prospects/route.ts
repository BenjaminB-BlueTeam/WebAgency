import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export const maxDuration = 60

interface PappersEntreprise {
  siren: string
  nom_entreprise: string
  libelle_code_naf: string
  code_naf: string
  siege: { ville: string }
  date_creation: string // "2026-04-07"
}

interface PappersRechercheResponse {
  entreprises?: PappersEntreprise[]
}

// Vercel cron: runs daily at 8h UTC
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const apiKey = process.env.PAPPERS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "PAPPERS_API_KEY not configured" }, { status: 500 })
  }

  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)

  const toISO = (d: Date) => d.toISOString().split("T")[0]

  const url =
    `https://api.pappers.fr/v2/recherche` +
    `?date_creation_min=${toISO(yesterday)}` +
    `&date_creation_max=${toISO(now)}` +
    `&departement=59` +
    `&entreprise_cessee=false` +
    `&par_page=20` +
    `&api_token=${apiKey}`

  let data: PappersRechercheResponse
  try {
    const res = await fetch(url)
    if (!res.ok) {
      return NextResponse.json(
        { error: `Pappers API error ${res.status}` },
        { status: 502 }
      )
    }
    data = (await res.json()) as PappersRechercheResponse
  } catch (err) {
    const message = err instanceof Error ? err.message : "fetch error"
    return NextResponse.json({ error: message }, { status: 502 })
  }

  const entreprises = data.entreprises ?? []
  let inserted = 0

  for (const e of entreprises) {
    if (!e.siren) continue

    const dateCreation = new Date(e.date_creation)
    if (isNaN(dateCreation.getTime())) continue

    try {
      await prisma.nouveauProspect.upsert({
        where: { siren: e.siren },
        update: {},
        create: {
          siren: e.siren,
          nom: e.nom_entreprise ?? "",
          activite: e.libelle_code_naf ?? "",
          codeNAF: e.code_naf ?? "",
          ville: e.siege?.ville ?? "",
          dateCreation,
        },
      })
      inserted++
    } catch {
      // Skip duplicates or errors for individual records
    }
  }

  return NextResponse.json({
    data: { found: entreprises.length, inserted },
  })
}
