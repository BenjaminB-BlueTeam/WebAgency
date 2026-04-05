"use client"

import Link from "next/link"
import { ArrowRightLeft, StickyNote, Mail, Search, Activity, Zap, Image } from "lucide-react"
import { motion } from "motion/react"
import { staggerContainer, fadeInUp } from "@/lib/animations"
import { timeAgo } from "@/lib/date"
import type { DashboardActivite } from "@/lib/dashboard"

const TYPE_ICONS: Record<string, React.ElementType> = {
  PIPELINE: ArrowRightLeft,
  NOTE: StickyNote,
  EMAIL: Mail,
  RECHERCHE: Search,
  ANALYSE: Zap,
  MAQUETTE: Image,
}

function getIcon(type: string): React.ElementType {
  return TYPE_ICONS[type] ?? Activity
}

interface ActivityTimelineProps {
  activites: DashboardActivite[]
}

export function ActivityTimeline({ activites }: ActivityTimelineProps) {
  return (
    <div className="rounded-[6px] border border-[#1a1a1a] bg-[#0a0a0a] p-4">
      <p className="text-xs text-[#555555] uppercase tracking-wider mb-4">Activité récente</p>

      {activites.length === 0 ? (
        <p className="text-sm text-[#555555]">Aucune activité enregistrée</p>
      ) : (
        <motion.ul
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="relative flex flex-col gap-0"
        >
          <div
            className="absolute left-[7px] top-2 bottom-2 w-px"
            style={{ backgroundColor: "#1a1a1a" }}
            aria-hidden
          />

          {activites.map((a) => {
            const Icon = getIcon(a.type)
            return (
              <motion.li
                key={a.id}
                variants={fadeInUp}
                className="relative flex items-start gap-4 pb-4 pl-6 last:pb-0"
              >
                <div
                  className="absolute left-0 top-1 h-[14px] w-[14px] shrink-0 rounded-full border"
                  style={{ backgroundColor: "#1a1a1a", borderColor: "#1a1a1a" }}
                  aria-hidden
                />
                <div className="shrink-0 mt-0.5">
                  <Icon size={14} className="text-[#737373]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#fafafa] leading-snug">{a.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {a.prospectNom && (
                      <Link
                        href={`/prospects`}
                        className="text-xs text-[#737373] hover:text-[#fafafa] transition-colors truncate"
                      >
                        {a.prospectNom}
                      </Link>
                    )}
                    <p className="text-xs text-[#555555] shrink-0">{timeAgo(a.createdAt)}</p>
                  </div>
                </div>
              </motion.li>
            )
          })}
        </motion.ul>
      )}
    </div>
  )
}
