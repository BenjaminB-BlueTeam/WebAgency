"use client"

import { motion } from "motion/react"
import { staggerContainer, staggerItem } from "@/lib/animations"
import { StatCard } from "@/components/dashboard/stat-card"
import type { DashboardStats } from "@/lib/dashboard"

interface StatsGridProps {
  stats: DashboardStats
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3"
    >
      <motion.div variants={staggerItem}>
        <StatCard label="Total prospects" value={stats.totalProspects} />
      </motion.div>
      <motion.div variants={staggerItem}>
        <StatCard label="À démarcher" value={stats.aDemarcher} />
      </motion.div>
      <motion.div variants={staggerItem}>
        <StatCard label="Emails envoyés" value={stats.maquettesEnvoyees} />
      </motion.div>
      <motion.div variants={staggerItem}>
        <StatCard label="Clients signés" value={stats.clientsSignes} />
      </motion.div>
      <motion.div variants={staggerItem} className="col-span-2 md:col-span-1">
        <StatCard
          label="Taux de conversion"
          value={stats.tauxConversion}
          format="percent"
          sublabel={`${stats.clientsSignes} / ${stats.totalProspects}`}
        />
      </motion.div>
    </motion.div>
  )
}
