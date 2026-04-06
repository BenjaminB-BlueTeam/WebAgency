// src/components/emails/relance-badge.tsx
"use client"

import type { RelanceInfo } from "@/types/emails"

interface Props {
  relance: RelanceInfo
}

export function RelanceBadge({ relance }: Props) {
  if (!relance.due) {
    return <span className="text-xs text-[#555555]">—</span>
  }

  const color = relance.urgente ? "#f87171" : "#fbbf24"
  const label = `Relance J+${relance.joursRetard}${relance.urgente ? " !" : ""}`

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: "#1a1a1a", color, borderRadius: "9999px" }}
    >
      {label}
    </span>
  )
}
