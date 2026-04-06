"use client"

import { useState } from "react"

type RelanceKey = "email" | "maquette" | "rdv" | "devis"
type Delais = Record<RelanceKey, number>
type Props = { initial: Delais }

const RELANCE_LABELS: { key: RelanceKey; label: string; description: string }[] = [
  { key: "email", label: "Email", description: "Délai avant relance email (jours)" },
  { key: "maquette", label: "Maquette", description: "Délai avant relance maquette (jours)" },
  { key: "rdv", label: "RDV", description: "Délai avant relance rendez-vous (jours)" },
  { key: "devis", label: "Devis", description: "Délai avant relance devis (jours)" },
]

async function saveParam(cle: string, valeur: string) {
  const res = await fetch("/api/parametres", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cle, valeur }),
  })
  if (!res.ok) throw new Error("Erreur lors de la sauvegarde")
}

export function RelanceSection({ initial }: Props) {
  const [delais, setDelais] = useState<Delais>(initial)
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
        RELANCE_LABELS.map(({ key }) =>
          saveParam(`relance.delai.${key}`, String(delais[key]))
        )
      )
      showToast("Délais sauvegardés", true)
    } catch {
      showToast("Erreur lors de la sauvegarde", false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-[#737373]">
        Nombre de jours avant d&apos;envoyer une relance automatique selon le statut prospect.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {RELANCE_LABELS.map(({ key, label, description }) => (
          <div key={key}>
            <label className="block text-xs text-[#737373] mb-1">{description}</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="365"
                value={delais[key]}
                onChange={(e) =>
                  setDelais((d) => ({
                    ...d,
                    [key]: Math.max(1, parseInt(e.target.value, 10) || 1),
                  }))
                }
                className="w-24 bg-[#0a0a0a] border border-[#1a1a1a] rounded-[6px] px-3 py-2 text-sm text-[#fafafa] focus:outline-none focus:border-[#737373] transition-colors"
              />
              <span className="text-sm text-[#737373]">jours — {label}</span>
            </div>
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
