"use client";

import Link from "next/link";
import { ProspectionProgress } from "./prospection-progress";
import { ProspectResultCard } from "./prospect-result-card";
import type { JobSteps, ProspectResult } from "@/lib/prospection-jobs";

interface ProspectionResultsPanelProps {
  jobStatus: "idle" | "running" | "done" | "error";
  steps: JobSteps;
  results: ProspectResult[];
  query: string;
  error?: string;
}

const IDLE_STEPS: JobSteps = {
  recherche: "idle",
  concurrents: "idle",
  maquettes: "idle",
  deploiement: "idle",
  crm: "idle",
};

export function ProspectionResultsPanel({
  jobStatus,
  steps,
  results,
  query,
  error,
}: ProspectionResultsPanelProps) {
  if (jobStatus === "idle") {
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
      <ProspectionProgress
        steps={steps}
        jobStatus={jobStatus}
      />

      {jobStatus === "error" && error && (
        <div className="glass-danger rounded-xl p-4">
          <p className="text-sm text-red-400 font-medium">Erreur pipeline</p>
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
          <ProspectResultCard
            key={prospect.id || prospect.nom}
            prospect={prospect}
            isTop={i === 0 && prospect.priorite === "HAUTE"}
          />
        ))}
      </div>

      {jobStatus === "running" && results.length === 0 && (
        <div className="glass rounded-xl p-6 flex items-center justify-center">
          <p className="text-sm text-white/40 animate-pulse">
            Analyse en cours…
          </p>
        </div>
      )}
    </div>
  );
}
