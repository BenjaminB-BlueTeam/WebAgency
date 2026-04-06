import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"

type RouteParams = { params: Promise<{ id: string }> }

// Only allow redirects to Netlify domains
function isAllowedRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return (
      parsed.protocol === "https:" &&
      (parsed.hostname.endsWith(".netlify.app") ||
        parsed.hostname.endsWith(".netlify.com"))
    )
  } catch {
    return false
  }
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    await requireAuth()

    const { id } = await params

    const maquette = await prisma.maquette.findUnique({
      where: { id },
      select: { demoUrl: true },
    })

    if (!maquette?.demoUrl) {
      return NextResponse.json(
        { error: "Maquette introuvable" },
        { status: 404 }
      )
    }

    if (!isAllowedRedirectUrl(maquette.demoUrl)) {
      return NextResponse.json({ error: "URL de preview invalide" }, { status: 400 })
    }

    return NextResponse.redirect(maquette.demoUrl, 302)
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
