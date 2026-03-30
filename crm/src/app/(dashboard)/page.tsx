import { db } from "@/lib/db";
import { StatCard } from "@/components/dashboard/stat-card";
import { PipelineBar } from "@/components/dashboard/pipeline-bar";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { AlertsRelance } from "@/components/dashboard/alerts-relance";

export const dynamic = "force-dynamic";

const PIPELINE_ORDER = ["PROSPECT", "CONTACTE", "RDV", "DEVIS", "SIGNE", "LIVRE"];

export default async function DashboardPage() {
  const [prospects, maquettesCount, activites] = await Promise.all([
    db.prospect.findMany({
      select: {
        id: true,
        nom: true,
        ville: true,
        priorite: true,
        statutPipeline: true,
        dateContact: true,
        dateAjout: true,
      },
    }),
    db.maquette.count({ where: { statut: { not: "BROUILLON" } } }),
    db.activite.findMany({ orderBy: { date: "desc" }, take: 10 }),
  ]);

  // Stats
  const totalProspects = prospects.length;
  const hauteCount = prospects.filter((p) => p.priorite === "HAUTE").length;
  const caPotentiel = hauteCount * 400;

  // Relances: prospects not contacted in 7+ days, not SIGNE/LIVRE
  const now = Date.now();
  const relances = prospects
    .filter((p) => {
      if (p.statutPipeline === "SIGNE" || p.statutPipeline === "LIVRE") return false;
      const lastDate = p.dateContact ?? p.dateAjout;
      const days = Math.floor((now - lastDate.getTime()) / 86400000);
      return days >= 7;
    })
    .map((p) => {
      const lastDate = p.dateContact ?? p.dateAjout;
      const daysSinceContact = Math.floor((now - lastDate.getTime()) / 86400000);
      return {
        id: p.id,
        nom: p.nom,
        ville: p.ville,
        priorite: p.priorite,
        daysSinceContact,
      };
    })
    .sort((a, b) => b.daysSinceContact - a.daysSinceContact);

  // Pipeline segments
  const pipelineCounts = new Map<string, number>();
  for (const p of prospects) {
    pipelineCounts.set(p.statutPipeline, (pipelineCounts.get(p.statutPipeline) ?? 0) + 1);
  }
  const segments = PIPELINE_ORDER.map((status) => ({
    status,
    count: pipelineCounts.get(status) ?? 0,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Prospects"
          value={totalProspects}
          subtitle={`${hauteCount} haute priorit\u00e9`}
          subtitleColor="text-primary"
        />
        <StatCard
          label="Maquettes"
          value={maquettesCount}
          subtitle="envoy\u00e9es ou valid\u00e9es"
          subtitleColor="text-primary"
        />
        <StatCard
          label="CA potentiel"
          value={`${caPotentiel.toLocaleString("fr-FR")}\u00a0\u20ac`}
          subtitle={`${hauteCount} prospects \u00d7 400\u00a0\u20ac`}
          subtitleColor="text-green-600"
        />
        <StatCard
          label="\u00c0 relancer"
          value={relances.length}
          subtitle={relances.length > 0 ? "en attente de contact" : "tout est \u00e0 jour"}
          subtitleColor={relances.length > 0 ? "text-destructive" : "text-green-600"}
        />
      </div>

      {/* Pipeline bar */}
      <PipelineBar segments={segments} />

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentActivity activites={activites} />
        <AlertsRelance relances={relances} />
      </div>
    </div>
  );
}
