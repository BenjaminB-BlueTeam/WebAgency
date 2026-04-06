"use client"

import { useState, useMemo } from "react"
import { motion } from "motion/react"
import { toast } from "sonner"
import { SearchForm } from "@/components/recherche/search-form"
import { SearchResults } from "@/components/recherche/search-results"
import { SearchHistory } from "@/components/recherche/search-history"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { fadeInUp } from "@/lib/animations"
import { VILLES_NORD, VILLES_HAUTS_DE_FRANCE, type ZoneMode } from "@/lib/zones"
import type { SearchResult } from "@/types/places"

type ScoringState = "idle" | "running" | "done"

export default function RecherchePage() {
  const [query, setQuery] = useState("")
  const [ville, setVille] = useState("")
  const [rayon, setRayon] = useState("10000")
  const [zone, setZone] = useState<ZoneMode>("ville")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [resultats, setResultats] = useState<SearchResult[] | null>(null)
  const [rechercheId, setRechercheId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [historyKey, setHistoryKey] = useState(0)
  const [scoringState, setScoringState] = useState<ScoringState>("idle")
  const [progressText, setProgressText] = useState("")

  // Filter state
  const [filterVille, setFilterVille] = useState("")
  const [filterScore, setFilterScore] = useState<number>(0)
  const [filterActivite, setFilterActivite] = useState("")
  const [filterNoteMin, setFilterNoteMin] = useState<number>(0)
  const [filterHasSite, setFilterHasSite] = useState(false)

  async function runSearch(q: string, v: string, r: string, z: ZoneMode) {
    setLoading(true)
    setResultats(null)
    setSelectedIds(new Set())
    setExpandedId(null)
    setScoringState("idle")
    setProgressText("")

    // Reset filters on new search
    setFilterVille("")
    setFilterScore(0)
    setFilterActivite("")
    setFilterNoteMin(0)
    setFilterHasSite(false)

    try {
      if (z === "ville") {
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
      } else {
        // Multi-city search
        const cities = z === "departement" ? VILLES_NORD : VILLES_HAUTS_DE_FRANCE
        const total = cities.length
        const accumulated: SearchResult[] = []
        const seenPlaceIds = new Set<string>()
        let lastRechercheId: string | null = null

        for (let i = 0; i < total; i++) {
          const cityName = cities[i]!
          setProgressText(`Recherche en cours... (${i + 1}/${total} villes — ${cityName})`)

          try {
            // Fetch using the single-city API (which also creates a recherche entry)
            const res = await fetch("/api/prospection/search", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ query: q, ville: cityName, rayon: Number(r) }),
            })
            const json = await res.json() as { data?: { resultats: SearchResult[]; rechercheId: string }; error?: string }
            if (res.ok && json.data) {
              lastRechercheId = json.data.rechercheId
              for (const result of json.data.resultats) {
                if (!seenPlaceIds.has(result.placeId)) {
                  seenPlaceIds.add(result.placeId)
                  accumulated.push(result)
                }
              }
            }
          } catch {
            // Continue on individual city failure
          }

          // Small delay to avoid hammering the API
          if (i < total - 1) {
            await new Promise((resolve) => setTimeout(resolve, 300))
          }
        }

        setProgressText("")
        setResultats(accumulated)
        if (lastRechercheId) setRechercheId(lastRechercheId)
        setHistoryKey((k) => k + 1)
      }
    } catch {
      toast.error("Erreur réseau")
    } finally {
      setLoading(false)
      setProgressText("")
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    await runSearch(query, ville, rayon, zone)
  }

  async function handleReplay(q: string, v: string, r: string) {
    setQuery(q)
    setVille(v)
    setRayon(r)
    setZone("ville")
    await runSearch(q, v, r, "ville")
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

  // Compute distinct villes from results for the filter dropdown
  const distinctVilles = useMemo(() => {
    if (!resultats) return []
    const villes = new Set<string>()
    for (const r of resultats) {
      // Extract city from adresse (last meaningful part) or use a fallback
      const parts = r.adresse.split(",")
      const candidate = parts[parts.length - 2]?.trim() ?? ""
      // Try to extract just the city name (e.g. "59000 Lille" → "Lille")
      const cityMatch = candidate.match(/\d{5}\s+(.+)/)
      const city = cityMatch ? cityMatch[1] : candidate
      if (city) villes.add(city)
    }
    return Array.from(villes).sort()
  }, [resultats])

  // Apply filters and sort to resultats
  const filteredResultats = useMemo(() => {
    if (!resultats) return null
    let list = resultats.filter((r) => {
      if (filterVille && !r.adresse.includes(filterVille)) return false
      if (filterScore > 0 && (r.scoreGlobal == null || r.scoreGlobal < filterScore)) return false
      if (filterActivite && !r.nom.toLowerCase().includes(filterActivite.toLowerCase())) return false
      if (filterNoteMin > 0 && (r.noteGoogle == null || r.noteGoogle < filterNoteMin)) return false
      if (filterHasSite && !r.siteUrl) return false
      return true
    })
    // Sort: scoreGlobal desc (nulls last), then noteGoogle desc
    list = [...list].sort((a, b) => {
      if (a.scoreGlobal != null && b.scoreGlobal != null) return b.scoreGlobal - a.scoreGlobal
      if (a.scoreGlobal != null) return -1
      if (b.scoreGlobal != null) return 1
      // Both null: sort by noteGoogle desc
      const na = a.noteGoogle ?? 0
      const nb = b.noteGoogle ?? 0
      return nb - na
    })
    return list
  }, [resultats, filterVille, filterScore, filterActivite, filterNoteMin, filterHasSite])

  const hasFiltersActive = filterVille !== "" || filterScore > 0 || filterActivite !== "" || filterNoteMin > 0 || filterHasSite

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
        zone={zone}
        onZoneChange={setZone}
        onSubmit={handleSearch}
        loading={loading}
        progressText={progressText}
      />

      <SearchHistory key={historyKey} onReplay={(q, v, r) => void handleReplay(q, v, r)} />

      {loading && !progressText && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 bg-[#0a0a0a]" />
          ))}
        </div>
      )}

      {loading && progressText && (
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
          {/* Filter bar */}
          <div className="flex flex-wrap gap-2 mb-4 p-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-[6px]">
            <span className="text-xs text-[#737373] self-center mr-1">Filtres :</span>

            {distinctVilles.length > 1 && (
              <Select
                value={filterVille || "__all__"}
                onValueChange={(v) => setFilterVille(v === "__all__" ? "" : v)}
              >
                <SelectTrigger className="h-7 text-xs bg-[#000] border-[#1a1a1a] text-[#fafafa] w-[140px]">
                  <SelectValue placeholder="Toutes les villes" />
                </SelectTrigger>
                <SelectContent className="bg-[#0a0a0a] border-[#1a1a1a] text-[#fafafa]">
                  <SelectItem value="__all__">Toutes les villes</SelectItem>
                  {distinctVilles.map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="flex items-center gap-1">
              <label className="text-xs text-[#737373] whitespace-nowrap">Score min</label>
              <Input
                type="number"
                min={0}
                max={100}
                value={filterScore || ""}
                onChange={(e) => setFilterScore(Number(e.target.value) || 0)}
                placeholder="0"
                className="h-7 w-16 text-xs bg-[#000] border-[#1a1a1a] text-[#fafafa] placeholder:text-[#555555]"
              />
            </div>

            <Input
              type="text"
              value={filterActivite}
              onChange={(e) => setFilterActivite(e.target.value)}
              placeholder="Activité..."
              className="h-7 w-28 text-xs bg-[#000] border-[#1a1a1a] text-[#fafafa] placeholder:text-[#555555]"
            />

            <div className="flex items-center gap-1">
              <label className="text-xs text-[#737373] whitespace-nowrap">Note min</label>
              <Input
                type="number"
                min={0}
                max={5}
                step={0.1}
                value={filterNoteMin || ""}
                onChange={(e) => setFilterNoteMin(Number(e.target.value) || 0)}
                placeholder="0"
                className="h-7 w-16 text-xs bg-[#000] border-[#1a1a1a] text-[#fafafa] placeholder:text-[#555555]"
              />
            </div>

            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={filterHasSite}
                onChange={(e) => setFilterHasSite(e.target.checked)}
                className="accent-white"
              />
              <span className="text-xs text-[#737373]">A un site web</span>
            </label>

            {hasFiltersActive && (
              <button
                type="button"
                onClick={() => {
                  setFilterVille("")
                  setFilterScore(0)
                  setFilterActivite("")
                  setFilterNoteMin(0)
                  setFilterHasSite(false)
                }}
                className="text-xs text-[#f87171] hover:text-[#fafafa] transition-colors ml-auto"
              >
                Réinitialiser
              </button>
            )}
          </div>

          {filteredResultats !== null && filteredResultats.length === 0 && (
            <p className="text-sm text-[#737373] text-center py-8">
              Aucun résultat ne correspond aux filtres
            </p>
          )}

          {filteredResultats !== null && filteredResultats.length > 0 && (
            <>
              <p className="text-xs text-[#737373] mb-2">
                {filteredResultats.length} résultat{filteredResultats.length > 1 ? "s" : ""}
                {hasFiltersActive && ` (filtré${filteredResultats.length > 1 ? "s" : ""} sur ${resultats.length})`}
              </p>
              <SearchResults
                resultats={filteredResultats}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                expandedId={expandedId}
                onToggleExpand={handleToggleExpand}
                onSave={handleSave}
                saving={saving}
              />
            </>
          )}

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
