"use client"

import { motion } from "motion/react"
import { ArrowRightLeft, StickyNote, Mail, Search, Activity } from "lucide-react"
import { staggerContainer, fadeInUp } from "@/lib/animations"
import { timeAgo } from "@/lib/date"
import type { Activite } from "@/types/prospect"

const TYPE_ICONS: Record<string, React.ElementType> = {
  CHANGEMENT_STATUT: ArrowRightLeft,
  NOTE: StickyNote,
  EMAIL: Mail,
  RECHERCHE: Search,
}

function getIcon(type: string): React.ElementType {
  return TYPE_ICONS[type] ?? Activity
}

interface ProspectActivityTabProps {
  activites: Activite[]
}

export function ProspectActivityTab({ activites }: ProspectActivityTabProps) {
  if (activites.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-[#737373]">Aucune activité enregistrée</p>
      </div>
    )
  }

  return (
    <motion.ul
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="relative flex flex-col gap-0"
    >
      {/* Vertical timeline line */}
      <div
        className="absolute left-[7px] top-2 bottom-2 w-px"
        style={{ backgroundColor: "#1a1a1a" }}
        aria-hidden
      />

      {activites.map((activite) => {
        const Icon = getIcon(activite.type)

        return (
          <motion.li
            key={activite.id}
            variants={fadeInUp}
            className="relative flex items-start gap-4 pb-5 pl-6 last:pb-0"
          >
            {/* Timeline dot */}
            <div
              className="absolute left-0 top-1 h-[14px] w-[14px] shrink-0 rounded-full border"
              style={{ backgroundColor: "#1a1a1a", borderColor: "#333" }}
              aria-hidden
            />

            {/* Icon */}
            <div className="shrink-0 mt-0.5">
              <Icon size={14} className="text-[#737373]" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#fafafa] leading-snug">{activite.description}</p>
              <p className="mt-0.5 text-xs text-[#737373]">{timeAgo(activite.createdAt)}</p>
            </div>
          </motion.li>
        )
      })}
    </motion.ul>
  )
}
