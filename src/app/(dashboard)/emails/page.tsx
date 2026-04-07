// src/app/(dashboard)/emails/page.tsx
export const dynamic = "force-dynamic"
import { prisma } from "@/lib/db"
import { computeRelance, computeProchainRelance } from "@/lib/relance"
import { EmailsClient } from "@/components/emails/emails-client"
import type { EmailProspectItem } from "@/types/emails"

async function getEmailProspects(): Promise<EmailProspectItem[]> {
  try {
    const prospects = await prisma.prospect.findMany({
      where: { statutPipeline: { notIn: ["CLIENT", "PERDU"] } },
      include: {
        emails: { orderBy: { createdAt: "desc" } },
        activites: {
          where: { type: "PIPELINE" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { type: true, description: true, createdAt: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    })

    const items: EmailProspectItem[] = await Promise.all(prospects.map(async (p) => {
      const relance = computeRelance(p.prochaineRelance, p.emails)
      const { relanceType } = await computeProchainRelance({
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
    }))

    items.sort((a, b) => {
      const score = (r: EmailProspectItem["relance"]) =>
        r.urgente ? 2 : r.due ? 1 : 0
      return score(b.relance) - score(a.relance)
    })

    return items
  } catch {
    return []
  }
}

export default async function EmailsPage() {
  const prospects = await getEmailProspects()

  return (
    <div>
      <h1 className="text-xl font-bold text-[#fafafa] mb-6">Prospection Email</h1>
      <EmailsClient prospects={JSON.parse(JSON.stringify(prospects))} />
    </div>
  )
}
