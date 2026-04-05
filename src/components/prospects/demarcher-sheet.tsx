"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import { toast } from "sonner"
import { motion } from "motion/react"
import { fadeInUp } from "@/lib/animations"
import { Button } from "@/components/ui/button"
import type { ProspectWithRelations } from "@/types/prospect"

interface Props {
  prospect: ProspectWithRelations
  onClose: () => void
}

interface EmailDraft {
  id: string
  sujet: string
  corps: string
  htmlPreview: string
}

export function DemarcherSheet({ prospect, onClose }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [draft, setDraft] = useState<EmailDraft | null>(null)
  const [sujet, setSujet] = useState("")
  const [corps, setCorps] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function generate() {
      try {
        const res = await fetch(`/api/prospects/${prospect.id}/email/generate`, {
          method: "POST",
        })
        const json = await res.json()
        if (!res.ok) {
          setError(json.error ?? "Erreur lors de la génération")
          return
        }
        setDraft(json.data)
        setSujet(json.data.sujet)
        setCorps(json.data.corps)
      } catch {
        setError("Erreur réseau")
      } finally {
        setLoading(false)
      }
    }
    generate()
  }, [prospect.id])

  async function handleSend() {
    if (!draft) return
    setSending(true)
    try {
      const res = await fetch(`/api/prospects/${prospect.id}/email/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId: draft.id, sujet, corps }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? "Erreur lors de l'envoi")
        return
      }
      toast.success("Email envoyé !")
      router.refresh()
      onClose()
    } catch {
      toast.error("Erreur réseau")
    } finally {
      setSending(false)
    }
  }

  async function handleSaveDraft() {
    toast.success("Brouillon sauvegardé")
    onClose()
  }

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/70" onClick={onClose} />
        <motion.div
          variants={fadeInUp}
          initial="initial"
          animate="animate"
          className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[6px] border border-[#1a1a1a] bg-[#0a0a0a] p-6 mx-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-semibold text-[#fafafa]">
              Démarcher {prospect.nom}
            </h2>
            <button
              onClick={onClose}
              className="text-[#737373] hover:text-[#fafafa] transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center gap-3 py-12">
              <div
                style={{
                  width: 20,
                  height: 20,
                  border: "2px solid #1a1a1a",
                  borderTopColor: "#fff",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
              <p className="text-sm text-[#737373]">Génération de l&apos;email en cours…</p>
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <p className="text-sm text-[#f87171] text-center py-8">{error}</p>
          )}

          {/* Draft form */}
          {!loading && draft && (
            <div className="flex flex-col gap-4">
              {/* To */}
              <div>
                <label className="text-xs text-[#737373] block mb-1">Destinataire</label>
                <p
                  className="text-sm px-3 py-2 rounded-[6px] border border-[#1a1a1a] bg-[#000]"
                  style={{ color: prospect.email ? "#737373" : "#f87171" }}
                >
                  {prospect.email ?? "Aucun email — ajoutez-en un dans les informations"}
                </p>
              </div>

              {/* Sujet */}
              <div>
                <label className="text-xs text-[#737373] block mb-1">Sujet</label>
                <input
                  value={sujet}
                  onChange={(e) => setSujet(e.target.value)}
                  className="w-full rounded-[6px] border border-[#1a1a1a] bg-[#000] px-3 py-2 text-sm text-[#fafafa] focus:outline-none focus:ring-1 focus:ring-white/30"
                />
              </div>

              {/* Corps */}
              <div>
                <label className="text-xs text-[#737373] block mb-1">Corps</label>
                <textarea
                  value={corps}
                  onChange={(e) => setCorps(e.target.value)}
                  rows={5}
                  className="w-full resize-none rounded-[6px] border border-[#1a1a1a] bg-[#000] px-3 py-2 text-sm text-[#fafafa] focus:outline-none focus:ring-1 focus:ring-white/30"
                />
              </div>

              {/* HTML Preview */}
              <div>
                <label className="text-xs text-[#737373] block mb-1">Aperçu</label>
                <iframe
                  srcDoc={draft.htmlPreview}
                  sandbox="allow-same-origin"
                  title="Aperçu email"
                  style={{
                    width: "100%",
                    height: 260,
                    border: "1px solid #1a1a1a",
                    borderRadius: 6,
                    background: "#fff",
                  }}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={handleSaveDraft}>
                  Sauvegarder le brouillon
                </Button>
                <Button
                  size="sm"
                  onClick={handleSend}
                  disabled={sending || !prospect.email}
                >
                  {sending ? "Envoi…" : "Envoyer"}
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </>
  )
}
