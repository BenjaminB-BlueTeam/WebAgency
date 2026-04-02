interface ActivityItem {
  id: string;
  type: string;
  description: string;
  date: Date;
}

interface RecentActivityProps {
  activites: ActivityItem[];
}

const TYPE_DOT_COLORS: Record<string, { bg: string; glow: string }> = {
  CREATION: { bg: "#3b82f6", glow: "rgba(59,130,246,0.5)" },
  CONTACT: { bg: "#eab308", glow: "rgba(234,179,8,0.4)" },
  MAQUETTE: { bg: "#a78bfa", glow: "rgba(167,139,250,0.5)" },
  DEVIS: { bg: "#34d399", glow: "rgba(52,211,153,0.4)" },
  RELANCE: { bg: "#fb923c", glow: "rgba(251,146,60,0.4)" },
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function RecentActivity({ activites }: RecentActivityProps) {
  return (
    <div className="glass glow-line relative overflow-hidden rounded-xl p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-white/40">
        Activité récente
      </p>
      {activites.length === 0 ? (
        <p className="text-sm italic text-white/25">Aucune activité</p>
      ) : (
        <ul className="space-y-2.5">
          {activites.map((a) => {
            const dot = TYPE_DOT_COLORS[a.type] ?? {
              bg: "#71717a",
              glow: "rgba(113,113,122,0.3)",
            };
            return (
              <li key={a.id} className="flex items-center gap-3">
                <span
                  className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor: dot.bg,
                    boxShadow: `0 0 6px ${dot.glow}`,
                  }}
                />
                <p className="min-w-0 flex-1 truncate text-xs leading-snug text-white/70">
                  {a.description}
                </p>
                <span className="shrink-0 text-[10px] text-white/25">
                  {formatDate(a.date)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
