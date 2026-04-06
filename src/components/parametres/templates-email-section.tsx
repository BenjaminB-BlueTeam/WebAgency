"use client"

import { useState } from "react"

type Props = {
  initialProspection: string
  initialRelance: string
}

async function saveParam(cle: string, valeur: string) {
  const res = await fetch("/api/parametres", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cle, valeur }),
  })
  if (!res.ok) throw new Error("Erreur lors de la sauvegarde")
}

export function TemplatesEmailSection({ initialProspection, initialRelance }: Props) {
  const [prospection, setProspection] = useState(initialProspection)
  const [relance, setRelance] = useState(initialRelance)
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
        saveParam("email.prospection.systemPrompt", prospection),
        saveParam("email.relance.systemPrompt", relance),
      ])
      showToast("Templates sauvegardés", true)
    } catch {
      showToast("Erreur lors de la sauvegarde", false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-[#737373]">
        Ces prompts système sont injectés dans Claude lors de la génération d&apos;emails.
      </p>

      <div>
        <label className="block text-sm font-medium text-[#fafafa] mb-1">
          Prompt — Prospection
        </label>
        <p className="text-xs text-[#737373] mb-2">
          Utilisé pour générer les premiers emails de prospection.
        </p>
        <textarea
          rows={8}
          value={prospection}
          onChange={(e) => setProspection(e.target.value)}
          className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-[6px] px-3 py-2 text-sm text-[#fafafa] font-mono resize-y focus:outline-none focus:border-[#737373] transition-colors"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#fafafa] mb-1">
          Prompt — Relance
        </label>
        <p className="text-xs text-[#737373] mb-2">
          Utilisé pour générer les emails de relance.
        </p>
        <textarea
          rows={8}
          value={relance}
          onChange={(e) => setRelance(e.target.value)}
          className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-[6px] px-3 py-2 text-sm text-[#fafafa] font-mono resize-y focus:outline-none focus:border-[#737373] transition-colors"
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
