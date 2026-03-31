import { db } from "@/lib/db";
import { FacturesPageClient } from "@/components/factures/factures-page-client";

export const dynamic = "force-dynamic";

export default async function FacturesPage() {
  const [factures, prospects, devisList] = await Promise.all([
    db.facture.findMany({
      include: {
        prospect: { select: { id: true, nom: true, ville: true } },
        devis: { select: { id: true, reference: true, offre: true } },
      },
      orderBy: { dateCreation: "desc" },
    }),
    db.prospect.findMany({
      select: { id: true, nom: true, ville: true },
      orderBy: { nom: "asc" },
    }),
    db.devis.findMany({
      where: { statut: "ACCEPTE", facture: null },
      select: { id: true, reference: true, offre: true, montantHT: true, montantTTC: true, prospectId: true },
    }),
  ]);

  return (
    <FacturesPageClient
      initialFactures={JSON.parse(JSON.stringify(factures))}
      prospects={JSON.parse(JSON.stringify(prospects))}
      devisSansFacture={JSON.parse(JSON.stringify(devisList))}
    />
  );
}
