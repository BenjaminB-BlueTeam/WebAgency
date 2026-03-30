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
      <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-white/40">
        {label}
      </p>
      <p className="mt-2 text-[2rem] font-bold leading-none tracking-tight text-white">
        {value}
      </p>
      {subtitle && (
        <p className={cn("mt-1.5 text-[10px]", subtitleColor ?? "text-white/35")}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
