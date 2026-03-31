"use client";

import { useState } from "react";
import { Plus, CheckCircle, Clock, AlertTriangle, XCircle, CreditCard, Printer } from "lucide-react";
import { cn } from "@/lib/utils";

interface FactureProspect {
  id: string;
  nom: string;
  ville: string;
}

interface FactureDevis {
  id: string;
  reference: string;
  offre: string;
}

interface FactureItem {
  id: string;
  prospectId: string;
  reference: string;
  montantHT: number;
  montantTTC: number;
  montantAcompte: number | null;
  statut: string;
  dateCreation: string;
  dateEcheance: string | null;
  datePaiement: string | null;
  notes: string | null;
  prospect: FactureProspect;
  devis: FactureDevis | null;
}

interface DevisSansFacture {
  id: string;
  reference: string;
  offre: string;
  montantHT: number;
  montantTTC: number;
  prospectId: string;
}

interface FacturesPageClientProps {
  initialFactures: FactureItem[];
  prospects: FactureProspect[];
  devisSansFacture: DevisSansFacture[];
}

const STATUT_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  EN_ATTENTE: { label: "En attente", color: "text-blue-300 bg-blue-500/10 border-blue-500/25", icon: <Clock className="w-3 h-3" /> },
  PARTIELLEMENT_PAYEE: { label: "Acompte reçu", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/25", icon: <CreditCard className="w-3 h-3" /> },
  PAYEE: { label: "Payée", color: "text-green-400 bg-green-500/10 border-green-500/25", icon: <CheckCircle className="w-3 h-3" /> },
  RETARD: { label: "En retard", color: "text-red-400 bg-red-500/10 border-red-500/25", icon: <AlertTriangle className="w-3 h-3" /> },
  ANNULEE: { label: "Annulée", color: "text-white/30 bg-white/4 border-white/8", icon: <XCircle className="w-3 h-3" /> },
};

function StatutBadge({ statut }: { statut: string }) {
  const cfg = STATUT_CONFIG[statut] ?? STATUT_CONFIG.EN_ATTENTE;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[0.65rem] font-medium rounded px-2 py-0.5 border", cfg.color)}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

export function FacturesPageClient({ initialFactures, prospects, devisSansFacture }: FacturesPageClientProps) {
  const [factures, setFactures] = useState<FactureItem[]>(initialFactures);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ prospectId: "", devisId: "", montantHT: "", notes: "", echeanceJours: "30" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const payees = factures.filter((f) => f.statut === "PAYEE");
  const enAttente = factures.filter((f) => ["EN_ATTENTE", "PARTIELLEMENT_PAYEE"].includes(f.statut));
  const retard = factures.filter((f) => f.statut === "RETARD");
  const totalCA = payees.reduce((s, f) => s + f.montantTTC, 0);
  const totalPipeline = enAttente.reduce((s, f) => s + f.montantTTC, 0);

  function handleDevisChange(devisId: string) {
    const d = devisSansFacture.find((d) => d.id === devisId);
    setForm({
      ...form,
      devisId,
      montantHT: d ? String(d.montantHT) : form.montantHT,
      prospectId: d ? d.prospectId : form.prospectId,
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.prospectId || !form.montantHT) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/factures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospectId: form.prospectId,
          devisId: form.devisId || undefined,
          montantHT: parseFloat(form.montantHT),
          notes: form.notes,
          echeanceJours: parseInt(form.echeanceJours),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erreur"); return; }
      setFactures([data, ...factures]);
      setShowForm(false);
      setForm({ prospectId: "", devisId: "", montantHT: "", notes: "", echeanceJours: "30" });
    } catch {
      setError("Erreur réseau");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatut(id: string, statut: string) {
    const res = await fetch(`/api/factures/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut }),
    });
    if (!res.ok) { setError((await res.json().catch(() => ({}))).error ?? "Erreur lors de la mise à jour"); return; }
    const updated = await res.json();
    setFactures(factures.map((f) => f.id === id ? { ...f, ...updated } : f));
    setError("");
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette facture ?")) return;
    const res = await fetch(`/api/factures/${id}`, { method: "DELETE" });
    if (!res.ok) { setError("Erreur lors de la suppression"); return; }
    setFactures(factures.filter((f) => f.id !== id));
    setError("");
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Factures</h1>
          <p className="text-xs text-white/40 mt-0.5">{factures.length} factures · {totalCA.toFixed(0)}€ encaissé</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-400 transition-all"
        >
          <Plus className="w-4 h-4" />
          Nouvelle facture
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass rounded-xl p-4">
          <p className="text-[0.65rem] text-white/40 uppercase tracking-wide">CA encaissé</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{totalCA.toFixed(0)}€</p>
          <p className="text-xs text-white/30 mt-0.5">{payees.length} factures payées</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-[0.65rem] text-white/40 uppercase tracking-wide">En attente</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{totalPipeline.toFixed(0)}€</p>
          <p className="text-xs text-white/30 mt-0.5">{enAttente.length} à encaisser</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-[0.65rem] text-white/40 uppercase tracking-wide">En retard</p>
          <p className={cn("text-2xl font-bold mt-1", retard.length > 0 ? "text-red-400" : "text-white/50")}>{retard.length}</p>
          <p className="text-xs text-white/30 mt-0.5">facture{retard.length !== 1 ? "s" : ""} en retard</p>
        </div>
      </div>

      {/* New facture form */}
      {showForm && (
        <div className="glass-violet rounded-xl p-5">
          <p className="text-sm font-semibold text-violet-300 mb-4">Nouvelle facture</p>
          <form onSubmit={handleCreate} className="flex flex-col gap-3">
            {devisSansFacture.length > 0 && (
              <div className="flex flex-col gap-1">
                <label className="text-[0.65rem] text-white/40 uppercase tracking-wide">Depuis un devis accepté (optionnel)</label>
                <select
                  value={form.devisId}
                  onChange={(e) => handleDevisChange(e.target.value)}
                  className="bg-white/6 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-400/60 transition-colors"
                >
                  <option value="">— Sans devis associé —</option>
                  {devisSansFacture.map((d) => (
                    <option key={d.id} value={d.id}>{d.reference} · {d.offre.slice(0, 50)} · {d.montantTTC}€ TTC</option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[0.65rem] text-white/40 uppercase tracking-wide">Client *</label>
                <select
                  value={form.prospectId}
                  onChange={(e) => setForm({ ...form, prospectId: e.target.value })}
                  required
                  className="bg-white/6 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-400/60 transition-colors"
                >
                  <option value="">Sélectionner...</option>
                  {prospects.map((p) => (
                    <option key={p.id} value={p.id}>{p.nom} — {p.ville}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[0.65rem] text-white/40 uppercase tracking-wide">Montant HT (€) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.montantHT}
                  onChange={(e) => setForm({ ...form, montantHT: e.target.value })}
                  placeholder="690"
                  required
                  className="bg-white/6 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-violet-400/60 transition-colors"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[0.65rem] text-white/40 uppercase tracking-wide">Échéance (jours)</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={form.echeanceJours}
                  onChange={(e) => setForm({ ...form, echeanceJours: e.target.value })}
                  className="bg-white/6 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-400/60 transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[0.65rem] text-white/40 uppercase tracking-wide">Notes</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Optionnel..."
                  className="bg-white/6 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-violet-400/60 transition-colors"
                />
              </div>
            </div>
            {form.montantHT && (
              <p className="text-xs text-white/50">
                TTC (TVA 20%) : <span className="text-white font-semibold">{(parseFloat(form.montantHT || "0") * 1.2).toFixed(2)}€</span>
              </p>
            )}
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-2 mt-1">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-lg py-2 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-400 disabled:opacity-50 transition-all"
              >
                {submitting ? "Création…" : "Créer la facture"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg px-4 py-2 text-sm text-white/50 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {error && !showForm && <p className="text-xs text-red-400 px-1">{error}</p>}

      {/* Factures list */}
      <div className="flex flex-col gap-3">
        {factures.length === 0 && (
          <div className="glass rounded-xl p-8 text-center">
            <p className="text-sm text-white/30">Aucune facture — créez votre première facture ci-dessus</p>
          </div>
        )}
        {factures.map((f) => (
          <div key={f.id} className={cn("glass rounded-xl p-4", f.statut === "RETARD" && "border border-red-500/20")}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-white">{f.reference}</span>
                  <StatutBadge statut={f.statut} />
                  {f.devis && (
                    <span className="text-[0.65rem] text-violet-300/70 bg-violet-500/8 border border-violet-500/15 rounded px-1.5 py-0.5">
                      {f.devis.reference}
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/50 mt-0.5">{f.prospect.nom} · {f.prospect.ville}</p>
                <p className="text-[0.65rem] text-white/30 mt-1">
                  Créée le {new Date(f.dateCreation).toLocaleDateString("fr-FR")}
                  {f.dateEcheance && ` · Échéance ${new Date(f.dateEcheance).toLocaleDateString("fr-FR")}`}
                  {f.datePaiement && ` · Payée le ${new Date(f.datePaiement).toLocaleDateString("fr-FR")}`}
                </p>
                {f.montantAcompte && (
                  <p className="text-[0.65rem] text-yellow-300/70 mt-0.5">
                    Acompte reçu : {f.montantAcompte.toFixed(0)}€
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-white">{f.montantTTC.toFixed(0)}€ TTC</p>
                <p className="text-[0.65rem] text-white/30">{f.montantHT.toFixed(0)}€ HT</p>
              </div>
            </div>
            {/* Actions */}
            <div className="flex gap-2 mt-3 pt-3 border-t border-white/6 flex-wrap">
              {["EN_ATTENTE", "PARTIELLEMENT_PAYEE"].includes(f.statut) && (
                <button
                  onClick={() => handleStatut(f.id, "PAYEE")}
                  className="text-xs rounded px-2.5 py-1 text-green-400 bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-colors"
                >
                  Marquer payée
                </button>
              )}
              {f.statut === "EN_ATTENTE" && (
                <button
                  onClick={() => handleStatut(f.id, "RETARD")}
                  className="text-xs rounded px-2.5 py-1 text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                >
                  Marquer retard
                </button>
              )}
              <a
                href={`/print/factures/${f.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs rounded px-2.5 py-1 text-white/50 bg-white/5 border border-white/8 hover:text-white hover:border-white/20 transition-colors"
              >
                <Printer className="w-3 h-3" />
                PDF
              </a>
              <button
                onClick={() => handleDelete(f.id)}
                className="ml-auto text-xs rounded px-2.5 py-1 text-white/30 bg-white/5 border border-white/8 hover:text-red-400 hover:border-red-500/20 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
