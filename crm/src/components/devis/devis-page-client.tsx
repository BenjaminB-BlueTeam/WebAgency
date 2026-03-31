"use client";

import { useState } from "react";
import { Plus, FileText, CheckCircle, Clock, XCircle, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface DevisProspect {
  id: string;
  nom: string;
  ville: string;
  activite: string;
}

interface DevisItem {
  id: string;
  prospectId: string;
  reference: string;
  offre: string;
  montantHT: number;
  montantTTC: number;
  statut: string;
  dateCreation: string;
  dateEnvoi: string | null;
  dateAcceptation: string | null;
  dateExpiration: string | null;
  validiteJours: number;
  notes: string | null;
  prospect: DevisProspect;
}

interface DevisPageClientProps {
  initialDevis: DevisItem[];
  prospects: DevisProspect[];
}

const STATUT_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  BROUILLON: { label: "Brouillon", color: "text-white/50 bg-white/6 border-white/10", icon: <FileText className="w-3 h-3" /> },
  ENVOYE: { label: "Envoyé", color: "text-blue-300 bg-blue-500/10 border-blue-500/25", icon: <Send className="w-3 h-3" /> },
  ACCEPTE: { label: "Accepté", color: "text-green-400 bg-green-500/10 border-green-500/25", icon: <CheckCircle className="w-3 h-3" /> },
  REFUSE: { label: "Refusé", color: "text-red-400 bg-red-500/10 border-red-500/25", icon: <XCircle className="w-3 h-3" /> },
  EXPIRE: { label: "Expiré", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/25", icon: <Clock className="w-3 h-3" /> },
};

function StatutBadge({ statut }: { statut: string }) {
  const cfg = STATUT_CONFIG[statut] ?? STATUT_CONFIG.BROUILLON;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[0.65rem] font-medium rounded px-2 py-0.5 border", cfg.color)}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

export function DevisPageClient({ initialDevis, prospects }: DevisPageClientProps) {
  const [devis, setDevis] = useState<DevisItem[]>(initialDevis);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ prospectId: "", offre: "", montantHT: "", notes: "", validiteJours: "30" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Stats
  const total = devis.reduce((s, d) => s + d.montantTTC, 0);
  const acceptes = devis.filter((d) => d.statut === "ACCEPTE");
  const enAttente = devis.filter((d) => ["BROUILLON", "ENVOYE"].includes(d.statut));

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.prospectId || !form.offre || !form.montantHT) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/devis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospectId: form.prospectId,
          offre: form.offre,
          montantHT: parseFloat(form.montantHT),
          notes: form.notes,
          validiteJours: parseInt(form.validiteJours),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erreur"); return; }
      setDevis([data, ...devis]);
      setShowForm(false);
      setForm({ prospectId: "", offre: "", montantHT: "", notes: "", validiteJours: "30" });
    } catch {
      setError("Erreur réseau");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatut(id: string, statut: string) {
    const res = await fetch(`/api/devis/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut }),
    });
    if (res.ok) {
      const updated = await res.json();
      setDevis(devis.map((d) => d.id === id ? { ...d, ...updated } : d));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce devis ?")) return;
    const res = await fetch(`/api/devis/${id}`, { method: "DELETE" });
    if (res.ok) setDevis(devis.filter((d) => d.id !== id));
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Devis</h1>
          <p className="text-xs text-white/40 mt-0.5">{devis.length} devis · {total.toFixed(0)}€ TTC total</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-400 transition-all"
        >
          <Plus className="w-4 h-4" />
          Nouveau devis
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass rounded-xl p-4">
          <p className="text-[0.65rem] text-white/40 uppercase tracking-wide">Pipeline</p>
          <p className="text-2xl font-bold text-white mt-1">{enAttente.reduce((s, d) => s + d.montantTTC, 0).toFixed(0)}€</p>
          <p className="text-xs text-white/30 mt-0.5">{enAttente.length} en attente</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-[0.65rem] text-white/40 uppercase tracking-wide">Acceptés</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{acceptes.reduce((s, d) => s + d.montantTTC, 0).toFixed(0)}€</p>
          <p className="text-xs text-white/30 mt-0.5">{acceptes.length} devis</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-[0.65rem] text-white/40 uppercase tracking-wide">Taux conversion</p>
          <p className="text-2xl font-bold text-violet-400 mt-1">
            {devis.length > 0 ? Math.round((acceptes.length / devis.length) * 100) : 0}%
          </p>
          <p className="text-xs text-white/30 mt-0.5">sur {devis.length} devis</p>
        </div>
      </div>

      {/* New devis form */}
      {showForm && (
        <div className="glass-violet rounded-xl p-5">
          <p className="text-sm font-semibold text-violet-300 mb-4">Nouveau devis</p>
          <form onSubmit={handleCreate} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[0.65rem] text-white/40 uppercase tracking-wide">Client *</label>
                <select
                  value={form.prospectId}
                  onChange={(e) => setForm({ ...form, prospectId: e.target.value })}
                  required
                  className="bg-white/6 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-400/60 transition-colors"
                >
                  <option value="">Sélectionner un prospect...</option>
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
            <div className="flex flex-col gap-1">
              <label className="text-[0.65rem] text-white/40 uppercase tracking-wide">Offre / Description *</label>
              <input
                type="text"
                value={form.offre}
                onChange={(e) => setForm({ ...form, offre: e.target.value })}
                placeholder="Site vitrine 5 pages — SEO local — Domaine .fr inclus"
                required
                maxLength={200}
                className="bg-white/6 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-violet-400/60 transition-colors"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[0.65rem] text-white/40 uppercase tracking-wide">Validité (jours)</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={form.validiteJours}
                  onChange={(e) => setForm({ ...form, validiteJours: e.target.value })}
                  className="bg-white/6 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-400/60 transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[0.65rem] text-white/40 uppercase tracking-wide">Notes internes</label>
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
                {submitting ? "Création…" : "Créer le devis"}
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

      {/* Devis list */}
      <div className="flex flex-col gap-3">
        {devis.length === 0 && (
          <div className="glass rounded-xl p-8 text-center">
            <p className="text-sm text-white/30">Aucun devis — créez votre premier devis ci-dessus</p>
          </div>
        )}
        {devis.map((d) => (
          <div key={d.id} className="glass rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-white">{d.reference}</span>
                  <StatutBadge statut={d.statut} />
                </div>
                <p className="text-xs text-white/50 mt-0.5 truncate">{d.offre}</p>
                <p className="text-[0.65rem] text-white/30 mt-1">
                  {d.prospect.nom} · {d.prospect.ville} · créé le {new Date(d.dateCreation).toLocaleDateString("fr-FR")}
                  {d.dateExpiration && ` · expire le ${new Date(d.dateExpiration).toLocaleDateString("fr-FR")}`}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-white">{d.montantTTC.toFixed(0)}€ TTC</p>
                <p className="text-[0.65rem] text-white/30">{d.montantHT.toFixed(0)}€ HT</p>
              </div>
            </div>
            {/* Actions */}
            <div className="flex gap-2 mt-3 pt-3 border-t border-white/6">
              {d.statut === "BROUILLON" && (
                <button
                  onClick={() => handleStatut(d.id, "ENVOYE")}
                  className="text-xs rounded px-2.5 py-1 text-blue-300 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                >
                  Marquer envoyé
                </button>
              )}
              {d.statut === "ENVOYE" && (
                <>
                  <button
                    onClick={() => handleStatut(d.id, "ACCEPTE")}
                    className="text-xs rounded px-2.5 py-1 text-green-400 bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-colors"
                  >
                    Marquer accepté
                  </button>
                  <button
                    onClick={() => handleStatut(d.id, "REFUSE")}
                    className="text-xs rounded px-2.5 py-1 text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                  >
                    Marquer refusé
                  </button>
                </>
              )}
              <button
                onClick={() => handleDelete(d.id)}
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
