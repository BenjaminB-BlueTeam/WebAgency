import { prisma } from "@/lib/db"
import { computeProchainRelance } from "@/lib/relance"

export async function refreshProchainRelance(prospectId: string): Promise<void> {
  try {
    const prospect = await prisma.prospect.findUnique({
      where: { id: prospectId },
      select: {
        statutPipeline: true,
        dateMaquetteEnvoi: true,
        dateRdv: true,
        emails: {
          select: { statut: true, dateEnvoi: true },
        },
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
    })
    if (!prospect) return
    const { prochaineRelance } = computeProchainRelance(prospect)
    await prisma.prospect.update({
      where: { id: prospectId },
      data: { prochaineRelance },
    })
  } catch (error) {
    console.error("[relance-writer] error:", error)
  }
}
