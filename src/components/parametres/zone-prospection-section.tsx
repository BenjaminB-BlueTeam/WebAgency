"use client"

import { useState } from "react"
import { X } from "lucide-react"

type Props = {
  initialVilles: string[]
  initialRayon: number
}

async function saveParam(cle: string, valeur: string) {
  const res = await fetch("/api/parametres", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cle, valeur }),
  })
  if (!res.ok) throw new Error("Erreur lors de la sauvegarde")
}

export function ZoneProspectionSection({ initialVilles, initialRayon }: Props) {
  const [villes, setVilles] = useState<string[]>(initialVilles)
  const [newVille, setNewVille] = useState("")
  const [rayon, setRayon] = useState(initialRayon)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null)

  function showToast(message: string, ok: boolean) {
    setToast({ message, ok })
    setTimeout(() => setToast(null), 3000)
  }

  function handleAddVille() {
    const trimmed = newVille.trim()
    if (!trimmed || villes.includes(trimmed)) return
    setVilles((v) => [...v, trimmed])
    setNewVille("")
  }

  function handleRemoveVille(ville: string) {
    setVilles((v) => v.filter((c) => c !== ville))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await Promise.all([
        saveParam("prospection.villes", JSON.stringify(villes)),
        saveParam("prospection.rayonKm", String(rayon)),
      ])
      showToast("Zone sauvegardée", true)
    } catch {
      showToast("Erreur lors de la sauvegarde", false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-[#737373]">
        Définissez les villes cibles et le rayon de recherche par défaut pour la prospection.
      </p>

      {/* Add city */}
      <div>
        <label className="block text-xs text-[#737373] mb-1">Ajouter une ville</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newVille}
            onChange={(e) => setNewVille(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddVille()}
            placeholder="Ex : Lille, Roubaix..."
            className="flex-1 bg-[#0a0a0a] border border-[#1a1a1a] rounded-[6px] px-3 py-2 text-sm text-[#fafafa] placeholder-[#555555] focus:outline-none focus:border-[#737373] transition-colors"
          />
          <button
            onClick={handleAddVille}
            className="px-4 py-2 bg-[#1a1a1a] text-[#fafafa] text-sm rounded-[6px] hover:bg-[#2a2a2a] transition-colors"
          >
            Ajouter
          </button>
        </div>
      </div>

      {/* City list */}
      {villes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {villes.map((ville) => (
            <span
              key={ville}
              className="inline-flex items-center gap-1 px-3 py-1 bg-[#0a0a0a] border border-[#1a1a1a] rounded-[9999px] text-sm text-[#fafafa]"
            >
              {ville}
              <button
                onClick={() => handleRemoveVille(ville)}
                className="text-[#737373] hover:text-[#f87171] transition-colors ml-1"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Default radius */}
      <div>
        <label className="block text-xs text-[#737373] mb-1">Rayon par défaut (km)</label>
        <input
          type="number"
          min="1"
          max="200"
          value={rayon}
          onChange={(e) => setRayon(Math.max(1, parseInt(e.target.value, 10) || 1))}
          className="w-28 bg-[#0a0a0a] border border-[#1a1a1a] rounded-[6px] px-3 py-2 text-sm text-[#fafafa] focus:outline-none focus:border-[#737373] transition-colors"
        />
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
