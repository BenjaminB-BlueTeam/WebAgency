"use client"

import { motion } from "motion/react"
import { progressBar } from "@/lib/animations"

interface ScoreBarProps {
  label: string
  value: number | null | undefined
}

export function ScoreBar({ label, value }: ScoreBarProps) {
  const displayValue = value ?? null
  const percentage = displayValue !== null ? displayValue * 10 : 0

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[#737373] w-24 shrink-0">{label}</span>
      <div className="flex-1 h-1 rounded-full" style={{ backgroundColor: "#1a1a1a" }}>
        {displayValue !== null && (
          <motion.div
            className="h-full rounded-full bg-white"
            variants={progressBar(percentage)}
            initial="initial"
            animate="animate"
          />
        )}
      </div>
      <span className="text-xs text-[#737373] w-8 text-right">
        {displayValue !== null ? `${displayValue}/10` : "\u2014"}
      </span>
    </div>
  )
}
