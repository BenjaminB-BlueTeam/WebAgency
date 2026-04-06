"use client"

import { motion } from "motion/react"
import { Star } from "lucide-react"
import { staggerItem } from "@/lib/animations"
import { StatusBadge } from "@/components/prospects/status-badge"
import { ScorePastille } from "@/components/prospects/score-pastille"
import { timeAgo } from "@/lib/date"
import type { Prospect } from "@/types/prospect"

interface ProspectRowProps {
  prospect: Prospect
  isExpanded: boolean
  onToggle: () => void
  isSelected: boolean
  onSelect: () => void
}

export function ProspectRow({ prospect, isExpanded, onToggle, isSelected, onSelect }: ProspectRowProps) {
  return (
    <motion.tr
      variants={staggerItem}
      onClick={onToggle}
      className={`cursor-pointer border-b border-[#1a1a1a] transition-colors hover:bg-[#0a0a0a] ${
        isExpanded ? "bg-[#0a0a0a]" : ""
      }`}
    >
      <td className="py-3 px-2 w-10" onClick={(e) => { e.stopPropagation() }}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="accent-white cursor-pointer"
        />
      </td>
      <td className="py-3 px-4 text-sm text-[#fafafa] font-medium">
        {prospect.nom}
      </td>
      <td className="py-3 px-4 text-sm text-[#737373] hidden lg:table-cell">
        {prospect.activite}
      </td>
      <td className="py-3 px-4 text-sm text-[#737373] hidden md:table-cell">
        {prospect.ville}
      </td>
      <td className="py-3 px-4">
        <ScorePastille score={prospect.scoreGlobal} />
      </td>
      <td className="py-3 px-4 text-sm hidden lg:table-cell">
        {prospect.noteGoogle !== null ? (
          <span className="flex items-center gap-1 text-[#fafafa]">
            <Star size={12} className="text-[#fbbf24] fill-[#fbbf24]" />
            {prospect.noteGoogle}
          </span>
        ) : (
          <span className="text-[#555555]">{"\u2014"}</span>
        )}
      </td>
      <td className="py-3 px-4 text-sm hidden xl:table-cell">
        {prospect.siteUrl ? (
          <span className="text-[#4ade80]">Oui</span>
        ) : (
          <span className="text-[#555555]">Non</span>
        )}
      </td>
      <td className="py-3 px-4">
        <StatusBadge statut={prospect.statutPipeline} />
      </td>
      <td className="py-3 px-4 text-sm text-[#737373] hidden md:table-cell">
        {timeAgo(prospect.createdAt)}
      </td>
    </motion.tr>
  )
}
