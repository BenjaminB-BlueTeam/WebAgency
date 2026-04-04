"use client"

import { useState } from "react"
import { Phone, Mail, MapPin, Globe, Star } from "lucide-react"
import type { ProspectWithRelations } from "@/types/prospect"
import { STATUT_PIPELINE_VALUES } from "@/lib/validation"
import { ScorePastille } from "./score-pastille"
import { ScoreBar } from "./score-bar"
import { ProspectNotes } from "./prospect-notes"

const STATUT_LABELS: Record<string, string> = {
  A_DEMARCHER: "A démarcher",
  CONTACTE: "Contacté",
  RDV_PLANIFIE: "RDV planifié",
  MAQUETTE_ENVOYEE: "Maquette envoyée",
  RELANCE: "Relance",
  SIGNE: "Signé",
  PERDU: "Perdu",
}

interface ProspectInfoTabProps {
  prospect: ProspectWithRelations
}

export function ProspectInfoTab({ prospect }: ProspectInfoTabProps) {
  const [statutPipeline, setStatutPipeline] = useState(prospect.statutPipeline)

  async function handleStatutChange(newStatut: string) {
    const previous = statutPipeline
    setStatutPipeline(newStatut)

    try {
      const res = await fetch(`/api/prospects/${prospect.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statutPipeline: newStatut }),
      })
      if (!res.ok) throw new Error("Erreur lors de la mise à jour du statut")
    } catch {
      setStatutPipeline(previous)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Statut pipeline */}
      <div className="rounded-[6px] border border-[#1a1a1a] bg-[#0a0a0a] p-4">
        <p className="mb-2 text-xs text-[#555555] uppercase tracking-wider">Statut pipeline</p>
        <select
          value={statutPipeline}
          onChange={(e) => handleStatutChange(e.target.value)}
          className="w-full rounded-[6px] border border-[#1a1a1a] bg-black px-3 py-2 text-sm text-[#fafafa] outline-none focus:border-[#333] transition-colors appearance-none cursor-pointer"
        >
          {STATUT_PIPELINE_VALUES.map((val) => (
            <option key={val} value={val}>
              {STATUT_LABELS[val] ?? val}
            </option>
          ))}
        </select>
      </div>

      {/* Contact info */}
      <div className="rounded-[6px] border border-[#1a1a1a] bg-[#0a0a0a] p-4">
        <p className="mb-3 text-xs text-[#555555] uppercase tracking-wider">Coordonnées</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Téléphone */}
          <div className="flex items-start gap-2">
            <Phone size={14} className="mt-0.5 shrink-0 text-[#555555]" />
            <div className="min-w-0">
              <p className="text-xs text-[#555555]">Téléphone</p>
              {prospect.telephone ? (
                <a
                  href={`tel:${prospect.telephone}`}
                  className="text-sm text-[#fafafa] hover:text-white transition-colors truncate block"
                >
                  {prospect.telephone}
                </a>
              ) : (
                <p className="text-sm text-[#555555]">—</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="flex items-start gap-2">
            <Mail size={14} className="mt-0.5 shrink-0 text-[#555555]" />
            <div className="min-w-0">
              <p className="text-xs text-[#555555]">Email</p>
              {prospect.email ? (
                <a
                  href={`mailto:${prospect.email}`}
                  className="text-sm text-[#fafafa] hover:text-white transition-colors truncate block"
                >
                  {prospect.email}
                </a>
              ) : (
                <p className="text-sm text-[#555555]">—</p>
              )}
            </div>
          </div>

          {/* Adresse */}
          <div className="flex items-start gap-2">
            <MapPin size={14} className="mt-0.5 shrink-0 text-[#555555]" />
            <div className="min-w-0">
              <p className="text-xs text-[#555555]">Adresse</p>
              <p className="text-sm text-[#fafafa]">{prospect.adresse ?? "—"}</p>
            </div>
          </div>

          {/* Site web */}
          <div className="flex items-start gap-2">
            <Globe size={14} className="mt-0.5 shrink-0 text-[#555555]" />
            <div className="min-w-0">
              <p className="text-xs text-[#555555]">Site web</p>
              {prospect.siteUrl ? (
                <a
                  href={prospect.siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#fafafa] hover:text-white transition-colors truncate block"
                >
                  {prospect.siteUrl.replace(/^https?:\/\//, "")}
                </a>
              ) : (
                <p className="text-sm text-[#555555]">—</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Google info */}
      {(prospect.noteGoogle !== null || prospect.nbAvisGoogle !== null) && (
        <div className="rounded-[6px] border border-[#1a1a1a] bg-[#0a0a0a] p-4">
          <p className="mb-3 text-xs text-[#555555] uppercase tracking-wider">Google</p>
          <div className="flex items-center gap-2">
            <Star size={14} className="text-[#fbbf24]" fill="#fbbf24" />
            <span className="text-sm text-[#fafafa]">
              {prospect.noteGoogle !== null ? prospect.noteGoogle.toFixed(1) : "—"}
              <span className="text-[#737373]">/5</span>
            </span>
            {prospect.nbAvisGoogle !== null && (
              <span className="text-xs text-[#737373]">({prospect.nbAvisGoogle} avis)</span>
            )}
          </div>
        </div>
      )}

      {/* Scoring */}
      <div className="rounded-[6px] border border-[#1a1a1a] bg-[#0a0a0a] p-4">
        <p className="mb-3 text-xs text-[#555555] uppercase tracking-wider">Score</p>
        <div className="flex items-center gap-4 mb-4">
          <ScorePastille score={prospect.scoreGlobal} size={40} />
          <span className="text-sm text-[#737373]">Score global</span>
        </div>
        <div className="flex flex-col gap-2">
          <ScoreBar label="Potentiel web" value={prospect.scorePresenceWeb} />
          <ScoreBar label="SEO" value={prospect.scoreSEO} />
          <ScoreBar label="Design" value={prospect.scoreDesign} />
          <ScoreBar label="Financier" value={prospect.scoreFinancier} />
          <ScoreBar label="Potentiel" value={prospect.scorePotentiel} />
        </div>
      </div>

      {/* Notes */}
      <div className="rounded-[6px] border border-[#1a1a1a] bg-[#0a0a0a] p-4">
        <p className="mb-3 text-xs text-[#555555] uppercase tracking-wider">Notes</p>
        <ProspectNotes prospectId={prospect.id} initialNotes={prospect.notes} />
      </div>
    </div>
  )
}
