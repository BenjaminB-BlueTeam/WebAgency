import { db } from "@/lib/db";
import { ProspectsList } from "@/components/prospects/prospects-list";

export const dynamic = "force-dynamic";

export default async function ProspectsPage() {
  const prospects = await db.prospect.findMany({
    include: {
      maquettes: { select: { id: true, statut: true } },
      _count: { select: { activites: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return <ProspectsList initialData={JSON.parse(JSON.stringify(prospects))} />;
}
