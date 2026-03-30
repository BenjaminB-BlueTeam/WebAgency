import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  subtitleColor?: string;
}

export function StatCard({ label, value, subtitle, subtitleColor }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 text-3xl font-bold">{value}</p>
        {subtitle && (
          <p className={`mt-1 text-sm ${subtitleColor ?? "text-muted-foreground"}`}>
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
