"use client"

import Link from "next/link"
import { Bell } from "lucide-react"
import { motion } from "motion/react"
import { staggerContainer, staggerItem } from "@/lib/animations"
import { formatDate } from "@/lib/date"
import type { DashboardRelances } from "@/lib/dashboard"

interface RelancesWidgetProps {
  relances: DashboardRelances
}

export function RelancesWidget({ relances }: RelancesWidgetProps) {
  return (
    <div className="rounded-[6px] border border-[#1a1a1a] bg-[#0a0a0a] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bell size={14} className="text-[#737373]" />
          <p className="text-xs text-[#555555] uppercase tracking-wider">Relances à faire</p>
        </div>
        {relances.count > 0 && (
          <span
            className="inline-flex items-center justify-center text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: "#f87171", color: "#000" }}
          >
            {relances.count}
          </span>
        )}
      </div>

      {relances.count === 0 ? (
        <p className="text-sm text-[#555555]">Aucune relance en attente</p>
      ) : (
        <motion.ul
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="flex flex-col gap-2"
        >
          {relances.prospects.map((p) => (
            <motion.li key={p.id} variants={staggerItem}>
              <Link
                href={`/prospects/${p.id}`}
                className="flex items-center justify-between gap-2 group"
              >
                <div className="min-w-0">
                  <p className="text-sm text-[#fafafa] group-hover:text-white truncate transition-colors">
                    {p.nom}
                  </p>
                  <p className="text-xs text-[#737373] truncate">
                    {p.activite} — {p.ville}
                  </p>
                </div>
                <p className="text-xs text-[#f87171] shrink-0">
                  {formatDate(p.prochaineRelance)}
                </p>
              </Link>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </div>
  )
}
