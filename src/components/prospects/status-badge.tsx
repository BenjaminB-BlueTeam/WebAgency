"use client"

import type { StatutPipeline } from "@/lib/validation"

const STATUT_CONFIG: Record<StatutPipeline, { label: string; color: string }> = {
  A_DEMARCHER: { label: "A démarcher", color: "#737373" },
  CONTACTE: { label: "Contacté", color: "#fafafa" },
  RDV_PLANIFIE: { label: "RDV planifié", color: "#fbbf24" },
  MAQUETTE_ENVOYEE: { label: "Maquette envoyée", color: "#fbbf24" },
  RELANCE: { label: "Relance", color: "#fafafa" },
  SIGNE: { label: "Signé", color: "#4ade80" },
  PERDU: { label: "Perdu", color: "#f87171" },
}

export function StatusBadge({ statut }: { statut: string }) {
  const config = STATUT_CONFIG[statut as StatutPipeline] ?? {
    label: statut,
    color: "#737373",
  }

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: "#1a1a1a",
        color: config.color,
        borderRadius: "9999px",
      }}
    >
      {config.label}
    </span>
  )
}
