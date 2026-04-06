"use client"

import { useState } from "react"
import { toast } from "sonner"

interface AddProspectModalProps {
  onCancel: () => void
  onSuccess: () => void
}

interface FormData {
  nom: string
  activite: string
  ville: string
  telephone: string
  email: string
  siteUrl: string
}

export function AddProspectModal({ onCancel, onSuccess }: AddProspectModalProps) {
  const [form, setForm] = useState<FormData>({
    nom: "",
    activite: "",
    ville: "",
    telephone: "",
    email: "",
    siteUrl: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleChange(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (error) setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nom.trim()) return

    setSubmitting(true)
    setError(null)

    const payload: Record<string, string> = { nom: form.nom.trim() }
    if (form.activite.trim()) payload.activite = form.activite.trim()
    if (form.ville.trim()) payload.ville = form.ville.trim()
    if (form.telephone.trim()) payload.telephone = form.telephone.trim()
    if (form.email.trim()) payload.email = form.email.trim()
    if (form.siteUrl.trim()) payload.siteUrl = form.siteUrl.trim()

    try {
      const res = await fetch("/api/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.status === 201) {
        toast.success("Prospect ajouté")
        onSuccess()
        return
      }

      const json = await res.json() as { error: string | Record<string, string> }

      if (res.status === 409) {
        setError("Un prospect avec ce nom dans cette ville existe déjà")
        return
      }

      if (typeof json.error === "object" && json.error !== null) {
        const firstMsg = Object.values(json.error)[0]
        setError(typeof firstMsg === "string" ? firstMsg : "Erreur de validation")
        return
      }

      setError(typeof json.error === "string" ? json.error : "Une erreur est survenue")
    } catch {
      setError("Une erreur est survenue")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.8)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div
        className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-[6px] max-w-md w-full p-6 flex flex-col gap-4 mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[#fafafa] font-semibold text-base">Ajouter un prospect</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
          {/* nom — required */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#737373]">
              Nom <span className="text-[#f87171]">*</span>
            </label>
            <input
              type="text"
              value={form.nom}
              onChange={(e) => handleChange("nom", e.target.value)}
              className="bg-[#000] border border-[#1a1a1a] text-[#fafafa] rounded-[6px] px-3 py-2 w-full text-sm outline-none focus:border-[#333333] transition-colors"
              placeholder="Nom de l'entreprise ou du contact"
              maxLength={100}
              required
            />
          </div>

          {/* activite — optional */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#737373]">Activité</label>
            <input
              type="text"
              value={form.activite}
              onChange={(e) => handleChange("activite", e.target.value)}
              className="bg-[#000] border border-[#1a1a1a] text-[#fafafa] rounded-[6px] px-3 py-2 w-full text-sm outline-none focus:border-[#333333] transition-colors"
              placeholder="Plombier, Restaurant, Coiffeur..."
              maxLength={100}
            />
          </div>

          {/* ville — optional */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#737373]">Ville</label>
            <input
              type="text"
              value={form.ville}
              onChange={(e) => handleChange("ville", e.target.value)}
              className="bg-[#000] border border-[#1a1a1a] text-[#fafafa] rounded-[6px] px-3 py-2 w-full text-sm outline-none focus:border-[#333333] transition-colors"
              placeholder="Paris, Lyon, Bordeaux..."
              maxLength={100}
            />
          </div>

          {/* telephone — optional */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#737373]">Téléphone</label>
            <input
              type="text"
              value={form.telephone}
              onChange={(e) => handleChange("telephone", e.target.value)}
              className="bg-[#000] border border-[#1a1a1a] text-[#fafafa] rounded-[6px] px-3 py-2 w-full text-sm outline-none focus:border-[#333333] transition-colors"
              placeholder="06 12 34 56 78"
              maxLength={20}
            />
          </div>

          {/* email — optional */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#737373]">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              className="bg-[#000] border border-[#1a1a1a] text-[#fafafa] rounded-[6px] px-3 py-2 w-full text-sm outline-none focus:border-[#333333] transition-colors"
              placeholder="contact@exemple.fr"
            />
          </div>

          {/* siteUrl — optional */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#737373]">Site web</label>
            <input
              type="url"
              value={form.siteUrl}
              onChange={(e) => handleChange("siteUrl", e.target.value)}
              className="bg-[#000] border border-[#1a1a1a] text-[#fafafa] rounded-[6px] px-3 py-2 w-full text-sm outline-none focus:border-[#333333] transition-colors"
              placeholder="https://..."
              maxLength={500}
            />
          </div>

          {/* Inline error */}
          {error && (
            <p className="text-sm text-[#f87171]">{error}</p>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="px-4 py-2 text-sm text-[#737373] bg-[#0a0a0a] border border-[#1a1a1a] rounded-[6px] hover:border-[#333333] transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting || !form.nom.trim()}
              className="px-4 py-2 text-sm text-black bg-white rounded-[6px] font-medium hover:bg-[#e5e5e5] transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {submitting && (
                <svg
                  className="animate-spin h-3.5 w-3.5 text-black"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              )}
              Ajouter
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
