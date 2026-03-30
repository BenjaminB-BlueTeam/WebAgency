import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { MaquetteActions } from "@/components/maquettes/maquette-actions";

export const dynamic = "force-dynamic";

export default async function MaquetteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const maquette = await db.maquette.findUnique({
    where: { id },
    include: { prospect: true },
  });

  if (!maquette) notFound();

  const data = {
    id: maquette.id,
    statut: maquette.statut,
    type: maquette.type,
    demoUrl: maquette.demoUrl,
    propositionUrl: maquette.propositionUrl,
    retourClient: maquette.retourClient,
    dateCreation: maquette.dateCreation.toISOString(),
    prospect: maquette.prospect
      ? {
          id: maquette.prospect.id,
          nom: maquette.prospect.nom,
          ville: maquette.prospect.ville,
        }
      : null,
  };

  return (
    <div className="space-y-6">
      {/* Back button + header */}
      <div className="flex items-center gap-4">
        <Link href="/maquettes">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="size-4" />
            Retour
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {data.prospect?.nom ?? "Maquette"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {data.prospect?.ville ?? ""} &middot; {data.type.toUpperCase()} &middot;{" "}
            {new Date(data.dateCreation).toLocaleDateString("fr-FR")}
          </p>
        </div>
      </div>

      {/* iframe preview */}
      {data.demoUrl ? (
        <div className="rounded-lg border border-border overflow-hidden">
          <iframe
            src={data.demoUrl}
            className="w-full h-[70vh]"
            title={`Aper\u00e7u - ${data.prospect?.nom ?? "Maquette"}`}
          />
        </div>
      ) : (
        <div className="rounded-lg border border-border p-12 text-center text-muted-foreground">
          Aucune d&eacute;mo d&eacute;ploy&eacute;e
        </div>
      )}

      {/* Info card */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date de cr&eacute;ation</span>
              <span>{new Date(data.dateCreation).toLocaleDateString("fr-FR")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <span className="uppercase">{data.type}</span>
            </div>
            {data.demoUrl && (
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground shrink-0">URL D&eacute;mo</span>
                <a
                  href={data.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 truncate inline-flex items-center gap-1"
                >
                  {data.demoUrl}
                  <ExternalLink className="size-3 shrink-0" />
                </a>
              </div>
            )}
            {data.propositionUrl && (
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground shrink-0">Proposition</span>
                <a
                  href={data.propositionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 truncate inline-flex items-center gap-1"
                >
                  {data.propositionUrl}
                  <ExternalLink className="size-3 shrink-0" />
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions card (client component) */}
        <MaquetteActions
          id={data.id}
          statut={data.statut}
          retourClient={data.retourClient}
          demoUrl={data.demoUrl}
          propositionUrl={data.propositionUrl}
          prospectNom={data.prospect?.nom ?? ""}
        />
      </div>
    </div>
  );
}
