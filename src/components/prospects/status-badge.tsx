"use client"

import type { StatutPipeline } from "@/lib/validation"

const STATUT_CONFIG: Record<StatutPipeline, { label: string; color: string }> = {
  A_DEMARCHER: { label: "À démarcher", color: "#737373" },
  MAQUETTE_EMAIL_ENVOYES: { label: "Maquette + Email envoyés", color: "#60a5fa" },
  REPONDU: { label: "Répondu", color: "#fbbf24" },
  RDV_PLANIFIE: { label: "RDV planifié", color: "#fbbf24" },
  NEGOCIATION: { label: "Négociation", color: "#fafafa" },
  CLIENT: { label: "Client", color: "#4ade80" },
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
