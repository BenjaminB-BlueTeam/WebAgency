import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { sendEmail, buildEmailHtml } from "@/lib/email"
import { refreshProchainRelance } from "@/lib/relance-writer"

type RouteParams = { params: Promise<{ id: string }> }

function str(val: unknown, max: number): string | null {
  if (typeof val !== "string" || val.trim().length === 0) return null
  return val.trim().slice(0, max)
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()
    const { id } = await params

    const body: unknown = await request.json()
    const b = body as Record<string, unknown>
    const emailId = str(b.emailId, 128)
    const sujet = str(b.sujet, 500)
    const corps = str(b.corps, 10000)

    if (!emailId || !sujet || !corps) {
      return NextResponse.json({ error: "emailId, sujet et corps sont requis" }, { status: 400 })
    }

    const prospect = await prisma.prospect.findUnique({
      where: { id },
      include: { maquettes: { orderBy: { createdAt: "desc" }, take: 1 } },
    })

    if (!prospect) {
      return NextResponse.json({ error: "Prospect introuvable" }, { status: 404 })
    }
    if (!prospect.email) {
      return NextResponse.json({ error: "Le prospect n'a pas d'adresse email" }, { status: 400 })
    }

    const email = await prisma.email.findUnique({ where: { id: emailId } })
    if (!email || email.prospectId !== id) {
      return NextResponse.json({ error: "Email introuvable" }, { status: 404 })
    }
    if (email.statut !== "BROUILLON") {
      return NextResponse.json({ error: "Cet email a déjà été envoyé" }, { status: 400 })
    }

    const lastMaquetteDemoUrl = prospect.maquettes[0]?.demoUrl ?? null
    const htmlContent = buildEmailHtml(corps, prospect, lastMaquetteDemoUrl)

    const success = await sendEmail(prospect.email, sujet, htmlContent)
    if (!success) {
      return NextResponse.json({ error: "Échec de l'envoi de l'email" }, { status: 502 })
    }

    await prisma.email.update({
      where: { id: emailId },
      data: { sujet, contenu: htmlContent, statut: "ENVOYE", dateEnvoi: new Date() },
    })

    await prisma.activite.create({
      data: {
        prospectId: id,
        type: "EMAIL",
        description: `Email de prospection envoyé à ${prospect.email}`,
      },
    })

    if (prospect.statutPipeline === "A_DEMARCHER") {
      await prisma.prospect.update({
        where: { id },
        data: { statutPipeline: "MAQUETTE_EMAIL_ENVOYES" },
      })
    }

    refreshProchainRelance(id).catch(() => {})

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
