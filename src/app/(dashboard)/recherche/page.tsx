"use client"

import { useState } from "react"
import { motion } from "motion/react"
import { toast } from "sonner"
import { SearchForm } from "@/components/recherche/search-form"
import { SearchResults } from "@/components/recherche/search-results"
import { Skeleton } from "@/components/ui/skeleton"
import { fadeInUp } from "@/lib/animations"
import type { SearchResult } from "@/types/places"

export default function RecherchePage() {
  const [query, setQuery] = useState("")
  const [ville, setVille] = useState("")
  const [rayon, setRayon] = useState("10000")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [resultats, setResultats] = useState<SearchResult[] | null>(null)
  const [rechercheId, setRechercheId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [expandedId, setExpandedId] = useState<string | null>(null)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setResultats(null)
    setSelectedIds(new Set())
    setExpandedId(null)

    try {
      const res = await fetch("/api/prospection/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, ville, rayon: Number(rayon) }),
      })
      const json = await res.json() as { data?: { resultats: SearchResult[]; rechercheId: string }; error?: string }
      if (!res.ok) {
        toast.error(json.error ?? "Erreur lors de la recherche")
        return
      }
      setResultats(json.data!.resultats)
      setRechercheId(json.data!.rechercheId)
    } catch {
      toast.error("Erreur réseau")
    } finally {
      setLoading(false)
    }
  }

  function handleToggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function handleToggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  async function handleSave() {
    if (!resultats || selectedIds.size === 0) return
    setSaving(true)

    const prospects = resultats
      .filter((r) => selectedIds.has(r.placeId))
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ dejaEnBase, ...rest }) => rest)

    try {
      const res = await fetch("/api/prospection/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rechercheId, prospects }),
      })
      const json = await res.json() as { data?: { saved: number; skipped: number }; error?: string }
      if (!res.ok) {
        toast.error(json.error ?? "Erreur lors de l'enregistrement")
        return
      }
      const count = json.data?.saved ?? selectedIds.size
      toast.success(`${count} prospect${count > 1 ? "s" : ""} enregistré${count > 1 ? "s" : ""}`)
      setResultats((prev) =>
        prev
          ? prev.map((r) =>
              selectedIds.has(r.placeId) ? { ...r, dejaEnBase: true } : r
            )
          : prev
      )
      setSelectedIds(new Set())
    } catch {
      toast.error("Erreur réseau")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-xl font-bold text-[#fafafa] mb-6">Recherche de prospects</h1>

      <SearchForm
        query={query}
        onQueryChange={setQuery}
        ville={ville}
        onVilleChange={setVille}
        rayon={rayon}
        onRayonChange={setRayon}
        onSubmit={handleSearch}
        loading={loading}
      />

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 bg-[#0a0a0a]" />
          ))}
        </div>
      )}

      {!loading && resultats !== null && resultats.length === 0 && (
        <motion.p
          variants={fadeInUp}
          initial="initial"
          animate="animate"
          className="text-sm text-[#737373] text-center py-12"
        >
          Aucun résultat trouvé pour cette recherche
        </motion.p>
      )}

      {!loading && resultats !== null && resultats.length > 0 && (
        <SearchResults
          resultats={resultats}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          expandedId={expandedId}
          onToggleExpand={handleToggleExpand}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </div>
  )
}
