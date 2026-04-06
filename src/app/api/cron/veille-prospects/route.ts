import { NextResponse } from "next/server"
import { createHash, timingSafeEqual } from "crypto"
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

  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`
  const actual = authHeader ?? ""
  // Use fixed-length hashes to avoid length timing leaks
  const expectedBuf = Buffer.from(createHash("sha256").update(expected).digest("hex"))
  const actualBuf = Buffer.from(createHash("sha256").update(actual).digest("hex"))
  if (!timingSafeEqual(expectedBuf, actualBuf)) {
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

  const pappersUrl = new URL("https://api.pappers.fr/v2/recherche")
  pappersUrl.searchParams.set("date_creation_min", toISO(yesterday))
  pappersUrl.searchParams.set("date_creation_max", toISO(now))
  pappersUrl.searchParams.set("departement", "59")
  pappersUrl.searchParams.set("entreprise_cessee", "false")
  pappersUrl.searchParams.set("par_page", "20")
  // NOTE: Pappers API only supports api_token as query param (no Authorization header support)
  // Risk accepted: API key may appear in proxy logs. Rotate key periodically.
  // Future: switch to a server-side proxy if Pappers adds header auth support.
  pappersUrl.searchParams.set("api_token", apiKey)

  let data: PappersRechercheResponse
  try {
    const res = await fetch(pappersUrl.toString())
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
