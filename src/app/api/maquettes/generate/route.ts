import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { deployToNetlify } from "@/lib/netlify-deploy"
import { generateSiteCode } from "@/lib/maquette/generate-site"
import type { GenerationContext } from "@/lib/maquette/generate-site"

export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const body = await request.json()
    const { prospectId, prompt, context } = body

    if (!prospectId || typeof prospectId !== "string" || prospectId.length > 50) {
      return NextResponse.json({ error: "prospectId invalide" }, { status: 400 })
    }

    if (!prompt || typeof prompt !== "string" || prompt.length > 50000) {
      return NextResponse.json({ error: "prompt invalide" }, { status: 400 })
    }

    if (
      !context ||
      typeof context !== "object" ||
      !Array.isArray(context.pexelsImages)
    ) {
      return NextResponse.json({ error: "context invalide" }, { status: 400 })
    }

    const generationContext: GenerationContext = {
      pexelsImages: context.pexelsImages as string[],
      pexelsVideoUrl: typeof context.pexelsVideoUrl === "string" ? context.pexelsVideoUrl : null,
      logoUrl: typeof context.logoUrl === "string" ? context.logoUrl : null,
      identity: context.identity ?? null,
    }

    const prospect = await prisma.prospect.findUnique({
      where: { id: prospectId },
      include: {
        maquettes: { orderBy: { createdAt: "asc" } },
      },
    })

    if (!prospect) {
      return NextResponse.json({ error: "Prospect introuvable" }, { status: 404 })
    }

    if (prospect.maquettes.length >= 3) {
      return NextResponse.json(
        { error: "Nombre maximum de maquettes atteint" },
        { status: 409 }
      )
    }

    const lastMaquette = prospect.maquettes[prospect.maquettes.length - 1] ?? null

    const siteFiles = await generateSiteCode(prompt, generationContext)

    const { url, siteId } = await deployToNetlify(
      siteFiles.files,
      prospect.nom,
      prospect.ville,
      lastMaquette?.netlifySiteId ?? null
    )

    const version = prospect.maquettes.length + 1

    const maquette = await prisma.maquette.create({
      data: {
        prospectId,
        html: JSON.stringify(siteFiles.files),
        demoUrl: url,
        netlifySiteId: siteId,
        version,
        promptUsed: prompt,
        statut: "BROUILLON",
      },
    })

    await prisma.activite.create({
      data: {
        prospectId,
        type: "MAQUETTE",
        description: `Maquette v${version} générée`,
      },
    })

    return NextResponse.json({ data: { id: maquette.id, demoUrl: maquette.demoUrl, version: maquette.version } })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    console.error("[/api/maquettes/generate] error:", error)
    const message = error instanceof Error ? error.message : "Erreur serveur"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
