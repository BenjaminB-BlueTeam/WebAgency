import { db } from "@/lib/db";
import { MaquetteCard } from "@/components/maquettes/maquette-card";

export const dynamic = "force-dynamic";

export default async function MaquettesPage() {
  const maquettes = await db.maquette.findMany({
    include: { prospect: { select: { id: true, nom: true, ville: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Maquettes</h1>
        <p className="text-sm text-muted-foreground">
          {maquettes.length} maquette{maquettes.length !== 1 ? "s" : ""}
        </p>
      </div>

      {maquettes.length === 0 ? (
        <div className="rounded-lg border border-border p-12 text-center text-muted-foreground">
          Aucune maquette pour le moment.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {maquettes.map((m) => (
            <MaquetteCard
              key={m.id}
              id={m.id}
              prospect={m.prospect}
              statut={m.statut}
              type={m.type}
              demoUrl={m.demoUrl}
              createdAt={m.createdAt.toISOString()}
            />
          ))}
        </div>
      )}
    </div>
  );
}
