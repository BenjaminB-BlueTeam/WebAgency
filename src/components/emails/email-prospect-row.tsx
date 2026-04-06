// src/components/emails/email-prospect-row.tsx
"use client"

import { ChevronDown, ChevronRight, Mail, RotateCcw } from "lucide-react"
import { AnimatePresence } from "motion/react"
import { StatusBadge } from "@/components/prospects/status-badge"
import { RelanceBadge } from "@/components/emails/relance-badge"
import { EmailHistoryExpand } from "@/components/emails/email-history-expand"
import { Button } from "@/components/ui/button"
import type { EmailProspectItem } from "@/types/emails"

interface Props {
  prospect: EmailProspectItem
  isExpanded: boolean
  onToggleExpand: () => void
  onDemarcher: () => void
  onRelancer: () => void
}

export function EmailProspectRow({
  prospect,
  isExpanded,
  onToggleExpand,
  onDemarcher,
  onRelancer,
}: Props) {
  const noEmail = !prospect.email

  return (
    <div className="border border-[#1a1a1a] rounded-[6px] bg-[#0a0a0a] overflow-hidden">
      {/* Main row */}
      <div
        className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-[#111] transition-colors"
        onClick={onToggleExpand}
      >
        <span className="text-[#555555] shrink-0">
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>

        {/* Nom + activité */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[#fafafa] truncate">{prospect.nom}</p>
          <p className="text-xs text-[#737373] truncate">{prospect.activite}</p>
        </div>

        {/* Ville */}
        <span className="text-xs text-[#737373] w-24 shrink-0 hidden md:block truncate">
          {prospect.ville}
        </span>

        {/* Statut */}
        <div className="shrink-0 hidden md:block">
          <StatusBadge statut={prospect.statutPipeline} />
        </div>

        {/* Dernier email */}
        <div className="w-32 shrink-0 hidden lg:block">
          {prospect.dernierEmail ? (
            <span className="text-xs text-[#737373]">
              {prospect.dernierEmail.dateEnvoi
                ? new Date(prospect.dernierEmail.dateEnvoi).toLocaleDateString("fr-FR")
                : "—"}
            </span>
          ) : (
            <span className="text-xs text-[#555555]">Jamais contacté</span>
          )}
        </div>

        {/* Relance */}
        <div className="w-28 shrink-0 hidden lg:block">
          <RelanceBadge relance={prospect.relance} />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          {prospect.relance.due && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRelancer}
              className="h-7 px-2 text-xs border-[#fbbf24] text-[#fbbf24] hover:bg-[#fbbf24]/10"
            >
              <RotateCcw size={12} className="mr-1" />
              Relancer
            </Button>
          )}
          <Button
            size="sm"
            onClick={onDemarcher}
            disabled={noEmail}
            title={noEmail ? "Ajoutez un email dans la fiche" : undefined}
            className="h-7 px-2 text-xs"
          >
            <Mail size={12} className="mr-1" />
            Démarcher
          </Button>
        </div>
      </div>

      {/* Expand */}
      <AnimatePresence>
        {isExpanded && <EmailHistoryExpand emails={prospect.emailsHistory} />}
      </AnimatePresence>
    </div>
  )
}
