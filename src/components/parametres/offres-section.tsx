"use client"

import { useState } from "react"

type OffreVitrine = {
  prix: string
  description: string
}

type OffreVisibilite = {
  prix: string
  maintenance: string
  description: string
}

type Props = {
  initialVitrine: OffreVitrine
  initialVisibilite: OffreVisibilite
}

async function saveParam(cle: string, valeur: string) {
  const res = await fetch("/api/parametres", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cle, valeur }),
  })
  if (!res.ok) throw new Error("Erreur lors de la sauvegarde")
}

export function OffresSection({ initialVitrine, initialVisibilite }: Props) {
  const [vitrine, setVitrine] = useState<OffreVitrine>(initialVitrine)
  const [visibilite, setVisibilite] = useState<OffreVisibilite>(initialVisibilite)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null)

  function showToast(message: string, ok: boolean) {
    setToast({ message, ok })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await Promise.all([
        saveParam("offre.vitrine.prix", vitrine.prix),
        saveParam("offre.vitrine.description", vitrine.description),
        saveParam("offre.visibilite.prix", visibilite.prix),
        saveParam("offre.visibilite.maintenance", visibilite.maintenance),
        saveParam("offre.visibilite.description", visibilite.description),
      ])
      showToast("Offres sauvegardées", true)
    } catch {
      showToast("Erreur lors de la sauvegarde", false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Offre Vitrine */}
      <div className="border border-[#1a1a1a] rounded-[6px] p-4 space-y-3">
        <h3 className="text-sm font-semibold text-[#fafafa]">Offre Vitrine</h3>

        <div>
          <label className="block text-xs text-[#737373] mb-1">Prix création (€)</label>
          <input
            type="number"
            min="0"
            value={vitrine.prix}
            onChange={(e) => setVitrine((v) => ({ ...v, prix: e.target.value }))}
            className="w-36 bg-[#0a0a0a] border border-[#1a1a1a] rounded-[6px] px-3 py-2 text-sm text-[#fafafa] focus:outline-none focus:border-[#737373] transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs text-[#737373] mb-1">Description</label>
          <textarea
            rows={3}
            value={vitrine.description}
            onChange={(e) => setVitrine((v) => ({ ...v, description: e.target.value }))}
            className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-[6px] px-3 py-2 text-sm text-[#fafafa] resize-y focus:outline-none focus:border-[#737373] transition-colors"
          />
        </div>
      </div>

      {/* Offre Visibilité */}
      <div className="border border-[#1a1a1a] rounded-[6px] p-4 space-y-3">
        <h3 className="text-sm font-semibold text-[#fafafa]">Offre Visibilité</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs text-[#737373] mb-1">Prix création (€)</label>
            <input
              type="number"
              min="0"
              value={visibilite.prix}
              onChange={(e) => setVisibilite((v) => ({ ...v, prix: e.target.value }))}
              className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-[6px] px-3 py-2 text-sm text-[#fafafa] focus:outline-none focus:border-[#737373] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-[#737373] mb-1">Prix maintenance /mois (€)</label>
            <input
              type="number"
              min="0"
              value={visibilite.maintenance}
              onChange={(e) => setVisibilite((v) => ({ ...v, maintenance: e.target.value }))}
              className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-[6px] px-3 py-2 text-sm text-[#fafafa] focus:outline-none focus:border-[#737373] transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-[#737373] mb-1">Description</label>
          <textarea
            rows={3}
            value={visibilite.description}
            onChange={(e) => setVisibilite((v) => ({ ...v, description: e.target.value }))}
            className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-[6px] px-3 py-2 text-sm text-[#fafafa] resize-y focus:outline-none focus:border-[#737373] transition-colors"
          />
        </div>
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
