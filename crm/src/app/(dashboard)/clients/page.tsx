import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await db.prospect.findMany({
    where: { statutPipeline: { in: ["SIGNE", "LIVRE"] } },
    include: { maquettes: { select: { id: true, demoUrl: true } } },
    orderBy: { dateSignature: "desc" },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
        <p className="text-sm text-muted-foreground">
          {clients.length} client{clients.length !== 1 ? "s" : ""} au total
        </p>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Nom</TableHead>
              <TableHead>Activit&eacute;</TableHead>
              <TableHead>Ville</TableHead>
              <TableHead>Pipeline</TableHead>
              <TableHead>Date signature</TableHead>
              <TableHead>Maquette</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  Aucun client pour le moment — signez votre premier prospect !
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client) => {
                const maquette = client.maquettes[0];
                return (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/prospects/${client.id}`}
                        className="hover:underline underline-offset-4 text-foreground"
                      >
                        {client.nom}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {client.activite}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {client.ville}
                    </TableCell>
                    <TableCell>
                      <StatusBadge type="pipeline" value={client.statutPipeline} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {client.dateSignature
                        ? new Date(client.dateSignature).toLocaleDateString("fr-FR")
                        : "\u2014"}
                    </TableCell>
                    <TableCell>
                      {maquette?.demoUrl ? (
                        <a
                          href={maquette.demoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <ExternalLink className="size-3.5" />
                          D&eacute;mo
                        </a>
                      ) : maquette ? (
                        <Link
                          href={`/maquettes/${maquette.id}`}
                          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Voir maquette
                        </Link>
                      ) : (
                        <span className="text-muted-foreground/50">&mdash;</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
