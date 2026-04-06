"use client"

import { useState } from "react"
import { motion } from "motion/react"
import { toast } from "sonner"
import { SearchForm } from "@/components/recherche/search-form"
import { SearchResults } from "@/components/recherche/search-results"
import { SearchHistory } from "@/components/recherche/search-history"
import { Skeleton } from "@/components/ui/skeleton"
import { fadeInUp } from "@/lib/animations"
import type { SearchResult } from "@/types/places"

type ScoringState = "idle" | "running" | "done"

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
  const [historyKey, setHistoryKey] = useState(0)
  const [scoringState, setScoringState] = useState<ScoringState>("idle")

  async function runSearch(q: string, v: string, r: string) {
    setLoading(true)
    setResultats(null)
    setSelectedIds(new Set())
    setExpandedId(null)
    setScoringState("idle")

    try {
      const res = await fetch("/api/prospection/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, ville: v, rayon: Number(r) }),
      })
      const json = await res.json() as { data?: { resultats: SearchResult[]; rechercheId: string }; error?: string }
      if (!res.ok) {
        toast.error(json.error ?? "Erreur lors de la recherche")
        return
      }
      setResultats(json.data!.resultats)
      setRechercheId(json.data!.rechercheId)
      setHistoryKey((k) => k + 1)
    } catch {
      toast.error("Erreur réseau")
    } finally {
      setLoading(false)
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    await runSearch(query, ville, rayon)
  }

  async function handleReplay(q: string, v: string, r: string) {
    setQuery(q)
    setVille(v)
    setRayon(r)
    await runSearch(q, v, r)
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

    // Keep ordered list of placeIds being saved (matches save route processing order)
    const savedPlaceIdsOrdered = resultats
      .filter((r) => selectedIds.has(r.placeId))
      .map((r) => r.placeId)

    const prospects = resultats
      .filter((r) => selectedIds.has(r.placeId))
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ dejaEnBase, scoreGlobal: _sg, ...rest }) => rest)

    try {
      const res = await fetch("/api/prospection/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rechercheId, prospects }),
      })
      const json = await res.json() as {
        data?: { saved: number; skipped: number; savedIds: string[] }
        error?: string
      }
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

      const savedIds = json.data?.savedIds ?? []
      if (savedIds.length > 0) {
        // Build placeId → dbId map: save route processes prospects in order,
        // skipping already-existing ones. savedIds[i] = dbId of the i-th prospect
        // that was actually created (not skipped). We match by iterating savedPlaceIds
        // in order and pairing with savedIds in order.
        // Note: skipped prospects don't appear in savedIds, so we must re-filter
        // savedPlaceIds to only the ones that were saved (count == savedIds.length).
        // Since the server skips duplicates but we already excluded dejaEnBase from
        // selectedIds... savedIds.length should equal savedPlaceIdsOrdered.length.
        // In the edge case they differ, we take min to stay safe.
        const placeIdToDbId = new Map<string, string>()
        const limit = Math.min(savedPlaceIdsOrdered.length, savedIds.length)
        for (let i = 0; i < limit; i++) {
          placeIdToDbId.set(savedPlaceIdsOrdered[i]!, savedIds[i]!)
        }
        setScoringState("running")
        void runScoring(savedIds, placeIdToDbId)
      }
    } catch {
      toast.error("Erreur réseau")
    } finally {
      setSaving(false)
    }
  }

  async function runScoring(
    prospectIds: string[],
    placeIdToDbId: Map<string, string>
  ) {
    try {
      const res = await fetch("/api/prospection/score-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectIds }),
      })
      if (!res.ok) {
        setScoringState("idle")
        return
      }
      const json = await res.json() as {
        data?: { scores: { id: string; scoreGlobal: number | null }[] }
      }
      const scores = json.data?.scores ?? []

      if (scores.length > 0) {
        // Build dbId → scoreGlobal map
        const dbIdToScore = new Map(scores.map((s) => [s.id, s.scoreGlobal]))
        // Build placeId → scoreGlobal map
        const placeIdToScore = new Map<string, number | null>()
        for (const [placeId, dbId] of placeIdToDbId) {
          if (dbIdToScore.has(dbId)) {
            placeIdToScore.set(placeId, dbIdToScore.get(dbId) ?? null)
          }
        }

        setResultats((prev) => {
          if (!prev) return prev
          const withScores = prev.map((r) =>
            placeIdToScore.has(r.placeId)
              ? { ...r, scoreGlobal: placeIdToScore.get(r.placeId) }
              : r
          )
          // Sort: scored results desc (nulls last), unscored keep relative order
          return [...withScores].sort((a, b) => {
            if (a.scoreGlobal != null && b.scoreGlobal != null) return b.scoreGlobal - a.scoreGlobal
            if (a.scoreGlobal != null) return -1
            if (b.scoreGlobal != null) return 1
            return 0
          })
        })
      }

      setScoringState("done")
      setTimeout(() => setScoringState("idle"), 5000)
    } catch {
      setScoringState("idle")
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

      <SearchHistory key={historyKey} onReplay={(q, v, r) => void handleReplay(q, v, r)} />

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
        <>
          <SearchResults
            resultats={resultats}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            expandedId={expandedId}
            onToggleExpand={handleToggleExpand}
            onSave={handleSave}
            saving={saving}
          />
          {scoringState === "running" && (
            <p className="text-sm text-[#737373] mt-2">Scoring en cours...</p>
          )}
          {scoringState === "done" && (
            <p className="text-sm text-[#4ade80] mt-2">
              Scoring terminé — résultats triés par score
            </p>
          )}
        </>
      )}
    </div>
  )
}
