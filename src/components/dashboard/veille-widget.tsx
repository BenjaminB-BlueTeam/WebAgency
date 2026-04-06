"use client"

import { useEffect, useState } from "react"
import { Binoculars } from "lucide-react"
import { motion } from "motion/react"
import { staggerContainer, staggerItem } from "@/lib/animations"
import { toast } from "sonner"

interface NouveauProspect {
  id: string
  siren: string
  nom: string
  activite: string
  codeNAF: string
  ville: string
  dateCreation: string
  ajouteComme: boolean
  prospectId: string | null
  createdAt: string
}

function relativeDays(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return "aujourd'hui"
  if (diffDays === 1) return "il y a 1j"
  return `il y a ${diffDays}j`
}

export function VeilleWidget() {
  const [items, setItems] = useState<NouveauProspect[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch("/api/veille-prospects")
      .then((r) => r.json())
      .then((json: { data?: NouveauProspect[] }) => {
        setItems(json.data ?? [])
      })
      .catch(() => {
        setItems([])
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleAjouter(item: NouveauProspect) {
    setAdding((prev) => new Set(prev).add(item.id))
    try {
      const res = await fetch(`/api/veille-prospects/${item.id}/ajouter`, {
        method: "POST",
      })
      if (!res.ok) {
        const json = (await res.json()) as { error?: string }
        toast.error(json.error ?? "Erreur lors de l'ajout")
        return
      }
      setItems((prev) => prev.filter((p) => p.id !== item.id))
      toast.success("Prospect ajouté et scoré")
    } catch {
      toast.error("Erreur réseau")
    } finally {
      setAdding((prev) => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
    }
  }

  return (
    <div className="rounded-[6px] border border-[#1a1a1a] bg-[#0a0a0a] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Binoculars size={14} className="text-[#737373]" />
          <p className="text-xs text-[#555555] uppercase tracking-wider">
            Nouvelles entreprises
          </p>
        </div>
        {!loading && items.length > 0 && (
          <span
            className="inline-flex items-center justify-center text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: "#4ade80", color: "#000" }}
          >
            {items.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-10 rounded-[6px] bg-[#1a1a1a] animate-pulse"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-[#555555]">
          Aucune nouvelle entreprise aujourd&apos;hui
        </p>
      ) : (
        <motion.ul
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="flex flex-col gap-2"
        >
          {items.map((item) => (
            <motion.li
              key={item.id}
              variants={staggerItem}
              className="flex items-center justify-between gap-3 py-1"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm text-[#fafafa] truncate">{item.nom}</p>
                <p className="text-xs text-[#737373] truncate">
                  {item.activite} — {item.ville} —{" "}
                  <span className="text-[#555555]">
                    créée {relativeDays(item.dateCreation)}
                  </span>
                </p>
              </div>
              <button
                onClick={() => handleAjouter(item)}
                disabled={adding.has(item.id)}
                className="shrink-0 text-xs px-2 py-1 rounded-[6px] border border-[#1a1a1a] bg-white text-black font-medium hover:bg-[#e5e5e5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {adding.has(item.id) ? "..." : "Ajouter"}
              </button>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </div>
  )
}
