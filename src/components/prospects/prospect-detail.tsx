"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") ?? "informations")
  const [showDemarcher, setShowDemarcher] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/prospects/${prospect.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      router.push("/prospects")
    } catch {
      setDeleting(false)
      setConfirmingDelete(false)
    }
  }

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
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-xl font-bold text-[#fafafa] truncate">{prospect.nom}</h1>
            <StatusBadge statut={prospect.statutPipeline} />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {confirmingDelete ? (
              <>
                <span className="text-sm text-[#f87171] hidden sm:inline">Supprimer ce prospect ?</span>
                <Button size="sm" variant="outline" onClick={() => setConfirmingDelete(false)}>
                  Annuler
                </Button>
                <Button
                  size="sm"
                  className="bg-[#f87171] text-black hover:bg-[#f87171]/90"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Suppression..." : "Confirmer"}
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="border-[#f87171] text-[#f87171] hover:bg-[#f87171]/10"
                onClick={() => setConfirmingDelete(true)}
              >
                Supprimer
              </Button>
            )}
            <Button size="sm" onClick={() => setShowDemarcher(true)}>
              Démarcher
            </Button>
          </div>
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
