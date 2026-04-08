"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import type { AnalyseStep } from "@/lib/analyse-job"

interface Props {
  etapes: AnalyseStep[]
  systemPrompt?: string
}

export function AnalyseDetailsPanel({ etapes, systemPrompt }: Props) {
  const [open, setOpen] = useState(false)

  const searchStep = etapes.find((e) => e.nom === "search_competitors")
  const scrapeStep = etapes.find((e) => e.nom === "scrape_competitors")

  const competitors =
    searchStep?.data && typeof searchStep.data === "object"
      ? ((searchStep.data as { competitors?: { nom: string; ville: string; siteUrl: string | null }[] }).competitors ?? [])
      : []
  const scrapeData =
    scrapeStep?.data && typeof scrapeStep.data === "object"
      ? (scrapeStep.data as { analysed?: string[]; failed?: string[]; noWebsite?: string[] })
      : {}

  return (
    <div className="rounded-[6px] border border-[#1a1a1a] bg-[#0a0a0a]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-[#111] transition-colors rounded-[6px]"
      >
        <span className="text-xs text-[#737373] uppercase tracking-wider">
          Détails de l&apos;analyse
        </span>
        {open ? (
          <ChevronDown size={16} className="text-[#737373]" />
        ) : (
          <ChevronRight size={16} className="text-[#737373]" />
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 flex flex-col gap-4">
              <section>
                <p className="text-xs text-[#555555] uppercase tracking-wider mb-2">
                  Concurrents identifiés ({competitors.length})
                </p>
                <ul className="flex flex-col gap-1">
                  {competitors.map((c, i) => (
                    <li key={i} className="text-xs text-[#fafafa]">
                      {c.nom} — {c.ville}
                      {c.siteUrl ? (
                        <span className="text-[#737373]"> · {c.siteUrl}</span>
                      ) : (
                        <span className="text-[#555555]"> · pas de site</span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>

              {(scrapeData.failed?.length ?? 0) > 0 && (
                <section>
                  <p className="text-xs text-[#555555] uppercase tracking-wider mb-2">
                    Sites inaccessibles
                  </p>
                  <ul className="flex flex-col gap-1">
                    {scrapeData.failed!.map((n, i) => (
                      <li key={i} className="text-xs text-[#fbbf24]">
                        {n}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {systemPrompt && (
                <section>
                  <p className="text-xs text-[#555555] uppercase tracking-wider mb-2">
                    Prompt système utilisé
                  </p>
                  <pre className="text-xs text-[#737373] whitespace-pre-wrap font-mono bg-[#000] p-3 rounded-[6px] border border-[#1a1a1a]">
                    {systemPrompt}
                  </pre>
                </section>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
