import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
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
import { MaquetteSection } from "@/components/prospects/maquette-section";
import { EmailSection } from "@/components/prospects/email-section";
import { ResumeEchangesSection } from "@/components/prospects/resume-echanges-section";

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
      maquettes: { orderBy: { createdAt: "desc" } },
      activites: { orderBy: { date: "desc" }, take: 20 },
    },
  });

  if (!prospect) notFound();

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

  const latestMaquette = prospect.maquettes[0] ?? null;
  const maquetteData = latestMaquette
    ? { id: latestMaquette.id, demoUrl: latestMaquette.demoUrl, statut: latestMaquette.statut }
    : null;

  return (
    <div className="space-y-6">
      <Link
        href="/prospects"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Retour aux prospects
      </Link>

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

      {/* Résumé des échanges */}
      <ResumeEchangesSection prospectId={prospect.id} />

      {/* Maquette + Email + Actions (3 colonnes) */}
      <div className="grid gap-6 md:grid-cols-3">
        <MaquetteSection prospectId={prospect.id} initialMaquette={maquetteData} />
        <EmailSection prospectId={prospect.id} />
        <Card>
          <CardHeader>
            <CardTitle>Actions rapides</CardTitle>
          </CardHeader>
          <CardContent>
            <AddNoteDialog prospectId={prospect.id} />
          </CardContent>
        </Card>
      </div>

      {/* Legacy maquettes list (other maquettes) */}
      {prospect.maquettes.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Autres maquettes ({prospect.maquettes.length - 1})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {prospect.maquettes.slice(1).map((maquette) => (
                <div
                  key={maquette.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium uppercase">{maquette.type}</span>
                      <StatusBadge type="pipeline" value={maquette.statut} />
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs">
                      {maquette.demoUrl && (
                        <a
                          href={maquette.demoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Démo <ExternalLink className="size-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
