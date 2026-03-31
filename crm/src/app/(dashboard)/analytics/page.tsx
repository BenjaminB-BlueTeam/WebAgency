import { db } from "@/lib/db";
import { AnalyticsPageClient } from "@/components/analytics/analytics-page-client";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const [prospects, devis, factures, maquettes, recherches] = await Promise.all([
    db.prospect.findMany({
      select: {
        id: true,
        statutPipeline: true,
        priorite: true,
        statut: true,
        dateAjout: true,
        dateContact: true,
        dateRdv: true,
        dateDevis: true,
        dateSignature: true,
      },
    }),
    db.devis.findMany({
      select: { id: true, montantHT: true, montantTTC: true, statut: true, dateCreation: true },
    }),
    db.facture.findMany({
      select: { id: true, montantHT: true, montantTTC: true, statut: true, dateCreation: true },
    }),
    db.maquette.findMany({
      select: { id: true, statut: true, dateCreation: true },
    }),
    db.recherche.findMany({
      select: { id: true, query: true, resultatsCount: true, prospectsAjoutes: true, date: true },
      orderBy: { date: "desc" },
      take: 20,
    }),
  ]);

  return (
    <AnalyticsPageClient
      prospects={JSON.parse(JSON.stringify(prospects))}
      devis={JSON.parse(JSON.stringify(devis))}
      factures={JSON.parse(JSON.stringify(factures))}
      maquettes={JSON.parse(JSON.stringify(maquettes))}
      recherches={JSON.parse(JSON.stringify(recherches))}
    />
  );
}
