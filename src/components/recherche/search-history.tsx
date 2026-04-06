"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"

type HistoryEntry = {
  id: string
  query: string
  ville: string | null
  rayon: number | null
  createdAt: string
}

function formatRelativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "à l'instant"
  if (minutes < 60) return `il y a ${minutes}min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `il y a ${days}j`
}

function formatRayon(rayon: number | null): string {
  if (!rayon) return ""
  return ` · ${rayon / 1000}km`
}

type Props = {
  onReplay: (query: string, ville: string, rayon: string) => void
}

export function SearchHistory({ onReplay }: Props) {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void fetch("/api/recherches")
      .then((r) => r.json())
      .then((json: { data: HistoryEntry[] }) => {
        setHistory(json.data ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    await fetch(`/api/recherches/${id}`, { method: "DELETE" })
    setHistory((prev) => prev.filter((h) => h.id !== id))
  }

  if (loading || history.length === 0) return null

  return (
    <div className="mb-6">
      <p className="text-xs text-[#555555] uppercase tracking-wider mb-2">Recherches récentes</p>
      <div className="flex flex-wrap gap-2">
        {history.map((entry) => (
          <button
            key={entry.id}
            onClick={() => onReplay(entry.query, entry.ville ?? "", String(entry.rayon ?? 10000))}
            className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-[6px] bg-[#0a0a0a] border border-[#1a1a1a] text-xs text-[#737373] hover:border-[#333333] hover:text-[#fafafa] transition-colors cursor-pointer"
          >
            <span>
              {entry.query}
              {entry.ville ? ` · ${entry.ville}` : ""}
              {formatRayon(entry.rayon)}
              <span className="ml-1 text-[#555555]">{formatRelativeDate(entry.createdAt)}</span>
            </span>
            <span
              role="button"
              aria-label="Supprimer"
              onClick={(e) => void handleDelete(entry.id, e)}
              className="text-[#555555] hover:text-[#f87171] transition-colors opacity-0 group-hover:opacity-100"
            >
              <X size={10} />
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
