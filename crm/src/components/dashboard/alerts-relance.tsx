import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

const PRIORITE_STYLES: Record<string, string> = {
  HAUTE: "bg-red-500/15 text-red-600",
  MOYENNE: "bg-yellow-500/15 text-yellow-600",
  BASSE: "bg-gray-500/15 text-gray-600",
};

export function AlertsRelance({ relances }: AlertsRelanceProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>&Agrave; relancer ({relances.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {relances.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune relance n&eacute;cessaire
          </p>
        ) : (
          <ul className="space-y-3">
            {relances.map((r) => (
              <li key={r.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/prospects/${r.id}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {r.nom}
                  </Link>
                  <p className="text-xs text-muted-foreground">{r.ville}</p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITE_STYLES[r.priorite] ?? PRIORITE_STYLES.BASSE}`}
                >
                  {r.priorite}
                </span>
                <span className="shrink-0 text-xs text-destructive font-medium">
                  {r.daysSinceContact}j
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
