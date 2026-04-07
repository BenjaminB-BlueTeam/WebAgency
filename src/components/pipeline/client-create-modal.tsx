"use client"

import { useState } from "react"
import { motion } from "motion/react"
import { fadeInUp } from "@/lib/animations"
import { Button } from "@/components/ui/button"

export interface ClientCreateValues {
  siteUrl: string
  offreType: "VITRINE" | "VISIBILITE"
  dateLivraison: string
}

interface ClientCreateModalProps {
  prospectName: string
  initialSiteUrl?: string
  onConfirm: (values: ClientCreateValues) => void | Promise<void>
  onCancel: () => void
}

function todayISO(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

export function ClientCreateModal({
  prospectName,
  initialSiteUrl,
  onConfirm,
  onCancel,
}: ClientCreateModalProps) {
  const [siteUrl, setSiteUrl] = useState(initialSiteUrl ?? "")
  const [offreType, setOffreType] = useState<"VITRINE" | "VISIBILITE">("VITRINE")
  const [dateLivraison, setDateLivraison] = useState(todayISO())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setError(null)
    if (!siteUrl.trim()) {
      setError("L'URL du site est requise")
      return
    }
    try {
      new URL(siteUrl.trim())
    } catch {
      setError("L'URL n'est pas valide (http(s)://...)")
      return
    }
    setSubmitting(true)
    try {
      await onConfirm({ siteUrl: siteUrl.trim(), offreType, dateLivraison })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Créer un client"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <motion.div
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        className="relative z-10 w-full max-w-md rounded-[6px] border border-[#1a1a1a] bg-[#0a0a0a] p-6"
      >
        <h2 className="text-base font-semibold text-[#fafafa] mb-1">
          Nouveau client
        </h2>
        <p className="text-sm text-[#737373] mb-4">
          Conversion de {prospectName} en client
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-[#737373] mb-1">URL du site</label>
            <input
              type="url"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              placeholder="https://exemple.fr"
              autoFocus
              className="w-full rounded-[6px] border border-[#1a1a1a] bg-[#000] px-3 py-2 text-sm text-[#fafafa] placeholder:text-[#555555] focus:outline-none focus:ring-1 focus:ring-white/50"
            />
          </div>

          <div>
            <label className="block text-xs text-[#737373] mb-1">Type d&apos;offre</label>
            <select
              value={offreType}
              onChange={(e) =>
                setOffreType(e.target.value as "VITRINE" | "VISIBILITE")
              }
              className="w-full rounded-[6px] border border-[#1a1a1a] bg-[#000] px-3 py-2 text-sm text-[#fafafa] focus:outline-none focus:ring-1 focus:ring-white/50"
            >
              <option value="VITRINE">Vitrine</option>
              <option value="VISIBILITE">Visibilité</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#737373] mb-1">
              Date de livraison
            </label>
            <input
              type="date"
              value={dateLivraison}
              onChange={(e) => setDateLivraison(e.target.value)}
              className="w-full rounded-[6px] border border-[#1a1a1a] bg-[#000] px-3 py-2 text-sm text-[#fafafa] focus:outline-none focus:ring-1 focus:ring-white/50"
            />
          </div>

          {error && <p className="text-xs text-[#f87171]">{error}</p>}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={submitting}>
            Annuler
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Création..." : "Créer le client"}
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
