"use client"

import { Star, Globe, Phone, MapPin, ExternalLink } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { staggerItem, expandCollapse } from "@/lib/animations"
import type { SearchResult } from "@/types/places"

interface ResultCardProps {
  result: SearchResult
  isSelected: boolean
  onToggleSelect: () => void
  isExpanded: boolean
  onToggleExpand: () => void
}

export function ResultCard({
  result,
  isSelected,
  onToggleSelect,
  isExpanded,
  onToggleExpand,
}: ResultCardProps) {

  return (
    <motion.div
      variants={staggerItem}
      className={`rounded-[6px] border bg-[#0a0a0a] p-3 cursor-pointer transition-colors ${
        isSelected ? "border-[#fafafa]" : "border-[#1a1a1a]"
      }`}
      onClick={onToggleExpand}
    >
      {/* Header row */}
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={isSelected}
          disabled={result.dejaEnBase}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 shrink-0 accent-white cursor-pointer disabled:cursor-not-allowed"
        />
        <div className="flex-1 min-w-0">
          <p className="text-[#fafafa] font-medium text-sm truncate">{result.nom}</p>
          <p className="text-[#737373] text-xs truncate mt-0.5">{result.adresse}</p>

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {result.noteGoogle !== null && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[9999px] bg-[#1a1a1a] text-xs text-[#fafafa]">
                <Star className="w-3 h-3 text-[#fbbf24] fill-[#fbbf24]" />
                {result.noteGoogle.toFixed(1)}
                {result.nbAvisGoogle !== null && (
                  <span className="text-[#737373]">({result.nbAvisGoogle})</span>
                )}
              </span>
            )}
            {result.siteUrl ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[9999px] bg-[#1a1a1a] text-xs text-[#4ade80]">
                <Globe className="w-3 h-3" />
                A un site
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[9999px] bg-[#1a1a1a] text-xs text-[#fbbf24]">
                <Globe className="w-3 h-3" />
                Pas de site
              </span>
            )}
            {result.scoreGlobal != null && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-[9999px] bg-[#0a0a0a] border border-[#1a1a1a] text-xs text-[#fafafa]">
                Score : {result.scoreGlobal}/10
              </span>
            )}
            {result.dejaEnBase && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-[9999px] bg-[#1a1a1a] text-xs text-[#737373]">
                Déjà enregistré
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Expanded section */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            variants={expandCollapse}
            initial="initial"
            animate="animate"
            exit="exit"
            className="mt-3 pt-3 border-t border-[#1a1a1a] space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-xs text-[#737373]">
              <MapPin className="w-3 h-3 shrink-0" />
              <span>{result.adresse}</span>
            </div>
            {result.telephone && (
              <div className="flex items-center gap-2 text-xs text-[#737373]">
                <Phone className="w-3 h-3 shrink-0" />
                <span>{result.telephone}</span>
              </div>
            )}
            {result.siteUrl && (
              <div className="flex items-center gap-2 text-xs">
                <Globe className="w-3 h-3 shrink-0 text-[#737373]" />
                <a
                  href={result.siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#fafafa] hover:underline flex items-center gap-1 truncate"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="truncate">{result.siteUrl}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
