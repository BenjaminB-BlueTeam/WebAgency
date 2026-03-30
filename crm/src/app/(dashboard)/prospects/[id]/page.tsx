import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ProspectHeader } from "@/components/prospects/prospect-header";
import { ProspectTimeline } from "@/components/prospects/prospect-timeline";
import { AddNoteDialog } from "@/components/prospects/add-note-dialog";

export const dynamic = "force-dynamic";

export default async function ProspectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const prospect = await db.prospect.findUnique({
    where: { id },
    include: {
      maquettes: true,
      activites: { orderBy: { date: "desc" }, take: 20 },
    },
  });

  if (!prospect) notFound();

  // Serialize dates for client components
  const headerProps = {
    id: prospect.id,
    nom: prospect.nom,
    activite: prospect.activite,
    ville: prospect.ville,
    telephone: prospect.telephone,
    email: prospect.email,
    siteUrl: prospect.siteUrl,
    statut: prospect.statut,
    priorite: prospect.priorite,
    statutPipeline: prospect.statutPipeline,
  };

  const activites = prospect.activites.map((a) => ({
    id: a.id,
    type: a.type,
    description: a.description,
    date: a.date.toISOString(),
  }));

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        href="/prospects"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Retour aux prospects
      </Link>

      {/* Header with pipeline selector */}
      <ProspectHeader {...headerProps} />

      {/* Argument commercial */}
      <Card>
        <CardHeader>
          <CardTitle>Argument commercial</CardTitle>
        </CardHeader>
        <CardContent>
          {prospect.argumentCommercial ? (
            <p className="text-sm italic text-muted-foreground leading-relaxed">
              {prospect.argumentCommercial}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground/60">
              Aucun argument généré
            </p>
          )}
        </CardContent>
      </Card>

      {/* Two-column grid: maquettes + add note */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Maquettes */}
        <Card>
          <CardHeader>
            <CardTitle>
              Maquettes ({prospect.maquettes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {prospect.maquettes.length === 0 ? (
              <p className="text-sm text-muted-foreground/60">
                Aucune maquette
              </p>
            ) : (
              <div className="space-y-3">
                {prospect.maquettes.map((maquette) => (
                  <div
                    key={maquette.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium uppercase">
                          {maquette.type}
                        </span>
                        <StatusBadge
                          type="pipeline"
                          value={maquette.statut}
                        />
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs">
                        {maquette.demoUrl && (
                          <a
                            href={maquette.demoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Démo
                            <ExternalLink className="size-3" />
                          </a>
                        )}
                        {maquette.propositionUrl && (
                          <a
                            href={maquette.propositionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Proposition
                            <ExternalLink className="size-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add note card */}
        <Card>
          <CardHeader>
            <CardTitle>Actions rapides</CardTitle>
          </CardHeader>
          <CardContent>
            <AddNoteDialog prospectId={prospect.id} />
          </CardContent>
        </Card>
      </div>

      {/* Activity timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Historique d&apos;activité</CardTitle>
        </CardHeader>
        <CardContent>
          <ProspectTimeline activites={activites} />
        </CardContent>
      </Card>
    </div>
  );
}
