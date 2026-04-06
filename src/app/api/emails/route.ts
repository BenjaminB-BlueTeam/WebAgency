// src/app/api/emails/route.ts
import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { computeRelance, computeProchainRelance } from "@/lib/relance"
import type { EmailProspectItem } from "@/types/emails"

export async function GET() {
  try {
    await requireAuth()

    const prospects = await prisma.prospect.findMany({
      where: { statutPipeline: { notIn: ["CLIENT", "PERDU"] } },
      include: {
        emails: { orderBy: { createdAt: "desc" } },
        activites: {
          where: {
            type: "PIPELINE",
            description: { contains: "NEGOCIATION" },
          },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { type: true, description: true, createdAt: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    })

    const items: EmailProspectItem[] = prospects.map((p) => {
      const relance = computeRelance(p.prochaineRelance, p.emails)
      const { relanceType } = computeProchainRelance({
        statutPipeline: p.statutPipeline,
        dateMaquetteEnvoi: p.dateMaquetteEnvoi,
        dateRdv: p.dateRdv,
        emails: p.emails,
        activites: p.activites,
      })
      const lastSentEmail = p.emails.find((e) => e.statut === "ENVOYE") ?? null

      return {
        id: p.id,
        nom: p.nom,
        activite: p.activite,
        ville: p.ville,
        email: p.email,
        statutPipeline: p.statutPipeline,
        dernierEmail: lastSentEmail
          ? {
              id: lastSentEmail.id,
              sujet: lastSentEmail.sujet,
              dateEnvoi: lastSentEmail.dateEnvoi?.toISOString() ?? null,
              statut: lastSentEmail.statut,
            }
          : null,
        emailsHistory: p.emails.map((e) => ({
          id: e.id,
          sujet: e.sujet,
          dateEnvoi: e.dateEnvoi?.toISOString() ?? null,
          statut: e.statut,
          createdAt: e.createdAt.toISOString(),
        })),
        relance,
        relanceType,
      }
    })

    items.sort((a, b) => {
      const score = (r: EmailProspectItem["relance"]) =>
        r.urgente ? 2 : r.due ? 1 : 0
      return score(b.relance) - score(a.relance)
    })

    return NextResponse.json({ data: items })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
