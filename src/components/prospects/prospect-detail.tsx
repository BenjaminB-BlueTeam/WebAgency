"use client"

import { useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "motion/react"
import { ArrowLeft, Search } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { slideIn } from "@/lib/animations"
import { StatusBadge } from "@/components/prospects/status-badge"
import { DemarcherSheet } from "@/components/prospects/demarcher-sheet"
import { ProspectInfoTab } from "@/components/prospects/prospect-info-tab"
import { ProspectActivityTab } from "@/components/prospects/prospect-activity-tab"
import { ProspectMaquetteTab } from "@/components/prospects/prospect-maquette-tab"
import type { ProspectWithRelations } from "@/types/prospect"

export function ProspectDetail({ prospect }: { prospect: ProspectWithRelations }) {
  const [activeTab, setActiveTab] = useState("informations")
  const [showDemarcher, setShowDemarcher] = useState(false)

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/prospects"
          className="text-sm text-[#737373] hover:text-[#fafafa] transition-colors flex items-center gap-1 mb-4"
        >
          <ArrowLeft size={14} />
          Prospects
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-[#fafafa]">{prospect.nom}</h1>
            <StatusBadge statut={prospect.statutPipeline} />
          </div>
          <Button size="sm" onClick={() => setShowDemarcher(true)}>
            Démarcher
          </Button>
        </div>
        <p className="text-sm text-[#737373] mt-1">
          {prospect.activite} — {prospect.ville}
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#0a0a0a] border border-[#1a1a1a]">
          <TabsTrigger value="informations">Informations</TabsTrigger>
          <TabsTrigger value="analyse">Analyse</TabsTrigger>
          <TabsTrigger value="maquette">Maquette</TabsTrigger>
          <TabsTrigger value="activite">Activité</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              variants={slideIn}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {activeTab === "informations" && (
                <ProspectInfoTab prospect={prospect} />
              )}

              {activeTab === "analyse" && (
                <PlaceholderTab
                  icon={<Search size={48} className="text-[#555555]" />}
                  title="Aucune analyse concurrentielle"
                  buttonLabel="Lancer l'analyse"
                />
              )}

              {activeTab === "maquette" && (
                <ProspectMaquetteTab prospect={prospect} />
              )}

              {activeTab === "activite" && (
                <ProspectActivityTab activites={prospect.activites} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </Tabs>

      {showDemarcher && (
        <DemarcherSheet prospect={prospect} onClose={() => setShowDemarcher(false)} />
      )}
    </div>
  )
}

function PlaceholderTab({
  icon,
  title,
  buttonLabel,
}: {
  icon: React.ReactNode
  title: string
  buttonLabel: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4">{icon}</div>
      <p className="text-sm text-[#737373] mb-4">{title}</p>
      <Button variant="outline" disabled className="opacity-50">
        {buttonLabel}
      </Button>
    </div>
  )
}
