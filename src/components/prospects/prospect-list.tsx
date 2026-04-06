"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "motion/react"
import { ChevronUp, ChevronDown, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { staggerContainer } from "@/lib/animations"
import { Button } from "@/components/ui/button"
import { ProspectFilters } from "@/components/prospects/prospect-filters"
import { ProspectRow } from "@/components/prospects/prospect-row"
import { ProspectCardMobile } from "@/components/prospects/prospect-card-mobile"
import { ProspectExpand } from "@/components/prospects/prospect-expand"
import { EmptyState } from "@/components/prospects/empty-state"
import type { Prospect } from "@/types/prospect"

type SortKey = "nom" | "scoreGlobal" | "createdAt"
type SortOrder = "asc" | "desc"

interface ProspectListProps {
  initialProspects: Prospect[]
}

function SkeletonRow() {
  return (
    <tr>
      <td colSpan={9} className="py-2 px-4">
        <div className="h-12 w-full rounded-[6px] bg-[#0a0a0a] animate-pulse" />
      </td>
    </tr>
  )
}

function SkeletonCard() {
  return (
    <div className="h-12 w-full rounded-[6px] bg-[#0a0a0a] animate-pulse" />
  )
}

const SORTABLE_COLUMNS: { label: string; key: SortKey | null; className?: string }[] = [
  { label: "Nom", key: "nom" },
  { label: "Activité", key: null, className: "hidden lg:table-cell" },
  { label: "Ville", key: null, className: "hidden md:table-cell" },
  { label: "Score", key: "scoreGlobal" },
  { label: "Note Google", key: null, className: "hidden lg:table-cell" },
  { label: "Site", key: null, className: "hidden xl:table-cell" },
  { label: "Statut", key: null },
  { label: "Date", key: "createdAt", className: "hidden md:table-cell" },
]

export function ProspectList({ initialProspects }: ProspectListProps) {
  const [prospects, setProspects] = useState<Prospect[]>(initialProspects)
  const [loading, setLoading] = useState(false)
  const [initialLoad] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statut, setStatut] = useState("all")
  const [scoreMin, setScoreMin] = useState(0)
  const [sort, setSort] = useState<SortKey>("createdAt")
  const [order, setOrder] = useState<SortOrder>("desc")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)

  const fetchProspects = useCallback(
    async (params: {
      search: string
      statut: string
      scoreMin: number
      sort: SortKey
      order: SortOrder
    }) => {
      setLoading(true)
      try {
        const url = new URL("/api/prospects", window.location.origin)
        if (params.search) url.searchParams.set("search", params.search)
        if (params.statut !== "all") url.searchParams.set("statut", params.statut)
        if (params.scoreMin > 0) url.searchParams.set("scoreMin", String(params.scoreMin))
        url.searchParams.set("sort", params.sort)
        url.searchParams.set("order", params.order)

        const res = await fetch(url.toString())
        if (!res.ok) throw new Error("Fetch failed")
        const json = await res.json() as { data: Prospect[] }
        setProspects(json.data)
      } catch {
        // silently keep existing data on error
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Debounce search
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value)
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
      searchDebounceRef.current = setTimeout(() => {
        void fetchProspects({ search: value, statut, scoreMin, sort, order })
      }, 300)
    },
    [statut, scoreMin, sort, order, fetchProspects]
  )

  // Immediate fetch on filter changes (statut, scoreMin, sort, order)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    void fetchProspects({ search, statut, scoreMin, sort, order })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statut, scoreMin, sort, order])

  const handleSortClick = useCallback(
    (key: SortKey) => {
      if (sort === key) {
        setOrder((prev) => (prev === "asc" ? "desc" : "asc"))
      } else {
        setSort(key)
        setOrder("desc")
      }
    },
    [sort]
  )

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }, [])

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.size === prospects.length ? new Set() : new Set(prospects.map((p) => p.id))
    )
  }, [prospects])

  async function handleBulkDelete() {
    setDeleting(true)
    try {
      const res = await fetch("/api/prospects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })
      if (!res.ok) throw new Error("Delete failed")
      const json = await res.json() as { data: { deleted: number } }
      toast.success(`${json.data.deleted} prospect${json.data.deleted > 1 ? "s" : ""} supprimé${json.data.deleted > 1 ? "s" : ""}`)
      setSelectedIds(new Set())
      setConfirmingDelete(false)
      await fetchProspects({ search, statut, scoreMin, sort, order })
    } catch {
      toast.error("Erreur lors de la suppression")
    } finally {
      setDeleting(false)
    }
  }

  const hasFilters = search !== "" || statut !== "all" || scoreMin > 0
  const allSelected = prospects.length > 0 && selectedIds.size === prospects.length
  const someSelected = selectedIds.size > 0

  const SortIcon = ({ colKey }: { colKey: SortKey }) => {
    if (sort !== colKey) return <ChevronDown size={12} className="text-[#555555] ml-1 inline" />
    return order === "asc"
      ? <ChevronUp size={12} className="text-[#fafafa] ml-1 inline" />
      : <ChevronDown size={12} className="text-[#fafafa] ml-1 inline" />
  }

  return (
    <div>
      <ProspectFilters
        search={search}
        onSearchChange={handleSearchChange}
        statut={statut}
        onStatutChange={(v) => setStatut(v)}
        scoreMin={scoreMin}
        onScoreMinChange={(v) => setScoreMin(v)}
      />

      {/* Bulk delete bar */}
      {someSelected && (
        <div className="flex items-center gap-3 mb-4 px-1">
          <span className="text-sm text-[#737373]">
            {selectedIds.size} sélectionné{selectedIds.size > 1 ? "s" : ""}
          </span>
          {confirmingDelete ? (
            <>
              <span className="text-sm text-[#f87171]">Supprimer définitivement ?</span>
              <Button size="sm" variant="outline" onClick={() => setConfirmingDelete(false)}>
                Annuler
              </Button>
              <Button
                size="sm"
                className="bg-[#f87171] text-black hover:bg-[#f87171]/90"
                onClick={handleBulkDelete}
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
              <Trash2 size={14} />
              Supprimer ({selectedIds.size})
            </Button>
          )}
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1a1a1a]">
              <th className="py-2 px-2 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAll}
                  className="accent-white cursor-pointer"
                />
              </th>
              {SORTABLE_COLUMNS.map((col) => (
                <th
                  key={col.label}
                  className={`py-2 px-4 text-left text-xs font-medium text-[#737373] uppercase tracking-wider select-none ${
                    col.key ? "cursor-pointer hover:text-[#fafafa] transition-colors" : ""
                  } ${col.className ?? ""}`}
                  onClick={col.key ? () => handleSortClick(col.key!) : undefined}
                >
                  {col.label}
                  {col.key && <SortIcon colKey={col.key} />}
                </th>
              ))}
            </tr>
          </thead>

          {/* Initial loading: 8 skeleton rows */}
          {initialLoad ? (
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </tbody>
          ) : (
            <>
              {/* Filter change loading: 3 skeleton rows above */}
              {loading && (
                <tbody>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <SkeletonRow key={i} />
                  ))}
                </tbody>
              )}

              {prospects.length === 0 ? (
                <tbody>
                  <tr>
                    <td colSpan={9}>
                      {hasFilters ? (
                        <p className="py-12 text-center text-sm text-[#737373]">
                          Aucun prospect trouvé pour ces filtres
                        </p>
                      ) : (
                        <EmptyState />
                      )}
                    </td>
                  </tr>
                </tbody>
              ) : (
                <motion.tbody
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                >
                  {prospects.map((prospect) => (
                    <React.Fragment key={prospect.id}>
                      <ProspectRow
                        prospect={prospect}
                        isExpanded={expandedId === prospect.id}
                        onToggle={() => toggleExpand(prospect.id)}
                        isSelected={selectedIds.has(prospect.id)}
                        onSelect={() => handleToggleSelect(prospect.id)}
                      />
                      <AnimatePresence>
                        {expandedId === prospect.id && (
                          <tr>
                            <td colSpan={9} className="p-0">
                              <ProspectExpand prospect={prospect} />
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  ))}
                </motion.tbody>
              )}
            </>
          )}
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden">
        {initialLoad ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <>
            {loading && (
              <div className="flex flex-col gap-2 mb-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            )}

            {prospects.length === 0 ? (
              hasFilters ? (
                <p className="py-12 text-center text-sm text-[#737373]">
                  Aucun prospect trouvé pour ces filtres
                </p>
              ) : (
                <EmptyState />
              )
            ) : (
              <motion.div
                className="flex flex-col gap-2"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                {prospects.map((prospect) => (
                  <div key={prospect.id}>
                    <ProspectCardMobile
                      prospect={prospect}
                      onToggle={() => toggleExpand(prospect.id)}
                      isSelected={selectedIds.has(prospect.id)}
                      onSelect={() => handleToggleSelect(prospect.id)}
                    />
                    <AnimatePresence>
                      {expandedId === prospect.id && (
                        <ProspectExpand prospect={prospect} />
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
