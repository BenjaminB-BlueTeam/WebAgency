"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "motion/react"
import { ExternalLink, UserCheck } from "lucide-react"
import { fadeInUp, staggerContainer, staggerItem } from "@/lib/animations"
import { Button } from "@/components/ui/button"

interface ClientRow {
  id: string
  prospectId: string
  siteUrl: string
  offreType: "VITRINE" | "VISIBILITE"
  dateLivraison: string
  maintenanceActive: boolean
  prospect: {
    id: string
    nom: string
    activite: string
    ville: string
  }
}

type OffreFilter = "ALL" | "VITRINE" | "VISIBILITE"
type MaintFilter = "ALL" | "ACTIVE" | "INACTIVE"

function formatDateFr(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR")
  } catch {
    return iso
  }
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [offreFilter, setOffreFilter] = useState<OffreFilter>("ALL")
  const [maintFilter, setMaintFilter] = useState<MaintFilter>("ALL")

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch("/api/clients")
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? "Erreur de chargement")
        if (!cancelled) setClients(json.data as ClientRow[])
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erreur")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      if (offreFilter !== "ALL" && c.offreType !== offreFilter) return false
      if (maintFilter === "ACTIVE" && !c.maintenanceActive) return false
      if (maintFilter === "INACTIVE" && c.maintenanceActive) return false
      return true
    })
  }, [clients, offreFilter, maintFilter])

  async function toggleMaintenance(client: ClientRow) {
    const next = !client.maintenanceActive
    setClients((prev) =>
      prev.map((c) => (c.id === client.id ? { ...c, maintenanceActive: next } : c))
    )
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maintenanceActive: next }),
      })
      if (!res.ok) throw new Error("Erreur PATCH")
    } catch {
      setClients((prev) =>
        prev.map((c) =>
          c.id === client.id ? { ...c, maintenanceActive: !next } : c
        )
      )
    }
  }

  return (
    <motion.div variants={fadeInUp} initial="initial" animate="animate" className="p-4 md:p-6">
      <div className="flex items-center gap-2 mb-1">
        <UserCheck size={18} className="text-[#fafafa]" />
        <h1 className="text-xl font-semibold text-[#fafafa]">Clients</h1>
      </div>
      <p className="text-sm text-[#737373] mb-6">
        Suivi des clients livrés et de la maintenance.
      </p>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div>
          <label className="block text-xs text-[#737373] mb-1">Type d&apos;offre</label>
          <select
            value={offreFilter}
            onChange={(e) => setOffreFilter(e.target.value as OffreFilter)}
            className="rounded-[6px] border border-[#1a1a1a] bg-[#0a0a0a] px-3 py-2 text-sm text-[#fafafa] focus:outline-none focus:ring-1 focus:ring-white/50"
          >
            <option value="ALL">Tous</option>
            <option value="VITRINE">Vitrine</option>
            <option value="VISIBILITE">Visibilité</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-[#737373] mb-1">Maintenance</label>
          <select
            value={maintFilter}
            onChange={(e) => setMaintFilter(e.target.value as MaintFilter)}
            className="rounded-[6px] border border-[#1a1a1a] bg-[#0a0a0a] px-3 py-2 text-sm text-[#fafafa] focus:outline-none focus:ring-1 focus:ring-white/50"
          >
            <option value="ALL">Toutes</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {loading && <p className="text-sm text-[#737373]">Chargement...</p>}
      {error && <p className="text-sm text-[#f87171]">{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <p className="text-sm text-[#737373]">Aucun client.</p>
      )}

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3"
      >
        {filtered.map((c) => (
          <motion.article
            key={c.id}
            variants={staggerItem}
            className="rounded-[6px] border border-[#1a1a1a] bg-[#0a0a0a] p-4 flex flex-col gap-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-[#fafafa] truncate">
                  {c.prospect.nom}
                </h2>
                <p className="text-xs text-[#737373] truncate">
                  {c.prospect.activite || "—"} · {c.prospect.ville || "—"}
                </p>
              </div>
              <span
                className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-[9999px] text-[10px] font-medium border ${
                  c.offreType === "VITRINE"
                    ? "border-[#1a1a1a] text-[#fafafa] bg-[#111]"
                    : "border-[#1a1a1a] text-[#fafafa] bg-[#1a1a1a]"
                }`}
              >
                {c.offreType === "VITRINE" ? "Vitrine" : "Visibilité"}
              </span>
            </div>

            <a
              href={c.siteUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 text-xs text-[#fafafa] hover:underline truncate"
            >
              <ExternalLink size={12} className="shrink-0" />
              <span className="truncate">{c.siteUrl}</span>
            </a>

            <div className="text-xs text-[#737373]">
              Livré le {formatDateFr(c.dateLivraison)}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#1a1a1a]">
              <button
                type="button"
                onClick={() => toggleMaintenance(c)}
                className="flex items-center gap-2 text-xs"
                aria-label="Basculer maintenance"
              >
                <span
                  className={`inline-block w-8 h-4 rounded-[9999px] relative transition-colors ${
                    c.maintenanceActive ? "bg-[#4ade80]" : "bg-[#1a1a1a]"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-3 h-3 rounded-full bg-black transition-all ${
                      c.maintenanceActive ? "left-[18px]" : "left-0.5"
                    }`}
                  />
                </span>
                <span className="text-[#737373]">
                  Maintenance {c.maintenanceActive ? "active" : "inactive"}
                </span>
              </button>
              <Link href={`/prospects/${c.prospectId}`}>
                <Button variant="outline" size="sm">
                  Fiche prospect
                </Button>
              </Link>
            </div>
          </motion.article>
        ))}
      </motion.div>
    </motion.div>
  )
}
