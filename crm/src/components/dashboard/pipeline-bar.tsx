const PIPELINE_COLORS: Record<
  string,
  { from: string; to: string; glow: string; dot: string }
> = {
  PROSPECT: {
    from: "#ef4444",
    to: "#dc2626",
    glow: "rgba(239,68,68,0.4)",
    dot: "#ef4444",
  },
  CONTACTE: {
    from: "#eab308",
    to: "#ca8a04",
    glow: "rgba(234,179,8,0.4)",
    dot: "#eab308",
  },
  RDV: {
    from: "#3b82f6",
    to: "#2563eb",
    glow: "rgba(59,130,246,0.4)",
    dot: "#3b82f6",
  },
  DEVIS: {
    from: "#a855f7",
    to: "#9333ea",
    glow: "rgba(168,85,247,0.4)",
    dot: "#a855f7",
  },
  SIGNE: {
    from: "#22c55e",
    to: "#16a34a",
    glow: "rgba(34,197,94,0.4)",
    dot: "#22c55e",
  },
  LIVRE: {
    from: "#10b981",
    to: "#059669",
    glow: "rgba(16,185,129,0.4)",
    dot: "#10b981",
  },
};

const PIPELINE_LABELS: Record<string, string> = {
  PROSPECT: "Prospect",
  CONTACTE: "Contacté",
  RDV: "RDV",
  DEVIS: "Devis",
  SIGNE: "Signé",
  LIVRE: "Livré",
};

interface PipelineBarProps {
  segments: { status: string; count: number }[];
}

export function PipelineBar({ segments }: PipelineBarProps) {
  const total = segments.reduce((sum, s) => sum + s.count, 0);
  const visible = segments.filter((s) => s.count > 0);

  return (
    <div className="glass glow-line relative overflow-hidden rounded-xl p-4">
      <p className="mb-3 text-[9px] font-medium uppercase tracking-[0.12em] text-white/40">
        Pipeline
      </p>
      {total === 0 ? (
        <p className="text-sm text-white/30">Aucun prospect</p>
      ) : (
        <>
          {/* Barre segmentée */}
          <div className="mb-3 flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full">
            {visible.map((seg) => {
              const c = PIPELINE_COLORS[seg.status] ?? {
                from: "#94a3b8",
                to: "#64748b",
                glow: "rgba(148,163,184,0.3)",
                dot: "#94a3b8",
              };
              const pct = (seg.count / total) * 100;
              return (
                <div
                  key={seg.status}
                  style={{
                    width: `${pct}%`,
                    minWidth: "1.5rem",
                    background: `linear-gradient(90deg, ${c.from}, ${c.to})`,
                    boxShadow: `0 0 8px ${c.glow}`,
                  }}
                />
              );
            })}
          </div>

          {/* Légende dots */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {visible.map((seg) => {
              const c = PIPELINE_COLORS[seg.status] ?? {
                from: "#94a3b8",
                to: "#64748b",
                glow: "rgba(148,163,184,0.3)",
                dot: "#94a3b8",
              };
              return (
                <span
                  key={seg.status}
                  className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.08em] text-white/50"
                >
                  <span
                    className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor: c.dot,
                      boxShadow: `0 0 4px ${c.glow}`,
                    }}
                  />
                  {PIPELINE_LABELS[seg.status] ?? seg.status} · {seg.count}
                </span>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
