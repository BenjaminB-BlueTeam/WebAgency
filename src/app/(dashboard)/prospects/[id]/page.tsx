import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { ProspectDetail } from "@/components/prospects/prospect-detail"

async function getProspect(id: string) {
  try {
    return await prisma.prospect.findUnique({
      where: { id },
      include: {
        maquettes: true,
        analyses: true,
        emails: true,
        notes: { orderBy: { createdAt: "desc" } },
        activites: { orderBy: { createdAt: "desc" } },
      },
    })
  } catch {
    return null
  }
}

export default async function ProspectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const prospect = await getProspect(id)

  if (!prospect) {
    notFound()
  }

  return <ProspectDetail prospect={JSON.parse(JSON.stringify(prospect))} />
}
