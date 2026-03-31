"use client";

import { cn } from "@/lib/utils";

// Types
interface ProspectData {
  id: string; statutPipeline: string; priorite: string; statut: string;
  dateAjout: string; dateContact: string | null; dateRdv: string | null;
  dateDevis: string | null; dateSignature: string | null;
}
interface DevisData { id: string; montantHT: number; montantTTC: number; statut: string; dateCreation: string; }
interface FactureData { id: string; montantHT: number; montantTTC: number; statut: string; dateCreation: string; }
interface MaquetteData { id: string; statut: string; dateCreation: string; }
interface RechercheData { id: string; query: string; resultatsCount: number; prospectsAjoutes: number; date: string; }

interface Props {
  prospects: ProspectData[];
  devis: DevisData[];
  factures: FactureData[];
  maquettes: MaquetteData[];
  recherches: RechercheData[];
}

const PIPELINE_STEPS = ["PROSPECT", "CONTACTE", "RDV", "DEVIS", "SIGNE", "LIVRE"] as const;
const PIPELINE_LABELS: Record<string, string> = {
  PROSPECT: "Prospect", CONTACTE: "Contacté", RDV: "RDV", DEVIS: "Devis", SIGNE: "Signé", LIVRE: "Livré",
};
const FUNNEL_COLORS = [
  "bg-violet-500/70", "bg-violet-400/70", "bg-indigo-500/70",
  "bg-blue-500/70", "bg-emerald-500/70", "bg-green-500/70",
];

function KpiCard({ label, value, sub, color = "text-white" }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="glass rounded-xl p-4">
      <p className="text-[0.65rem] text-white/40 uppercase tracking-wide">{label}</p>
      <p className={cn("text-2xl font-bold mt-1", color)}>{value}</p>
      {sub && <p className="text-xs text-white/30 mt-0.5">{sub}</p>}
    </div>
  );
}

function FunnelStep({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-xs text-white/50 text-right shrink-0">{label}</span>
      <div className="flex-1 bg-white/5 rounded-full h-6 overflow-hidden">
        <div
          className={cn("h-full rounded-full flex items-center px-2 transition-all duration-500", color)}
          style={{ width: `${Math.max(pct, 4)}%` }}
        >
          <span className="text-[0.6rem] font-bold text-white">{count}</span>
        </div>
      </div>
      <span className="w-8 text-xs text-white/40 shrink-0 text-right">{pct}%</span>
    </div>
  );
}

export function AnalyticsPageClient({ prospects, devis, factures, maquettes, recherches }: Props) {
  // KPIs
  const caEncaisse = factures.filter(f => f.statut === "PAYEE").reduce((s, f) => s + f.montantTTC, 0);
  const caPipeline = devis.filter(d => ["ENVOYE", "ACCEPTE"].includes(d.statut)).reduce((s, d) => s + d.montantTTC, 0);
  const devisAcceptes = devis.filter(d => d.statut === "ACCEPTE").length;
  const tauxConversion = devis.length > 0 ? Math.round((devisAcceptes / devis.length) * 100) : 0;
  const prospectsActifs = prospects.filter(p => !["SIGNE", "LIVRE"].includes(p.statutPipeline)).length;

  // Funnel
  const total = prospects.length;
  const funnelCounts = PIPELINE_STEPS.map(step => ({
    step,
    label: PIPELINE_LABELS[step],
    count: prospects.filter(p => p.statutPipeline === step).length,
  }));

  // Statut web
  const statutCounts = {
    SANS_SITE: prospects.filter(p => p.statut === "SANS_SITE").length,
    SITE_OBSOLETE: prospects.filter(p => p.statut === "SITE_OBSOLETE").length,
    SITE_BASIQUE: prospects.filter(p => p.statut === "SITE_BASIQUE").length,
    SITE_CORRECT: prospects.filter(p => p.statut === "SITE_CORRECT").length,
  };

  // Devis by statut
  const devisByStatut = ["BROUILLON", "ENVOYE", "ACCEPTE", "REFUSE", "EXPIRE"].map(s => ({
    statut: s,
    count: devis.filter(d => d.statut === s).length,
    montant: devis.filter(d => d.statut === s).reduce((sum, d) => sum + d.montantTTC, 0),
  }));

  // Factures by statut
  const facturesByStatut = ["EN_ATTENTE", "PARTIELLEMENT_PAYEE", "PAYEE", "RETARD", "ANNULEE"].map(s => ({
    statut: s,
    label: ({ EN_ATTENTE: "En attente", PARTIELLEMENT_PAYEE: "Acompte", PAYEE: "Payée", RETARD: "Retard", ANNULEE: "Annulée" } as Record<string, string>)[s] ?? s,
    count: factures.filter(f => f.statut === s).length,
    montant: factures.filter(f => f.statut === s).reduce((sum, f) => sum + f.montantTTC, 0),
  }));

  // suppress unused var warning for maquettes
  void maquettes;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Analytics</h1>
        <p className="text-xs text-white/40 mt-0.5">Vue d&apos;ensemble de votre activité</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="CA encaissé" value={`${caEncaisse.toFixed(0)}€`} sub="factures payées" color="text-green-400" />
        <KpiCard label="CA pipeline" value={`${caPipeline.toFixed(0)}€`} sub="devis en cours" color="text-blue-400" />
        <KpiCard label="Taux conversion" value={`${tauxConversion}%`} sub={`${devisAcceptes}/${devis.length} devis`} color="text-violet-400" />
        <KpiCard label="Prospects actifs" value={prospectsActifs} sub={`sur ${total} total`} />
      </div>

      {/* Funnel */}
      <div className="glass rounded-xl p-5">
        <p className="text-xs text-white/40 uppercase tracking-wide mb-4">Funnel pipeline</p>
        <div className="flex flex-col gap-2.5">
          {funnelCounts.map((f, i) => (
            <FunnelStep key={f.step} label={f.label} count={f.count} total={total} color={FUNNEL_COLORS[i]} />
          ))}
        </div>
      </div>

      {/* Statut web */}
      <div className="glass rounded-xl p-5">
        <p className="text-xs text-white/40 uppercase tracking-wide mb-4">Répartition statut web</p>
        {total > 0 ? (
          <>
            <div className="flex h-7 rounded-lg overflow-hidden gap-0.5">
              {statutCounts.SANS_SITE > 0 && (
                <div className="bg-violet-500/70 flex items-center justify-center" style={{ width: `${(statutCounts.SANS_SITE / total) * 100}%` }}>
                  <span className="text-[0.6rem] font-bold text-white truncate px-1">{statutCounts.SANS_SITE}</span>
                </div>
              )}
              {statutCounts.SITE_OBSOLETE > 0 && (
                <div className="bg-yellow-500/70 flex items-center justify-center" style={{ width: `${(statutCounts.SITE_OBSOLETE / total) * 100}%` }}>
                  <span className="text-[0.6rem] font-bold text-white truncate px-1">{statutCounts.SITE_OBSOLETE}</span>
                </div>
              )}
              {statutCounts.SITE_BASIQUE > 0 && (
                <div className="bg-blue-500/70 flex items-center justify-center" style={{ width: `${(statutCounts.SITE_BASIQUE / total) * 100}%` }}>
                  <span className="text-[0.6rem] font-bold text-white truncate px-1">{statutCounts.SITE_BASIQUE}</span>
                </div>
              )}
              {statutCounts.SITE_CORRECT > 0 && (
                <div className="bg-green-500/70 flex items-center justify-center" style={{ width: `${(statutCounts.SITE_CORRECT / total) * 100}%` }}>
                  <span className="text-[0.6rem] font-bold text-white truncate px-1">{statutCounts.SITE_CORRECT}</span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-3 mt-3">
              {[
                { label: "Sans site", count: statutCounts.SANS_SITE, color: "bg-violet-500/70" },
                { label: "Obsolète", count: statutCounts.SITE_OBSOLETE, color: "bg-yellow-500/70" },
                { label: "Basique", count: statutCounts.SITE_BASIQUE, color: "bg-blue-500/70" },
                { label: "Correct", count: statutCounts.SITE_CORRECT, color: "bg-green-500/70" },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <span className={cn("w-2.5 h-2.5 rounded-sm shrink-0", s.color)} />
                  <span className="text-xs text-white/50">{s.label} <span className="text-white/80 font-medium">{s.count}</span></span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-xs text-white/30">Aucun prospect</p>
        )}
      </div>

      {/* Devis & Factures */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass rounded-xl p-5">
          <p className="text-xs text-white/40 uppercase tracking-wide mb-3">Devis par statut</p>
          {devis.length === 0 ? <p className="text-xs text-white/30">Aucun devis</p> : (
            <table className="w-full text-xs">
              <thead><tr className="text-white/30 text-left"><th className="pb-2 font-normal">Statut</th><th className="pb-2 font-normal text-right">Nb</th><th className="pb-2 font-normal text-right">Montant TTC</th></tr></thead>
              <tbody className="divide-y divide-white/5">
                {devisByStatut.filter(d => d.count > 0).map(d => (
                  <tr key={d.statut}>
                    <td className="py-1.5 text-white/70">{d.statut}</td>
                    <td className="py-1.5 text-right text-white/80 font-medium">{d.count}</td>
                    <td className="py-1.5 text-right text-white/60">{d.montant.toFixed(0)}€</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="glass rounded-xl p-5">
          <p className="text-xs text-white/40 uppercase tracking-wide mb-3">Factures par statut</p>
          {factures.length === 0 ? <p className="text-xs text-white/30">Aucune facture</p> : (
            <table className="w-full text-xs">
              <thead><tr className="text-white/30 text-left"><th className="pb-2 font-normal">Statut</th><th className="pb-2 font-normal text-right">Nb</th><th className="pb-2 font-normal text-right">Montant TTC</th></tr></thead>
              <tbody className="divide-y divide-white/5">
                {facturesByStatut.filter(f => f.count > 0).map(f => (
                  <tr key={f.statut}>
                    <td className="py-1.5 text-white/70">{f.label}</td>
                    <td className="py-1.5 text-right text-white/80 font-medium">{f.count}</td>
                    <td className="py-1.5 text-right text-white/60">{f.montant.toFixed(0)}€</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Recherches */}
      <div className="glass rounded-xl p-5">
        <p className="text-xs text-white/40 uppercase tracking-wide mb-3">Historique prospection (20 dernières)</p>
        {recherches.length === 0 ? (
          <p className="text-xs text-white/30">Aucune recherche effectuée</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-white/30 text-left">
                <th className="pb-2 font-normal">Date</th>
                <th className="pb-2 font-normal">Requête</th>
                <th className="pb-2 font-normal text-right">Résultats</th>
                <th className="pb-2 font-normal text-right">Ajoutés</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recherches.map(r => (
                <tr key={r.id}>
                  <td className="py-1.5 text-white/40 shrink-0 pr-4">{new Date(r.date).toLocaleDateString("fr-FR")}</td>
                  <td className="py-1.5 text-white/70 truncate max-w-[200px]">{r.query}</td>
                  <td className="py-1.5 text-right text-white/60">{r.resultatsCount}</td>
                  <td className="py-1.5 text-right text-violet-400 font-medium">+{r.prospectsAjoutes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
