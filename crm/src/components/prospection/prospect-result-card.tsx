"use client";

import Link from "next/link";
import { ExternalLink, MapPin, Phone, Mail, Globe, Star, ArrowRight } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import type { ProspectResult } from "@/lib/prospection-jobs";

interface ProspectResultCardProps {
  prospect: ProspectResult;
  isTop?: boolean;
}

export function ProspectResultCard({ prospect, isTop = false }: ProspectResultCardProps) {
  const hasMaquette = prospect.maquettes.length > 0;
  const demoUrl = prospect.maquettes.find((m) => m.demoUrl)?.demoUrl;
  const maquetteId = prospect.maquettes[0]?.id;

  return (
    <div
      className={cn(
        "rounded-xl p-4",
        isTop ? "glass-violet" : "glass"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-white">{prospect.nom}</span>
            <StatusBadge type="priorite" value={prospect.priorite} />
            <StatusBadge type="statut" value={prospect.statut} />
          </div>
          <p className="text-xs text-white/50 mt-0.5">
            {prospect.activite} · {prospect.ville}
          </p>
        </div>
        {hasMaquette && (
          <span className="shrink-0 text-[0.65rem] font-medium text-green-400 bg-green-400/10 border border-green-400/25 rounded px-2 py-0.5">
            ✓ Maquette prête
          </span>
        )}
      </div>

      {/* Contact details grid */}
      <div className="grid grid-cols-2 gap-2 mb-3 bg-black/20 rounded-lg p-3">
        <DetailRow icon={<MapPin className="w-3 h-3" />} label="Adresse" value={prospect.adresse} />
        <DetailRow icon={<Phone className="w-3 h-3" />} label="Téléphone" value={prospect.telephone} />
        <DetailRow icon={<Mail className="w-3 h-3" />} label="Email" value={prospect.email} />
        <DetailRow
          icon={<Globe className="w-3 h-3" />}
          label="Site actuel"
          value={prospect.siteUrl}
          isUrl
          statusHint={prospect.statut}
        />
        {prospect.noteGoogle !== null && (
          <DetailRow
            icon={<Star className="w-3 h-3" />}
            label="Note Google"
            value={`${prospect.noteGoogle} / 5`}
          />
        )}
      </div>

      {/* Commercial argument */}
      {prospect.argumentCommercial && (
        <div className="border-l-2 border-violet-400/40 pl-3 py-1 mb-3 bg-violet-500/5 rounded-r">
          <p className="text-[0.65rem] text-violet-300 uppercase tracking-wide mb-0.5">
            Argument commercial
          </p>
          <p className="text-xs text-slate-300 italic">
            &ldquo;{prospect.argumentCommercial}&rdquo;
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {demoUrl && (
          <a
            href={demoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold text-violet-300 bg-violet-500/20 border border-violet-500/40 hover:bg-violet-500/30 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Voir maquette
          </a>
        )}
        {maquetteId && (
          <Link
            href={`/maquettes/${maquetteId}`}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-violet-400 bg-violet-500/10 border border-violet-500/25 hover:bg-violet-500/20 transition-colors"
          >
            Proposition
          </Link>
        )}
        {prospect.id && (
          <Link
            href={`/prospects/${prospect.id}`}
            className="flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs text-white/50 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            Fiche <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
  isUrl = false,
  statusHint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
  isUrl?: boolean;
  statusHint?: string;
}) {
  const display = value ?? "—";
  const isObsolete = isUrl && statusHint === "SITE_OBSOLETE";

  return (
    <div className="flex items-start gap-1.5">
      <span className="text-white/40 mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[0.6rem] text-white/30 uppercase tracking-wide leading-none mb-0.5">
          {label}
        </p>
        <p
          className={cn(
            "text-[0.7rem] truncate",
            !value ? "text-white/30" : isObsolete ? "text-yellow-400" : "text-white/80"
          )}
        >
          {isObsolete ? `${display} (obsolète)` : display}
        </p>
      </div>
    </div>
  );
}
