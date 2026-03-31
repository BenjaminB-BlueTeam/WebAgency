import { db } from "@/lib/db";
import { DevisPageClient } from "@/components/devis/devis-page-client";

export const dynamic = "force-dynamic";

export default async function DevisPage() {
  const [devis, prospects] = await Promise.all([
    db.devis.findMany({
      include: {
        prospect: { select: { id: true, nom: true, ville: true, activite: true } },
      },
      orderBy: { dateCreation: "desc" },
    }),
    db.prospect.findMany({
      select: { id: true, nom: true, ville: true, activite: true },
      orderBy: { nom: "asc" },
    }),
  ]);

  return (
    <DevisPageClient
      initialDevis={JSON.parse(JSON.stringify(devis))}
      prospects={JSON.parse(JSON.stringify(prospects))}
    />
  );
}
