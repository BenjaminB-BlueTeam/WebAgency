"use client"

import { motion } from "motion/react"
import type { PipelineSlice } from "@/lib/dashboard"

interface PipelineBarProps {
  pipeline: PipelineSlice[]
}

export function PipelineBar({ pipeline }: PipelineBarProps) {
  const total = pipeline.reduce((sum, s) => sum + s.count, 0)

  return (
    <div className="rounded-[6px] border border-[#1a1a1a] bg-[#0a0a0a] p-4">
      <p className="text-xs text-[#555555] uppercase tracking-wider mb-3">Répartition pipeline</p>

      {total === 0 ? (
        <p className="text-sm text-[#555555]">Aucun prospect</p>
      ) : (
        <>
          {/* Barre */}
          <div className="flex h-2 rounded-full overflow-hidden mb-3" style={{ backgroundColor: "#1a1a1a" }}>
            {pipeline
              .filter((s) => s.count > 0)
              .map((s) => (
                <motion.div
                  key={s.statut}
                  title={`${s.label}: ${s.count}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${(s.count / total) * 100}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  style={{ backgroundColor: s.color }}
                />
              ))}
          </div>

          {/* Légende */}
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {pipeline
              .filter((s) => s.count > 0)
              .map((s) => (
                <div key={s.statut} className="flex items-center gap-1">
                  <span
                    className="inline-block w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="text-xs text-[#737373]">
                    {s.label} <span className="text-[#555555]">({s.count})</span>
                  </span>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  )
}
