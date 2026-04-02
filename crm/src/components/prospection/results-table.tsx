// crm/src/components/prospection/results-table.tsx
"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/status-badge";
import type { SearchProspect } from "@/app/api/prospection/search/route";

interface ResultsTableProps {
  prospects: SearchProspect[];
}

export function ResultsTable({ prospects }: ResultsTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(
    new Set(prospects.filter(p => p.alreadyInCrm).map(p => `${p.nom}|${p.ville}`))
  );

  const key = (p: SearchProspect) => `${p.nom}|${p.ville}`;

  function toggleOne(k: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  }

  function selectAllHaute() {
    const hautes = prospects
      .filter(p => p.priorite === "HAUTE" && !addedIds.has(key(p)))
      .map(key);
    setSelected(new Set(hautes));
  }

  const caPotentiel = selected.size * 690;

  async function handleBulkAdd() {
    if (selected.size === 0 || adding) return;
    setAdding(true);
    let added = 0;
    let skipped = 0;
    const toAdd = prospects.filter(p => selected.has(key(p)));

    // Batch by 3
    for (let i = 0; i < toAdd.length; i += 3) {
      const batch = toAdd.slice(i, i + 3);
      await Promise.all(
        batch.map(async p => {
          const res = await fetch("/api/prospects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nom: p.nom, activite: p.activite, ville: p.ville,
              telephone: p.telephone, email: p.email, siteUrl: p.siteUrl,
              adresse: p.adresse, noteGoogle: p.noteGoogle,
              statut: p.statut, priorite: p.priorite,
              raison: p.raison, argumentCommercial: p.argumentCommercial,
              source: "PROSPECTION",
            }),
          });
          if (res.ok) {
            added++;
            setAddedIds(prev => new Set([...prev, key(p)]));
          } else if (res.status === 409) {
            skipped++;
          }
        })
      );
    }

    setSelected(new Set());
    setAdding(false);
    const parts: string[] = [];
    if (added > 0) parts.push(`${added} ajouté${added > 1 ? "s" : ""}`);
    if (skipped > 0) parts.push(`${skipped} déjà existant${skipped > 1 ? "s" : ""} ignoré${skipped > 1 ? "s" : ""}`);
    if (parts.length > 0) toast.success(parts.join(" · "));
  }

  if (prospects.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={selectAllHaute}
            className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            Tout sélectionner HAUTE
          </button>
          {selected.size > 0 && (
            <span className="text-xs text-white/40">
              {selected.size} sélectionné{selected.size > 1 ? "s" : ""} · CA potentiel ~{caPotentiel.toLocaleString("fr-FR")} €
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleBulkAdd}
          disabled={selected.size === 0 || adding}
          className="rounded-lg bg-gradient-to-r from-violet-600 to-indigo-500 px-4 py-1.5 text-xs font-semibold text-white transition-opacity disabled:opacity-40"
        >
          {adding ? "Ajout en cours…" : `Ajouter au CRM (${selected.size})`}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border/40">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/40 text-white/40 uppercase tracking-[0.08em]">
              <th className="w-8 p-3 text-left"></th>
              <th className="p-3 text-left">Prospect</th>
              <th className="p-3 text-center">Score</th>
              <th className="p-3 text-center">Statut web</th>
              <th className="p-3 text-center">Google</th>
              <th className="p-3 text-left">Téléphone</th>
              <th className="p-3 text-left">Site</th>
            </tr>
          </thead>
          <tbody>
            {prospects.map((p, i) => {
              const k = key(p);
              const isAdded = addedIds.has(k);
              const isSelected = selected.has(k);
              const score = p.score;
              const scoreColor =
                score != null && score >= 60 ? "text-green-400" :
                score != null && score >= 30 ? "text-yellow-400" : "text-white/30";
              return (
                <tr
                  key={k}
                  className={`border-b border-border/20 transition-colors last:border-0 ${
                    isSelected ? "bg-violet-500/10" : i % 2 === 0 ? "bg-black/10" : ""
                  } ${isAdded ? "opacity-50" : "hover:bg-white/5"}`}
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isAdded}
                      onChange={() => toggleOne(k)}
                      className="accent-violet-500 cursor-pointer"
                      aria-label={`Sélectionner ${p.nom}`}
                    />
                  </td>
                  <td className="p-3">
                    <div className="font-medium text-white/90">{p.nom}</div>
                    <div className="text-white/40">{p.activite} · {p.ville}</div>
                    {isAdded && <span className="text-[10px] text-green-400">✓ Dans le CRM</span>}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`font-bold ${scoreColor}`}>{score ?? "—"}</span>
                  </td>
                  <td className="p-3 text-center">
                    <StatusBadge type="statut" value={p.statut} />
                  </td>
                  <td className="p-3 text-center text-white/60">
                    {p.noteGoogle != null ? `⭐ ${p.noteGoogle}` : "—"}
                    {p.nbAvisGoogle != null ? ` (${p.nbAvisGoogle})` : ""}
                  </td>
                  <td className="p-3 text-white/60">{p.telephone ?? "—"}</td>
                  <td className="p-3">
                    {p.siteUrl ? (
                      <a
                        href={p.siteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-yellow-400 hover:underline truncate block max-w-[120px]"
                      >
                        {p.siteUrl.replace(/^https?:\/\//, "").slice(0, 30)}
                      </a>
                    ) : (
                      <span className="text-white/20">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
