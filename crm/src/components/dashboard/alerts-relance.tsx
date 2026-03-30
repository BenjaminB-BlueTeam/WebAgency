import Link from "next/link";

interface RelanceItem {
  id: string;
  nom: string;
  ville: string;
  priorite: string;
  daysSinceContact: number;
}

interface AlertsRelanceProps {
  relances: RelanceItem[];
}

const PRIORITE_STYLES: Record<string, { badge: string; border: string }> = {
  HAUTE: {
    badge: "bg-red-500/15 text-red-400",
    border: "border border-red-500/30",
  },
  MOYENNE: {
    badge: "bg-yellow-500/15 text-yellow-400",
    border: "border border-yellow-500/30",
  },
  BASSE: {
    badge: "bg-zinc-500/15 text-zinc-400",
    border: "border border-zinc-500/20",
  },
};

export function AlertsRelance({ relances }: AlertsRelanceProps) {
  const hasUrgent = relances.length > 0;

  return (
    <div
      className={`relative overflow-hidden rounded-xl p-4 ${
        hasUrgent ? "glass-danger glow-line-danger" : "glass glow-line"
      }`}
    >
      <p className="mb-3 text-[9px] font-medium uppercase tracking-[0.12em] text-white/40">
        À relancer ({relances.length})
      </p>
      {relances.length === 0 ? (
        <p className="text-sm italic text-white/25">Aucune relance nécessaire</p>
      ) : (
        <ul className="space-y-2.5">
          {relances.map((r) => {
            const style =
              PRIORITE_STYLES[r.priorite] ?? PRIORITE_STYLES.BASSE;
            const daysColor =
              r.daysSinceContact >= 14
                ? "text-red-400"
                : r.daysSinceContact >= 7
                  ? "text-yellow-400"
                  : "text-white/40";
            return (
              <li key={r.id} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/prospects/${r.id}`}
                    className="text-[10px] font-medium text-white/80 transition-colors hover:text-violet-300"
                  >
                    {r.nom}
                  </Link>
                  <p className="text-[9px] text-white/35">{r.ville}</p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-medium ${style.badge} ${style.border}`}
                >
                  {r.priorite}
                </span>
                <span className={`shrink-0 text-[10px] font-medium ${daysColor}`}>
                  {r.daysSinceContact}j
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
