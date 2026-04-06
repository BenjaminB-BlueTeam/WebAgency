"use client"

import { useState } from "react"

type ProfilValues = {
  nom: string
  contact: string
  email: string
  telephone: string
  adresse: string
}

type Props = { initial: ProfilValues }

async function saveParam(cle: string, valeur: string) {
  const res = await fetch("/api/parametres", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cle, valeur }),
  })
  if (!res.ok) throw new Error("Erreur lors de la sauvegarde")
}

export function ProfilSection({ initial }: Props) {
  const [values, setValues] = useState<ProfilValues>(initial)
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
        saveParam("agence.nom", values.nom),
        saveParam("agence.contact", values.contact),
        saveParam("agence.email", values.email),
        saveParam("agence.telephone", values.telephone),
        saveParam("agence.adresse", values.adresse),
      ])
      showToast("Profil sauvegardé", true)
    } catch {
      showToast("Erreur lors de la sauvegarde", false)
    } finally {
      setSaving(false)
    }
  }

  const fields: { label: string; key: keyof ProfilValues; type?: string }[] = [
    { label: "Nom de l'agence", key: "nom" },
    { label: "Contact", key: "contact" },
    { label: "Email", key: "email", type: "email" },
    { label: "Téléphone", key: "telephone", type: "tel" },
    { label: "Adresse", key: "adresse" },
  ]

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(({ label, key, type }) => (
          <div key={key}>
            <label className="block text-xs text-[#737373] mb-1">{label}</label>
            <input
              type={type ?? "text"}
              value={values[key]}
              onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
              className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-[6px] px-3 py-2 text-sm text-[#fafafa] focus:outline-none focus:border-[#737373] transition-colors"
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
