import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  date: Date;
}

interface RecentActivityProps {
  activites: ActivityItem[];
}

const TYPE_COLORS: Record<string, string> = {
  CREATION: "bg-blue-500",
  CONTACT: "bg-yellow-500",
  MAQUETTE: "bg-purple-500",
  DEVIS: "bg-emerald-500",
  RELANCE: "bg-orange-500",
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
    <Card>
      <CardHeader>
        <CardTitle>Activit&eacute; r&eacute;cente</CardTitle>
      </CardHeader>
      <CardContent>
        {activites.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune activit&eacute;</p>
        ) : (
          <ul className="space-y-3">
            {activites.map((a) => (
              <li key={a.id} className="flex items-start gap-3">
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TYPE_COLORS[a.type] ?? "bg-muted-foreground"}`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug">{a.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(a.date)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
