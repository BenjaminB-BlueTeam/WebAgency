"use client"

import { motion } from "motion/react"
import { staggerItem, hoverLift } from "@/lib/animations"
import { StatusBadge } from "@/components/prospects/status-badge"
import { ScorePastille } from "@/components/prospects/score-pastille"
import type { Prospect } from "@/types/prospect"

interface ProspectCardMobileProps {
  prospect: Prospect
  isExpanded: boolean
  onToggle: () => void
}

export function ProspectCardMobile({
  prospect,
  isExpanded,
  onToggle,
}: ProspectCardMobileProps) {
  return (
    <motion.div
      variants={staggerItem}
      {...hoverLift}
      onClick={onToggle}
      className={`cursor-pointer rounded-[6px] border border-[#1a1a1a] p-3 bg-[#0a0a0a]`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[#fafafa] truncate">
            {prospect.nom}
          </p>
          <p className="text-xs text-[#737373] truncate">{prospect.activite}</p>
        </div>
        <ScorePastille score={prospect.scoreGlobal} />
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs text-[#555555]">{prospect.ville}</span>
        <StatusBadge statut={prospect.statutPipeline} />
      </div>
    </motion.div>
  )
}
