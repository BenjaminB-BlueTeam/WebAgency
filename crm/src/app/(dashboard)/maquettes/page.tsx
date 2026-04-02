import { db } from "@/lib/db";
import { MaquetteCard } from "@/components/maquettes/maquette-card";
import { MaquetteValidateActions } from "@/components/maquettes/maquette-validate-actions";

export const dynamic = "force-dynamic";

export default async function MaquettesPage() {
  const maquettes = await db.maquette.findMany({
    include: { prospect: { select: { id: true, nom: true, ville: true } } },
    orderBy: { createdAt: "desc" },
  });

  const pendingCount = maquettes.filter(m => m.statut === "ATTENTE_VALIDATION").length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Maquettes</h1>
        <p className="text-sm text-muted-foreground">
          {maquettes.length} maquette{maquettes.length !== 1 ? "s" : ""}
          {pendingCount > 0 && (
            <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">
              {pendingCount} en attente de validation
            </span>
          )}
        </p>
      </div>

      {maquettes.length === 0 ? (
        <div className="rounded-lg border border-border p-12 text-center text-muted-foreground">
          Aucune maquette pour le moment.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {maquettes.map((m) => (
            <div key={m.id} className="flex flex-col">
              <MaquetteCard
                id={m.id}
                prospect={m.prospect}
                statut={m.statut}
                type={m.type}
                demoUrl={m.demoUrl}
                htmlPath={m.htmlPath}
                githubUrl={m.githubUrl}
                version={m.version}
                createdAt={m.createdAt.toISOString()}
              />
              {m.statut === "ATTENTE_VALIDATION" && (
                <div className="rounded-b-lg border border-t-0 border-border bg-card px-4 pb-3">
                  <MaquetteValidateActions maquetteId={m.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
