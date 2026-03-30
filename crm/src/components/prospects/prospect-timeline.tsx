import { cn } from "@/lib/utils";

const TYPE_COLORS: Record<string, string> = {
  APPEL: "bg-blue-500",
  EMAIL: "bg-purple-500",
  SMS: "bg-green-500",
  VISITE: "bg-amber-500",
  RDV: "bg-cyan-500",
  MAQUETTE: "bg-pink-500",
  DEVIS: "bg-indigo-500",
  FACTURE: "bg-teal-500",
  NOTE: "bg-zinc-400",
};

const TYPE_LABELS: Record<string, string> = {
  APPEL: "Appel",
  EMAIL: "Email",
  SMS: "SMS",
  VISITE: "Visite",
  RDV: "RDV",
  MAQUETTE: "Maquette",
  DEVIS: "Devis",
  FACTURE: "Facture",
  NOTE: "Note",
};

interface Activite {
  id: string;
  type: string;
  description: string;
  date: string | Date;
}

interface ProspectTimelineProps {
  activites: Activite[];
}

function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ProspectTimeline({ activites }: ProspectTimelineProps) {
  if (activites.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Aucune activité enregistrée
      </p>
    );
  }

  return (
    <div className="space-y-0">
      {activites.map((activite, index) => (
        <div key={activite.id} className="flex gap-3 py-3">
          {/* Timeline dot + line */}
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "mt-1 size-2.5 shrink-0 rounded-full",
                TYPE_COLORS[activite.type] ?? "bg-zinc-400"
              )}
            />
            {index < activites.length - 1 && (
              <div className="w-px flex-1 bg-border mt-1" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {TYPE_LABELS[activite.type] ?? activite.type}
              </span>
              <span className="text-xs text-muted-foreground/60">
                {formatDate(activite.date)}
              </span>
            </div>
            <p className="text-sm mt-0.5">{activite.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
