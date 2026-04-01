"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

interface ProspectRow {
  id: string;
  nom: string;
  activite: string;
  ville: string;
  telephone: string | null;
  email: string | null;
  siteUrl: string | null;
  statut: string;
  priorite: string;
  statutPipeline: string;
  dateAjout: string;
  maquettes: { id: string; statut: string; demoUrl: string | null }[];
  _count: { activites: number };
}

interface PipelineKanbanProps {
  initialData: ProspectRow[];
}

const PIPELINE_STAGES = ["PROSPECT", "CONTACTE", "RDV", "DEVIS", "SIGNE", "LIVRE"] as const;

const PIPELINE_LABELS: Record<string, string> = {
  PROSPECT: "Prospect",
  CONTACTE: "Contacté",
  RDV: "RDV",
  DEVIS: "Devis",
  SIGNE: "Signé",
  LIVRE: "Livré",
};

const PIPELINE_COLORS: Record<string, { bg: string; text: string; border: string; headerBg: string }> = {
  PROSPECT: { bg: "bg-red-500/5", text: "text-red-400", border: "border-red-500/20", headerBg: "bg-red-500/10" },
  CONTACTE: { bg: "bg-yellow-500/5", text: "text-yellow-400", border: "border-yellow-500/20", headerBg: "bg-yellow-500/10" },
  RDV: { bg: "bg-blue-500/5", text: "text-blue-400", border: "border-blue-500/20", headerBg: "bg-blue-500/10" },
  DEVIS: { bg: "bg-purple-500/5", text: "text-purple-400", border: "border-purple-500/20", headerBg: "bg-purple-500/10" },
  SIGNE: { bg: "bg-emerald-500/5", text: "text-emerald-400", border: "border-emerald-500/20", headerBg: "bg-emerald-500/10" },
  LIVRE: { bg: "bg-green-500/5", text: "text-green-400", border: "border-green-500/20", headerBg: "bg-green-500/10" },
};

export function PipelineKanban({ initialData }: PipelineKanbanProps) {
  const router = useRouter();
  const [prospects, setProspects] = useState<ProspectRow[]>(initialData);
  const [movingId, setMovingId] = useState<string | null>(null);

  const moveProspect = useCallback(
    async (prospectId: string, newStatus: string) => {
      setMovingId(prospectId);

      // Optimistic update
      setProspects((prev) =>
        prev.map((p) =>
          p.id === prospectId ? { ...p, statutPipeline: newStatus } : p
        )
      );

      try {
        const res = await fetch(`/api/prospects/${prospectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ statutPipeline: newStatus }),
        });

        if (!res.ok) {
          // Revert on failure
          setProspects(initialData);
        } else {
          router.refresh();
        }
      } catch {
        // Revert on error
        setProspects(initialData);
      } finally {
        setMovingId(null);
      }
    },
    [initialData, router]
  );

  // Group prospects by pipeline stage
  const columns = PIPELINE_STAGES.map((stage) => ({
    stage,
    label: PIPELINE_LABELS[stage],
    colors: PIPELINE_COLORS[stage],
    prospects: prospects.filter((p) => p.statutPipeline === stage),
  }));

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-3 min-w-max">
        {columns.map((col) => (
          <div
            key={col.stage}
            className={`flex min-w-[220px] w-[220px] flex-col rounded-lg border ${col.colors.border} ${col.colors.bg}`}
          >
            {/* Column header */}
            <div
              className={`flex items-center justify-between rounded-t-lg px-3 py-2 ${col.colors.headerBg}`}
            >
              <span className={`text-sm font-semibold ${col.colors.text}`}>
                {col.label}
              </span>
              <span
                className={`inline-flex size-5 items-center justify-center rounded-full text-xs font-medium ${col.colors.text} ${col.colors.headerBg}`}
              >
                {col.prospects.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex flex-1 flex-col gap-2 p-2">
              {col.prospects.length === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground/50">
                  Aucun prospect
                </p>
              )}

              {col.prospects.map((prospect) => (
                <KanbanCard
                  key={prospect.id}
                  prospect={prospect}
                  currentStage={col.stage}
                  isMoving={movingId === prospect.id}
                  onMove={moveProspect}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KanbanCard({
  prospect,
  currentStage,
  isMoving,
  onMove,
}: {
  prospect: ProspectRow;
  currentStage: string;
  isMoving: boolean;
  onMove: (id: string, newStatus: string) => void;
}) {
  const otherStages = PIPELINE_STAGES.filter((s) => s !== currentStage);

  return (
    <div
      className={`group relative rounded-md border border-border bg-card p-2.5 transition-opacity ${
        isMoving ? "opacity-50" : ""
      }`}
    >
      {/* Name - clickable */}
      <Link
        href={`/prospects/${prospect.id}`}
        className="block text-sm font-semibold text-foreground hover:underline underline-offset-2"
      >
        {prospect.nom}
      </Link>

      {/* Activity + City */}
      <p className="mt-0.5 text-xs text-muted-foreground truncate">
        {prospect.activite}
      </p>
      <p className="text-xs text-muted-foreground/70 truncate">
        {prospect.ville}
      </p>

      {/* Priority badge + Move dropdown */}
      <div className="mt-1.5 flex items-center justify-between gap-1">
        <StatusBadge type="priorite" value={prospect.priorite} />

        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[0.65rem] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            Déplacer
            <ChevronRight className="size-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="bottom">
            {otherStages.map((stage) => {
              const colors = PIPELINE_COLORS[stage];
              return (
                <DropdownMenuItem
                  key={stage}
                  className={`text-xs ${colors.text}`}
                  onClick={() => onMove(prospect.id, stage)}
                >
                  {PIPELINE_LABELS[stage]}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
