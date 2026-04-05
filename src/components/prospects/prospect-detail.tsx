"use client"

import { useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "motion/react"
import { ArrowLeft } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { slideIn } from "@/lib/animations"
import { StatusBadge } from "@/components/prospects/status-badge"
import { DemarcherSheet } from "@/components/prospects/demarcher-sheet"
import { ProspectInfoTab } from "@/components/prospects/prospect-info-tab"
import { ProspectActivityTab } from "@/components/prospects/prospect-activity-tab"
import { ProspectMaquetteTab } from "@/components/prospects/prospect-maquette-tab"
import { ProspectAnalyseTab } from "@/components/prospects/prospect-analyse-tab"
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
                <ProspectAnalyseTab prospect={prospect} />
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
