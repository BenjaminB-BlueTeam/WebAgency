"use client";

import { useRouter } from "next/navigation";
import {
  Phone,
  Mail,
  Globe,
  MapPin,
  ExternalLink,
} from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/status-badge";

const PIPELINE_OPTIONS = [
  { value: "PROSPECT", label: "Prospect" },
  { value: "CONTACTE", label: "Contacté" },
  { value: "RDV", label: "RDV" },
  { value: "DEVIS", label: "Devis" },
  { value: "SIGNE", label: "Signé" },
  { value: "LIVRE", label: "Livré" },
];

interface ProspectHeaderProps {
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
}

export function ProspectHeader({
  id,
  nom,
  activite,
  ville,
  telephone,
  email,
  siteUrl,
  statut,
  priorite,
  statutPipeline,
}: ProspectHeaderProps) {
  const router = useRouter();

  async function updatePipeline(newStatus: string) {
    await fetch(`/api/prospects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statutPipeline: newStatus }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Pipeline selector row */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Pipeline :</span>
          <Select value={statutPipeline} onValueChange={(v) => v && updatePipeline(v)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Pipeline" />
            </SelectTrigger>
            <SelectContent>
              {PIPELINE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Name and badges */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{nom}</h1>
          <StatusBadge type="statut" value={statut} />
          <StatusBadge type="priorite" value={priorite} />
        </div>

        <p className="text-sm text-muted-foreground">
          {activite} <span className="mx-1">&middot;</span>
          <MapPin className="inline size-3.5 -mt-0.5" /> {ville}
        </p>

        {/* Contact info */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {telephone && (
            <a
              href={`tel:${telephone}`}
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Phone className="size-3.5" />
              {telephone}
            </a>
          )}
          {email && (
            <a
              href={`mailto:${email}`}
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Mail className="size-3.5" />
              {email}
            </a>
          )}
          {siteUrl && (
            <a
              href={siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Globe className="size-3.5" />
              {siteUrl}
              <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
