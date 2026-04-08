"use client"

import { Check, AlertTriangle } from "lucide-react"
import { motion } from "motion/react"
import type { AnalyseStep } from "@/lib/analyse-job"
import { staggerContainer, staggerItem } from "@/lib/animations"

interface Props {
  etapes: AnalyseStep[]
}

export function AnalyseProgress({ etapes }: Props) {
  if (etapes.length === 0) {
    return (
      <div className="flex items-center gap-3 text-sm text-[#737373]">
        <div className="w-4 h-4 border-2 border-[#737373] border-t-[#fafafa] rounded-full animate-spin" />
        Initialisation…
      </div>
    )
  }

  return (
    <motion.ul
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="flex flex-col gap-2"
    >
      {etapes.map((step, i) => {
        const isSubstep = step.nom.includes(":")
        return (
          <motion.li
            key={`${step.nom}-${i}`}
            variants={staggerItem}
            className={`flex items-start gap-3 text-sm ${isSubstep ? "pl-6" : ""}`}
          >
            <div className="pt-0.5 shrink-0">
              {step.statut === "running" && (
                <div
                  data-testid={`step-loader-${step.nom}`}
                  className="w-4 h-4 border-2 border-[#737373] border-t-[#fafafa] rounded-full animate-spin"
                />
              )}
              {step.statut === "done" && (
                <Check
                  data-testid={`step-done-${step.nom}`}
                  size={16}
                  className="text-[#4ade80]"
                />
              )}
              {step.statut === "failed" && (
                <AlertTriangle
                  data-testid={`step-failed-${step.nom}`}
                  size={16}
                  className="text-[#fbbf24]"
                />
              )}
            </div>
            <span
              className={
                step.statut === "failed"
                  ? "text-[#fbbf24]"
                  : step.statut === "done"
                    ? "text-[#fafafa]"
                    : "text-[#737373]"
              }
            >
              {step.message ?? step.nom}
            </span>
          </motion.li>
        )
      })}
    </motion.ul>
  )
}
