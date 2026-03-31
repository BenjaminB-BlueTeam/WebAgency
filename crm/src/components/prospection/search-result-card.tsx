"use client";

import { useState } from "react";
import { MapPin, Phone, Globe, Star } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import type { SearchProspect } from "@/app/api/prospection/search/route";

interface SearchResultCardProps {
  prospect: SearchProspect;
  isTop?: boolean;
}

export function SearchResultCard({ prospect, isTop = false }: SearchResultCardProps) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(prospect.alreadyInCrm);

  async function handleAdd() {
    if (added || adding) return;
    setAdding(true);
    try {
      const res = await fetch("/api/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: prospect.nom,
          activite: prospect.activite,
          ville: prospect.ville,
          telephone: prospect.telephone,
          email: prospect.email,
          siteUrl: prospect.siteUrl,
          adresse: prospect.adresse,
          noteGoogle: prospect.noteGoogle,
          statut: prospect.statut,
          priorite: prospect.priorite,
          raison: prospect.raison,
          argumentCommercial: prospect.argumentCommercial,
          source: "PROSPECTION",
        }),
      });
      if (res.ok) {
        setAdded(true);
      } else {
        toast.error("Impossible d'ajouter ce prospect");
      }
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className={cn("rounded-xl p-4", isTop ? "glass-violet" : "glass")}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-white">{prospect.nom}</span>
            <StatusBadge type="priorite" value={prospect.priorite} />
            <StatusBadge type="statut" value={prospect.statut} />
          </div>
          <p className="text-xs text-white/50 mt-0.5">
            {prospect.activite} · {prospect.ville}
          </p>
        </div>
        {added ? (
          <span className="shrink-0 text-[0.65rem] font-medium text-green-400 bg-green-400/10 border border-green-400/25 rounded px-2 py-0.5">
            ✓ Dans le CRM
          </span>
        ) : null}
      </div>

      {/* Contact details */}
      <div className="grid grid-cols-2 gap-2 mb-3 bg-black/20 rounded-lg p-3">
        {prospect.adresse && (
          <div className="flex items-start gap-1.5">
            <MapPin className="w-3 h-3 text-white/40 mt-0.5 shrink-0" />
            <p className="text-[0.7rem] text-white/70 truncate">{prospect.adresse}</p>
          </div>
        )}
        {prospect.telephone && (
          <div className="flex items-start gap-1.5">
            <Phone className="w-3 h-3 text-white/40 mt-0.5 shrink-0" />
            <p className="text-[0.7rem] text-white/70">{prospect.telephone}</p>
          </div>
        )}
        {prospect.siteUrl && (
          <div className="flex items-start gap-1.5">
            <Globe className="w-3 h-3 text-white/40 mt-0.5 shrink-0" />
            <a
              href={prospect.siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[0.7rem] text-yellow-400 truncate hover:underline"
            >
              {prospect.siteUrl.replace(/^https?:\/\//, "").slice(0, 35)}
            </a>
          </div>
        )}
        {prospect.noteGoogle != null && (
          <div className="flex items-start gap-1.5">
            <Star className="w-3 h-3 text-white/40 mt-0.5 shrink-0" />
            <p className="text-[0.7rem] text-white/70">{prospect.noteGoogle} / 5</p>
          </div>
        )}
      </div>

      {/* Argument commercial */}
      {prospect.argumentCommercial && (
        <div className="border-l-2 border-violet-400/40 pl-3 py-1 mb-3 bg-violet-500/5 rounded-r">
          <p className="text-[0.65rem] text-violet-300 uppercase tracking-wide mb-0.5">
            Argument commercial
          </p>
          <p className="text-xs text-slate-300 italic">
            &ldquo;{prospect.argumentCommercial}&rdquo;
          </p>
        </div>
      )}

      {/* Add button */}
      <button
        onClick={handleAdd}
        disabled={added || adding}
        className={cn(
          "w-full rounded-lg py-2 text-xs font-semibold transition-colors",
          added
            ? "bg-green-500/10 border border-green-500/25 text-green-400 cursor-default"
            : adding
            ? "bg-violet-500/20 border border-violet-400/30 text-violet-300 cursor-wait opacity-70"
            : "bg-gradient-to-r from-violet-600 to-indigo-500 text-white hover:from-violet-500 hover:to-indigo-400"
        )}
      >
        {added ? "✓ Ajouté au CRM" : adding ? "Ajout en cours..." : "➕ Ajouter au CRM"}
      </button>
    </div>
  );
}
