import { prisma } from "@/lib/db"
import { KanbanBoard } from "@/components/pipeline/kanban-board"

async function getProspects() {
  try {
    return await prisma.prospect.findMany({
      orderBy: { updatedAt: "desc" },
    })
  } catch {
    return []
  }
}

export default async function PipelinePage() {
  const prospects = await getProspects()

  return (
    <div>
      <h1 className="text-xl font-bold text-[#fafafa] mb-6">Pipeline</h1>
      <KanbanBoard initialProspects={JSON.parse(JSON.stringify(prospects))} />
    </div>
  )
}
