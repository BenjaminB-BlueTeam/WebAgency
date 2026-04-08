"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ExternalLink, Search, FileDown } from "lucide-react"
import { motion } from "motion/react"
import { Button } from "@/components/ui/button"
import { staggerContainer, staggerItem, fadeInUp } from "@/lib/animations"
import { formatDate } from "@/lib/date"
import type { ProspectWithRelations } from "@/types/prospect"
import type { AnalyseResult, Concurrent } from "@/lib/analyse"
import type { AnalyseStep } from "@/lib/analyse-job"
import { AnalyseProgress } from "@/components/prospects/analyse-progress"
import { AnalyseDetailsPanel } from "@/components/prospects/analyse-details-panel"

interface AnalyseState {
  id: string
  concurrents: Concurrent[]
  synthese: string
  recommandations: string[]
  createdAt: string
}

interface JobState {
  id: string
  statut: "pending" | "running" | "done" | "failed"
  etapes: AnalyseStep[]
  resultat: AnalyseResult | null
  erreur: string | null
}

function parseRawAnalyse(raw: {
  id: string
  concurrents: string
  recommandations: string
  createdAt: string
}): AnalyseState | null {
  try {
    const concurrents = JSON.parse(raw.concurrents) as Concurrent[]
    const reco = JSON.parse(raw.recommandations) as { synthese: string; points: string[] }
    return {
      id: raw.id,
      concurrents,
      synthese: reco.synthese,
      recommandations: reco.points,
      createdAt: raw.createdAt,
    }
  } catch {
    return null
  }
}

interface Props {
  prospect: ProspectWithRelations
}

export function ProspectAnalyseTab({ prospect }: Props) {
  const [analyse, setAnalyse] = useState<AnalyseState | null>(() => {
    const raw = prospect.analyses[0]
    return raw ? parseRawAnalyse(raw) : null
  })
  const [job, setJob] = useState<JobState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const pollJob = useCallback(
    async (jobId: string) => {
      try {
        const res = await fetch(`/api/prospects/${prospect.id}/analyse/status/${jobId}`)
        const json = await res.json()
        if (!res.ok) {
          setError(json.error ?? "Erreur")
          stopPolling()
          return
        }
        const data = json.data as JobState
        setJob(data)
        if (data.statut === "done") {
          stopPolling()
          if (data.resultat) {
            setAnalyse({
              id: jobId,
              concurrents: data.resultat.concurrents,
              synthese: data.resultat.synthese,
              recommandations: data.resultat.recommandations,
              createdAt: new Date().toISOString(),
            })
          }
        } else if (data.statut === "failed") {
          stopPolling()
          setError(data.erreur ?? "Analyse échouée")
        }
      } catch {
        setError("Erreur réseau")
        stopPolling()
      }
    },
    [prospect.id, stopPolling]
  )

  useEffect(() => stopPolling, [stopPolling])

  async function handleAnalyse() {
    setError(null)
    setJob({ id: "", statut: "pending", etapes: [], resultat: null, erreur: null })
    try {
      const res = await fetch(`/api/prospects/${prospect.id}/analyse`, { method: "POST" })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "Erreur lors du lancement")
        setJob(null)
        return
      }
      const jobId = json.data.jobId as string
      setJob((j) => (j ? { ...j, id: jobId } : j))
      await pollJob(jobId)
      pollRef.current = setInterval(() => pollJob(jobId), 2000)
    } catch {
      setError("Erreur réseau")
      setJob(null)
    }
  }

  if (job && job.statut !== "done" && job.statut !== "failed") {
    return (
      <div className="py-8">
        <div className="rounded-[6px] border border-[#1a1a1a] bg-[#0a0a0a] p-6">
          <p className="text-xs text-[#555555] uppercase tracking-wider mb-4">
            Analyse en cours
          </p>
          <AnalyseProgress etapes={job.etapes} />
        </div>
      </div>
    )
  }

  if (!analyse) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Search size={48} className="text-[#555555] mb-4" />
        <p className="text-sm text-[#737373] mb-4">Aucune analyse concurrentielle</p>
        {error && <p className="text-xs text-[#f87171] mb-4">{error}</p>}
        <Button onClick={handleAnalyse}>Lancer l&apos;analyse concurrentielle</Button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-xs text-[#555555]">Analysé le {formatDate(analyse.createdAt)}</p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/api/prospects/${prospect.id}/analyse/pdf`, "_blank")}
          >
            <FileDown size={14} className="mr-1" />
            Exporter en PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleAnalyse}>
            Relancer l&apos;analyse
          </Button>
        </div>
      </div>

      {error && <p className="text-xs text-[#f87171] mb-4">{error}</p>}

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6"
      >
        {analyse.concurrents.map((c, i) => (
          <motion.div
            key={i}
            variants={staggerItem}
            className="rounded-[6px] border border-[#1a1a1a] bg-[#0a0a0a] p-4"
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <p className="text-sm font-semibold text-[#fafafa]">{c.nom}</p>
              <a
                href={c.siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#737373] hover:text-[#fafafa] transition-colors shrink-0"
              >
                <ExternalLink size={14} />
              </a>
            </div>
            {c.forces.length > 0 && (
              <div className="mb-2">
                <p className="text-xs text-[#555555] uppercase tracking-wider mb-1">Forces</p>
                <ul className="flex flex-col gap-0.5">
                  {c.forces.map((f, j) => (
                    <li key={j} className="text-xs text-[#fafafa] flex items-start gap-1">
                      <span className="text-[#4ade80] mt-0.5 shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {c.faiblesses.length > 0 && (
              <div className="mb-2">
                <p className="text-xs text-[#555555] uppercase tracking-wider mb-1">Faiblesses</p>
                <ul className="flex flex-col gap-0.5">
                  {c.faiblesses.map((f, j) => (
                    <li key={j} className="text-xs text-[#fafafa] flex items-start gap-1">
                      <span className="text-[#f87171] mt-0.5 shrink-0">✗</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {c.positionnement && (
              <p className="text-xs text-[#737373] italic mt-2">{c.positionnement}</p>
            )}
          </motion.div>
        ))}
      </motion.div>

      <motion.div variants={fadeInUp} initial="initial" animate="animate" className="mb-4">
        <div className="rounded-[6px] border border-[#1a1a1a] bg-[#0a0a0a] p-4">
          <p className="text-xs text-[#555555] uppercase tracking-wider mb-3">
            Synthèse &amp; Recommandations
          </p>
          <p className="text-sm text-[#fafafa] mb-4">{analyse.synthese}</p>
          <ul className="flex flex-col gap-2">
            {analyse.recommandations.map((r, i) => (
              <li key={i} className="text-sm text-[#fafafa] flex items-start gap-2">
                <span className="text-[#fbbf24] mt-0.5 shrink-0">→</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      </motion.div>

      {job && job.etapes.length > 0 && <AnalyseDetailsPanel etapes={job.etapes} />}
    </div>
  )
}
