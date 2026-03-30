import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MaquetteCardProps {
  id: string;
  prospect: { id: string; nom: string; ville: string } | null;
  statut: string;
  type: string;
  demoUrl: string | null;
  createdAt: string;
}

const MAQUETTE_STATUT_COLORS: Record<string, string> = {
  BROUILLON: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
  DEPLOYE: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  ENVOYE: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  VALIDE: "bg-green-500/15 text-green-400 border-green-500/20",
  REFUSE: "bg-red-500/15 text-red-400 border-red-500/20",
};

const MAQUETTE_STATUT_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon",
  DEPLOYE: "D\u00e9ploy\u00e9",
  ENVOYE: "Envoy\u00e9",
  VALIDE: "Valid\u00e9",
  REFUSE: "Refus\u00e9",
};

function getGradient(name: string): string {
  const initial = (name || "?").charAt(0).toUpperCase();
  const code = initial.charCodeAt(0);
  const hue = (code * 37) % 360;
  return `linear-gradient(135deg, hsl(${hue}, 60%, 30%), hsl(${(hue + 60) % 360}, 50%, 20%))`;
}

export function MaquetteCard({
  id,
  prospect,
  statut,
  type,
  demoUrl,
  createdAt,
}: MaquetteCardProps) {
  const colorClass =
    MAQUETTE_STATUT_COLORS[statut] ?? "bg-zinc-500/15 text-zinc-400 border-zinc-500/20";
  const label = MAQUETTE_STATUT_LABELS[statut] ?? statut;

  return (
    <Link
      href={`/maquettes/${id}`}
      className="group block rounded-lg border border-border bg-card overflow-hidden hover:border-foreground/20 transition-colors"
    >
      {/* Colored placeholder area */}
      <div
        className="h-40 flex items-center justify-center text-4xl font-bold text-white/60"
        style={{ background: getGradient(prospect?.nom ?? "") }}
      >
        {(prospect?.nom ?? "?").charAt(0).toUpperCase()}
      </div>

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
      </div>
    </Link>
  );
}
