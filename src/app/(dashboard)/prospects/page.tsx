import { prisma } from "@/lib/db"
import { ProspectList } from "@/components/prospects/prospect-list"

export const dynamic = "force-dynamic"

async function getProspects() {
  try {
    return await prisma.prospect.findMany({
      orderBy: { createdAt: "desc" },
    })
  } catch {
    return []
  }
}

export default async function ProspectsPage() {
  const prospects = await getProspects()

  return (
    <div>
      <h1 className="text-xl font-bold text-[#fafafa] mb-6">Prospects</h1>
      <ProspectList initialProspects={JSON.parse(JSON.stringify(prospects))} />
    </div>
  )
}
