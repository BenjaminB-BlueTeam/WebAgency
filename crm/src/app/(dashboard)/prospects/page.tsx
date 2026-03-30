import { db } from "@/lib/db";
import { ProspectsPageTabs } from "@/components/prospects/prospects-page-tabs";

export const dynamic = "force-dynamic";

export default async function ProspectsPage() {
  const prospects = await db.prospect.findMany({
    include: {
      maquettes: { select: { id: true, statut: true } },
      _count: { select: { activites: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return <ProspectsPageTabs initialData={JSON.parse(JSON.stringify(prospects))} />;
}
