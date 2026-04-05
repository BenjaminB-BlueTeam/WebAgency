"use client"

import { useEffect, useRef } from "react"
import { motion, useMotionValue, useTransform, animate } from "motion/react"
import { countUpTransition } from "@/lib/animations"

interface StatCardProps {
  label: string
  value: number
  format?: "number" | "percent"
  sublabel?: string
}

export function StatCard({ label, value, format = "number", sublabel }: StatCardProps) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => {
    const n = Math.round(v)
    return format === "percent" ? `${n}%` : String(n)
  })
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (hasAnimated.current) return
    hasAnimated.current = true
    animate(count, value, countUpTransition)
  }, [count, value])

  return (
    <div
      className="rounded-[6px] border border-[#1a1a1a] bg-[#0a0a0a] p-4"
    >
      <p className="text-xs text-[#737373] uppercase tracking-wider mb-2">{label}</p>
      <motion.p className="text-2xl font-bold text-[#fafafa]">{rounded}</motion.p>
      {sublabel && <p className="text-xs text-[#555555] mt-1">{sublabel}</p>}
    </div>
  )
}
