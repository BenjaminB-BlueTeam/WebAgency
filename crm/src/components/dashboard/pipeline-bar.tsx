import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PIPELINE_COLORS: Record<string, string> = {
  PROSPECT: "#f87171",
  CONTACTE: "#fbbf24",
  RDV: "#60a5fa",
  DEVIS: "#a78bfa",
  SIGNE: "#34d399",
  LIVRE: "#22c55e",
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
    <Card>
      <CardHeader>
        <CardTitle>Pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun prospect</p>
        ) : (
          <div className="flex h-10 w-full overflow-hidden rounded-lg border border-border">
            {visible.map((seg, i) => {
              const color = PIPELINE_COLORS[seg.status] ?? "#94a3b8";
              const pct = (seg.count / total) * 100;
              const isFirst = i === 0;
              const isLast = i === visible.length - 1;
              return (
                <div
                  key={seg.status}
                  className="flex items-center justify-center text-xs font-semibold"
                  style={{
                    width: `${pct}%`,
                    minWidth: "3rem",
                    backgroundColor: `${color}40`,
                    color,
                    borderRight: !isLast ? `1px solid ${color}60` : "none",
                    borderRadius: isFirst && isLast ? "0.5rem" : isFirst ? "0.5rem 0 0 0.5rem" : isLast ? "0 0.5rem 0.5rem 0" : "0",
                  }}
                >
                  {seg.count} {PIPELINE_LABELS[seg.status] ?? seg.status}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
