"use client"

import { useState } from "react"

type WeightKey =
  | "presenceWeb"
  | "seo"
  | "design"
  | "financier"
  | "potentiel"

type Weights = Record<WeightKey, number>

type Props = { initial: Weights }

const WEIGHT_LABELS: { key: WeightKey; label: string }[] = [
  { key: "presenceWeb", label: "Présence web" },
  { key: "seo", label: "SEO" },
  { key: "design", label: "Design" },
  { key: "financier", label: "Financier" },
  { key: "potentiel", label: "Potentiel" },
]

async function saveParam(cle: string, valeur: string) {
  const res = await fetch("/api/parametres", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cle, valeur }),
  })
  if (!res.ok) throw new Error("Erreur lors de la sauvegarde")
}

export function ScoringSection({ initial }: Props) {
  const [weights, setWeights] = useState<Weights>(initial)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null)

  function showToast(message: string, ok: boolean) {
    setToast({ message, ok })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await Promise.all(
        WEIGHT_LABELS.map(({ key }) =>
          saveParam(`scoring.poids.${key}`, String(weights[key]))
        )
      )
      showToast("Poids sauvegardés", true)
    } catch {
      showToast("Erreur lors de la sauvegarde", false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-[#737373]">
        Chaque axe est pondéré de 0 à 5. Ces valeurs modifient le score global des prospects.
      </p>

      <div className="space-y-3">
        {WEIGHT_LABELS.map(({ key, label }) => (
          <div key={key}>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm text-[#fafafa]">{label}</label>
              <span className="text-sm font-mono text-[#fafafa] w-8 text-right">
                {weights[key].toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="5"
              step="0.1"
              value={weights[key]}
              onChange={(e) =>
                setWeights((w) => ({ ...w, [key]: parseFloat(e.target.value) }))
              }
              className="w-full accent-white"
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-[#ffffff] text-black text-sm font-medium rounded-[6px] hover:bg-[#e5e5e5] transition-colors disabled:opacity-50"
        >
          {saving ? "Sauvegarde..." : "Sauvegarder"}
        </button>
        {toast && (
          <span className={`text-sm ${toast.ok ? "text-[#4ade80]" : "text-[#f87171]"}`}>
            {toast.message}
          </span>
        )}
      </div>
    </div>
  )
}
