import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MaquettePreview } from "./maquette-preview";

interface MaquetteCardProps {
  id: string;
  prospect: { id: string; nom: string; ville: string } | null;
  statut: string;
  type: string;
  demoUrl: string | null;
  htmlPath: string | null;
  createdAt: string;
  githubUrl?: string | null;
  version?: number | null;
}

const MAQUETTE_STATUT_COLORS: Record<string, string> = {
  BROUILLON: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
  DEPLOYE: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  ENVOYE: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  VALIDE: "bg-green-500/15 text-green-400 border-green-500/20",
  REFUSE: "bg-red-500/15 text-red-400 border-red-500/20",
  ATTENTE_VALIDATION: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  VALIDEE: "bg-green-500/15 text-green-400 border-green-500/20",
  A_CORRIGER: "bg-red-500/15 text-red-400 border-red-500/20",
};

const MAQUETTE_STATUT_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon",
  DEPLOYE: "D\u00e9ploy\u00e9",
  ENVOYE: "Envoy\u00e9",
  VALIDE: "Valid\u00e9",
  REFUSE: "Refus\u00e9",
  ATTENTE_VALIDATION: "En attente",
  VALIDEE: "Valid\u00e9e",
  A_CORRIGER: "\u00c0 corriger",
};


export function MaquetteCard({
  id,
  prospect,
  statut,
  type,
  demoUrl,
  htmlPath,
  createdAt,
  githubUrl,
  version,
}: MaquetteCardProps) {
  const colorClass =
    MAQUETTE_STATUT_COLORS[statut] ?? "bg-zinc-500/15 text-zinc-400 border-zinc-500/20";
  const label = MAQUETTE_STATUT_LABELS[statut] ?? statut;
  const hasPreview = !!(demoUrl || htmlPath);

  return (
    <Link
      href={`/maquettes/${id}`}
      className="group block rounded-lg border border-border bg-card overflow-hidden hover:border-foreground/20 transition-colors"
    >
      <MaquettePreview
        id={id}
        nom={prospect?.nom ?? ""}
        hasPreview={hasPreview}
      />

      {/* Card body */}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium truncate group-hover:text-foreground transition-colors">
              {prospect?.nom ?? "Prospect inconnu"}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              {prospect?.ville ?? ""}
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn("text-[0.65rem] font-medium shrink-0", colorClass)}
          >
            {label}
          </Badge>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="uppercase tracking-wide">{type}</span>
          <span>{new Date(createdAt).toLocaleDateString("fr-FR")}</span>
        </div>

        {/* Version + GitHub */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {version && version > 1 && <span className="text-violet-400/70">v{version}</span>}
          {githubUrl && (
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-white/30 hover:text-white/60 transition-colors"
            >
              GitHub ↗
            </a>
          )}
        </div>
      </div>
    </Link>
  );
}
