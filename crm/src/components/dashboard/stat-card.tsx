import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  subtitleColor?: string;
  variant?: "default" | "violet" | "danger";
}

export function StatCard({
  label,
  value,
  subtitle,
  subtitleColor,
  variant = "default",
}: StatCardProps) {
  const glassClass =
    variant === "violet"
      ? "glass-violet"
      : variant === "danger"
        ? "glass-danger"
        : "glass";

  const glowLineClass =
    variant === "danger" ? "glow-line-danger" : "glow-line";

  return (
    <div
      className={cn(
        "relative rounded-xl p-4 overflow-hidden",
        glassClass,
        glowLineClass
      )}
    >
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/40">
        {label}
      </p>
      <p className="mt-2 font-bold leading-none tracking-tight text-white" style={{ fontSize: "clamp(1.5rem, 3.5vw, 2rem)" }}>
        {value}
      </p>
      {subtitle && (
        <p className={cn("mt-1.5 text-xs", subtitleColor ?? "text-white/35")}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
