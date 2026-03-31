"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Phone,
  Eye,
  MoreVertical,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/shared/status-badge";

interface ProspectRow {
  id: string;
  nom: string;
  activite: string;
  ville: string;
  telephone: string | null;
  email: string | null;
  siteUrl: string | null;
  statut: string;
  priorite: string;
  statutPipeline: string;
  dateAjout: string;
  maquettes: { id: string; statut: string }[];
  _count: { activites: number };
}

interface ProspectsListProps {
  initialData: ProspectRow[];
}

type SortKey = "nom" | "activite" | "ville" | "statut" | "priorite" | "statutPipeline";
type SortDir = "asc" | "desc";

const ALL = "__all__";

const STATUT_OPTIONS = ["SANS_SITE", "SITE_OBSOLETE", "SITE_BASIQUE", "SITE_CORRECT"];
const PRIORITE_OPTIONS = ["HAUTE", "MOYENNE", "FAIBLE"];
const PIPELINE_OPTIONS = ["PROSPECT", "CONTACTE", "RDV", "DEVIS", "SIGNE", "LIVRE"];

function SortIcon({ column, sortKey, sortDir }: { column: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (column !== sortKey) {
    return <ArrowUpDown className="ml-1 size-3.5 text-muted-foreground/50" />;
  }
  return sortDir === "asc" ? (
    <ChevronUp className="ml-1 size-3.5" />
  ) : (
    <ChevronDown className="ml-1 size-3.5" />
  );
}

export function ProspectsList({ initialData }: ProspectsListProps) {
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState<string>(ALL);
  const [filterPriorite, setFilterPriorite] = useState<string>(ALL);
  const [filterPipeline, setFilterPipeline] = useState<string>(ALL);
  const [sortKey, setSortKey] = useState<SortKey>("nom");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return initialData
      .filter((p) => {
        if (q) {
          const haystack = `${p.nom} ${p.ville} ${p.activite}`.toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        if (filterStatut !== ALL && p.statut !== filterStatut) return false;
        if (filterPriorite !== ALL && p.priorite !== filterPriorite) return false;
        if (filterPipeline !== ALL && p.statutPipeline !== filterPipeline) return false;
        return true;
      })
      .sort((a, b) => {
        const aVal = (a[sortKey] ?? "").toLowerCase();
        const bVal = (b[sortKey] ?? "").toLowerCase();
        const cmp = aVal.localeCompare(bVal, "fr");
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [initialData, search, filterStatut, filterPriorite, filterPipeline, sortKey, sortDir]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Prospects</h1>
        <p className="text-sm text-muted-foreground">
          {initialData.length} prospect{initialData.length !== 1 ? "s" : ""} au total
        </p>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, ville, activit\u00e9..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={filterStatut} onValueChange={(v) => setFilterStatut(v ?? ALL)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tous les statuts</SelectItem>
            {STATUT_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterPriorite} onValueChange={(v) => setFilterPriorite(v ?? ALL)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Priorit\u00e9" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Toutes</SelectItem>
            {PRIORITE_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterPipeline} onValueChange={(v) => setFilterPipeline(v ?? ALL)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Pipeline" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tous</SelectItem>
            {PIPELINE_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>
                <button
                  type="button"
                  onClick={() => toggleSort("nom")}
                  className="inline-flex items-center gap-0.5 hover:text-foreground transition-colors"
                >
                  Nom
                  <SortIcon column="nom" sortKey={sortKey} sortDir={sortDir} />
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => toggleSort("activite")}
                  className="inline-flex items-center gap-0.5 hover:text-foreground transition-colors"
                >
                  Activit&eacute;
                  <SortIcon column="activite" sortKey={sortKey} sortDir={sortDir} />
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => toggleSort("ville")}
                  className="inline-flex items-center gap-0.5 hover:text-foreground transition-colors"
                >
                  Ville
                  <SortIcon column="ville" sortKey={sortKey} sortDir={sortDir} />
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => toggleSort("statut")}
                  className="inline-flex items-center gap-0.5 hover:text-foreground transition-colors"
                >
                  Statut
                  <SortIcon column="statut" sortKey={sortKey} sortDir={sortDir} />
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => toggleSort("priorite")}
                  className="inline-flex items-center gap-0.5 hover:text-foreground transition-colors"
                >
                  Priorit&eacute;
                  <SortIcon column="priorite" sortKey={sortKey} sortDir={sortDir} />
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => toggleSort("statutPipeline")}
                  className="inline-flex items-center gap-0.5 hover:text-foreground transition-colors"
                >
                  Pipeline
                  <SortIcon column="statutPipeline" sortKey={sortKey} sortDir={sortDir} />
                </button>
              </TableHead>
              <TableHead>T&eacute;l</TableHead>
              <TableHead className="w-[50px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  Aucun prospect trouv&eacute;
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((prospect) => (
                <TableRow key={prospect.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/prospects/${prospect.id}`}
                      className="hover:underline underline-offset-4 text-foreground"
                    >
                      {prospect.nom}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {prospect.activite}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {prospect.ville}
                  </TableCell>
                  <TableCell>
                    <StatusBadge type="statut" value={prospect.statut} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge type="priorite" value={prospect.priorite} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge type="pipeline" value={prospect.statutPipeline} />
                  </TableCell>
                  <TableCell>
                    {prospect.telephone ? (
                      <a
                        href={`tel:${prospect.telephone}`}
                        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Phone className="size-3.5" />
                        {prospect.telephone}
                      </a>
                    ) : (
                      <span className="text-muted-foreground/50">&mdash;</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="inline-flex items-center justify-center size-8 rounded-md hover:bg-muted transition-colors"
                      >
                        <MoreVertical className="size-4" />
                        <span className="sr-only">Actions</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          render={
                            <Link href={`/prospects/${prospect.id}`} />
                          }
                        >
                          <Eye className="size-4" />
                          Voir la fiche
                        </DropdownMenuItem>
                        {prospect.telephone && (
                          <DropdownMenuItem
                            render={
                              <a href={`tel:${prospect.telephone}`} />
                            }
                          >
                            <Phone className="size-4" />
                            Appeler
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer count */}
      {filtered.length > 0 && filtered.length !== initialData.length && (
        <p className="text-xs text-muted-foreground">
          {filtered.length} r&eacute;sultat{filtered.length !== 1 ? "s" : ""} sur {initialData.length}
        </p>
      )}
    </div>
  );
}
