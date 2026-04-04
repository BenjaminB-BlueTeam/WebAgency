"use client"

import { Save, Loader2 } from "lucide-react"
import { motion } from "motion/react"
import { Button } from "@/components/ui/button"
import { staggerContainer } from "@/lib/animations"
import { ResultCard } from "./result-card"
import type { SearchResult } from "@/types/places"

interface SearchResultsProps {
  resultats: SearchResult[]
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  expandedId: string | null
  onToggleExpand: (id: string) => void
  onSave: () => void
  saving: boolean
}

export function SearchResults({
  resultats,
  selectedIds,
  onToggleSelect,
  expandedId,
  onToggleExpand,
  onSave,
  saving,
}: SearchResultsProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-[#737373]">
          {resultats.length} résultat{resultats.length !== 1 ? "s" : ""} trouvé{resultats.length !== 1 ? "s" : ""}
        </span>
        <Button
          onClick={onSave}
          disabled={selectedIds.size === 0 || saving}
          className="bg-white text-black hover:bg-white/90"
          size="sm"
        >
          {saving ? (
            <>
              <Loader2 className="animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save />
              Enregistrer ({selectedIds.size})
            </>
          )}
        </Button>
      </div>
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-2"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {resultats.map((result) => (
          <ResultCard
            key={result.placeId}
            result={result}
            isSelected={selectedIds.has(result.placeId)}
            onToggleSelect={() => onToggleSelect(result.placeId)}
            isExpanded={expandedId === result.placeId}
            onToggleExpand={() => onToggleExpand(result.placeId)}
          />
        ))}
      </motion.div>
    </div>
  )
}
