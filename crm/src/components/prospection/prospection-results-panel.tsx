"use client";

import Link from "next/link";
import { SearchResultCard } from "./search-result-card";
import type { SearchProspect } from "@/app/api/prospection/search/route";

interface ProspectionResultsPanelProps {
  status: "idle" | "running" | "done" | "error";
  statusMessage: string;
  results: SearchProspect[];
  query: string;
  error?: string;
}

export function ProspectionResultsPanel({
  status,
  statusMessage,
  results,
  query,
  error,
}: ProspectionResultsPanelProps) {
  if (status === "idle") {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <p className="text-sm text-white/30">
          Lancez une recherche pour trouver des prospects
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Status indicator */}
      {status === "running" && (
        <div className="glass rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse shrink-0" />
          <p className="text-xs text-white/60">{statusMessage || "Analyse en cours…"}</p>
        </div>
      )}

      {status === "error" && error && (
        <div className="glass-danger rounded-xl p-4">
          <p className="text-sm text-red-400 font-medium">Erreur</p>
          <p className="text-xs text-red-300/70 mt-1">{error}</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/50 font-medium">
            {results.length} prospect{results.length > 1 ? "s" : ""} — &ldquo;{query}&rdquo;
          </span>
          <Link
            href="/prospects"
            className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            Voir dans Prospects →
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {results.map((prospect, i) => (
          <SearchResultCard
            key={`${prospect.nom}-${prospect.ville}`}
            prospect={prospect}
            isTop={i === 0 && prospect.priorite === "HAUTE"}
          />
        ))}
      </div>

      {status === "running" && results.length === 0 && (
        <div className="glass rounded-xl p-6 flex items-center justify-center">
          <p className="text-sm text-white/40 animate-pulse">
            Analyse en cours…
          </p>
        </div>
      )}
    </div>
  );
}
