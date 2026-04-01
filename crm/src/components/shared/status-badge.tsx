import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  type: "statut" | "priorite" | "pipeline";
  value: string;
}

const STATUT_COLORS: Record<string, string> = {
  SANS_SITE: "bg-red-500/15 text-red-400 border-red-500/20",
  SITE_OBSOLETE: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  SITE_BASIQUE: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  SITE_CORRECT: "bg-green-500/15 text-green-400 border-green-500/20",
};

const PRIORITE_COLORS: Record<string, string> = {
  HAUTE: "bg-red-500/15 text-red-400 border-red-500/20",
  MOYENNE: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  FAIBLE: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
};

const PIPELINE_COLORS: Record<string, string> = {
  PROSPECT: "bg-red-500/15 text-red-400 border-red-500/20",
  CONTACTE: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  RDV: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  DEVIS: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  SIGNE: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  LIVRE: "bg-green-500/15 text-green-400 border-green-500/20",
};

const LABELS: Record<string, Record<string, string>> = {
  statut: {
    SANS_SITE: "Sans site",
    SITE_OBSOLETE: "Obsol\u00e8te",
    SITE_BASIQUE: "Basique",
    SITE_CORRECT: "Correct",
  },
  priorite: {
    HAUTE: "Haute",
    MOYENNE: "Moyenne",
    FAIBLE: "Faible",
  },
  pipeline: {
    PROSPECT: "Prospect",
    CONTACTE: "Contact\u00e9",
    RDV: "RDV",
    DEVIS: "Devis",
    SIGNE: "Sign\u00e9",
    LIVRE: "Livr\u00e9",
  },
};

const COLOR_MAPS: Record<string, Record<string, string>> = {
  statut: STATUT_COLORS,
  priorite: PRIORITE_COLORS,
  pipeline: PIPELINE_COLORS,
};

export function ScoreBadge({ score }: { score?: number }) {
  if (score === undefined || score === null) return null;
  const color = score >= 60 ? 'bg-red-100 text-red-700 border-red-200' 
    : score >= 30 ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
    : 'bg-green-100 text-green-700 border-green-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${color}`}>
      {score}pts
    </span>
  );
}

export function StatusBadge({ type, value }: StatusBadgeProps) {
  const colorMap = COLOR_MAPS[type] ?? {};
  const colorClass = colorMap[value] ?? "bg-zinc-500/15 text-zinc-400 border-zinc-500/20";
  const label = LABELS[type]?.[value] ?? value;

  return (
    <Badge
      variant="outline"
      className={cn("text-[0.7rem] font-medium", colorClass)}
    >
      {label}
    </Badge>
  );
}
