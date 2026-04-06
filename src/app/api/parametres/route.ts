import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { setParam } from "@/lib/params"

export async function PATCH(request: NextRequest) {
  try {
    await requireAuth()

    const body: unknown = await request.json()

    if (
      typeof body !== "object" ||
      body === null ||
      !("cle" in body) ||
      !("valeur" in body)
    ) {
      return NextResponse.json(
        { error: "Les champs cle et valeur sont requis" },
        { status: 400 }
      )
    }

    const { cle, valeur } = body as { cle: unknown; valeur: unknown }

    if (typeof cle !== "string" || cle.trim() === "" || cle.length > 100) {
      return NextResponse.json(
        { error: "Le champ cle doit être une chaîne non vide de 100 caractères maximum" },
        { status: 400 }
      )
    }

    if (typeof valeur !== "string" || valeur.length > 10000) {
      return NextResponse.json(
        { error: "Le champ valeur doit être une chaîne de 10 000 caractères maximum" },
        { status: 400 }
      )
    }

    await setParam(cle.trim(), valeur)

    return NextResponse.json({ data: { cle: cle.trim(), valeur } })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
