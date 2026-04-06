"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { motion } from "motion/react"
import { fadeInUp } from "@/lib/animations"
import type { GenerationContext } from "@/lib/maquette/generate-site"
import { PromptEditorModal } from "./prompt-editor-modal"

interface Maquette {
  id: string
  demoUrl: string | null
  version: number
  statut: string
  createdAt: string
}

interface Props {
  prospect: { id: string; maquettes: Maquette[] }
}

type State = "idle" | "investigating" | "editing" | "generating"

// ─── AdjustModal ──────────────────────────────────────────────────────────────

interface AdjustModalProps {
  adjusting: boolean
  instructions: string
  onInstructionsChange: (v: string) => void
  onCancel: () => void
  onApply: () => void
}

function AdjustModal({
  adjusting,
  instructions,
  onInstructionsChange,
  onCancel,
  onApply,
}: AdjustModalProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#0a0a0a",
          border: "1px solid #1a1a1a",
          borderRadius: 6,
          padding: 24,
          width: "100%",
          maxWidth: 520,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <h2 style={{ color: "#fafafa", fontSize: 16, fontWeight: 600, margin: 0 }}>
          Ajuster la maquette
        </h2>
        <textarea
          value={instructions}
          onChange={(e) => onInstructionsChange(e.target.value)}
          maxLength={2000}
          placeholder="Ex: Change la couleur principale en bleu, Ajoute une page Tarifs..."
          disabled={adjusting}
          style={{
            background: "#000000",
            color: "#fafafa",
            border: "1px solid #1a1a1a",
            borderRadius: 6,
            padding: "10px 12px",
            fontSize: 14,
            fontFamily: "inherit",
            resize: "vertical",
            minHeight: 120,
            outline: "none",
            width: "100%",
            boxSizing: "border-box",
          }}
        />
        <p style={{ color: "#555555", fontSize: 12, margin: 0, textAlign: "right" }}>
          {instructions.length}/2000
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            disabled={adjusting}
            style={{
              background: "#0a0a0a",
              color: "#737373",
              border: "1px solid #1a1a1a",
              borderRadius: 6,
              padding: "8px 16px",
              fontSize: 14,
              cursor: adjusting ? "not-allowed" : "pointer",
            }}
          >
            Annuler
          </button>
          <button
            onClick={onApply}
            disabled={adjusting || instructions.trim().length === 0}
            style={{
              background: adjusting || instructions.trim().length === 0 ? "#1a1a1a" : "#ffffff",
              color: adjusting || instructions.trim().length === 0 ? "#555555" : "#000000",
              border: "none",
              borderRadius: 6,
              padding: "8px 16px",
              fontSize: 14,
              fontWeight: 500,
              cursor: adjusting || instructions.trim().length === 0 ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {adjusting && (
              <>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                <span
                  style={{
                    width: 14,
                    height: 14,
                    border: "2px solid #555555",
                    borderTopColor: "#000",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                    display: "inline-block",
                  }}
                />
              </>
            )}
            Appliquer
          </button>
        </div>
      </div>
    </div>
  )
}

const STATUT_COLORS: Record<string, string> = {
  BROUILLON: "#737373",
  ENVOYEE: "#60a5fa",
  VALIDEE: "#4ade80",
  REJETEE: "#f87171",
}

export function ProspectMaquetteTab({ prospect }: Props) {
  const router = useRouter()
  const [state, setState] = useState<State>("idle")
  const [error, setError] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [prompt, setPrompt] = useState("")
  const [context, setContext] = useState<GenerationContext | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [adjusting, setAdjusting] = useState(false)
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [adjustInstructions, setAdjustInstructions] = useState("")

  const maquettes = [...prospect.maquettes].sort((a, b) => a.version - b.version)
  const selected = maquettes[selectedIndex] ?? null

  async function handleGenerate() {
    setState("investigating")
    setError(null)

    try {
      const res = await fetch("/api/maquettes/generate/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectId: prospect.id }),
      })
      const json = await res.json() as { data?: { prompt: string; context: GenerationContext }; error?: string }
      if (!res.ok) {
        setError(json.error ?? "Erreur lors de l'investigation")
        setState("idle")
        return
      }
      setPrompt(json.data!.prompt)
      setContext(json.data!.context)
      setState("editing")
    } catch {
      setError("Erreur réseau")
      setState("idle")
    }
  }

  async function handleValidate() {
    setState("generating")

    timeoutRef.current = setTimeout(() => {
      setState("idle")
      setError("La génération a pris trop de temps. Réessaie.")
    }, 5 * 60 * 1000)

    try {
      const res = await fetch("/api/maquettes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectId: prospect.id, prompt, context }),
      })
      const json = await res.json() as { data?: { id: string; demoUrl: string; version: number }; error?: string }
      if (!res.ok) {
        setError(json.error ?? "Erreur lors de la génération")
        setState("idle")
        return
      }
      setSelectedIndex(maquettes.length)
      router.refresh()
      setState("idle")
    } catch {
      setError("Erreur réseau")
      setState("idle")
    } finally {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }

  function handleCopyUrl() {
    if (!selected?.demoUrl) return
    navigator.clipboard.writeText(selected.demoUrl)
    toast("URL copiée")
  }

  async function handleAdjust() {
    if (!selected) return
    setAdjusting(true)
    setShowAdjustModal(false)
    try {
      const res = await fetch(`/api/maquettes/${selected.id}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructions: adjustInstructions }),
      })
      const json = await res.json() as { data?: { demoUrl: string }; error?: string }
      if (!res.ok) {
        toast.error(json.error ?? "Erreur lors de l'ajustement")
      } else {
        router.refresh()
        toast("Maquette ajustée")
        setAdjustInstructions("")
      }
    } catch {
      toast.error("Erreur réseau")
    } finally {
      setAdjusting(false)
    }
  }

  if (state === "generating") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          padding: "48px 16px",
        }}
      >
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div
          style={{
            width: 32,
            height: 32,
            border: "2px solid #1a1a1a",
            borderTopColor: "#fff",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <p style={{ color: "#737373", fontSize: 14, margin: 0 }}>
          Génération en cours… (jusqu&apos;à 2 min)
        </p>
      </div>
    )
  }

  if (maquettes.length === 0) {
    return (
      <>
        {(state === "investigating" || state === "editing") && (
          <PromptEditorModal
            isLoading={state === "investigating"}
            prompt={prompt}
            onPromptChange={setPrompt}
            onCancel={() => setState("idle")}
            onValidate={() => void handleValidate()}
            error={null}
          />
        )}
        <motion.div
          variants={fadeInUp}
          initial="initial"
          animate="animate"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            padding: "48px 16px",
          }}
        >
          <p style={{ color: "#737373", fontSize: 14, margin: 0 }}>Aucune maquette générée</p>
          {error && <p style={{ color: "#f87171", fontSize: 13, margin: 0 }}>{error}</p>}
          <button
            onClick={() => void handleGenerate()}
            style={{
              background: "#ffffff",
              color: "#000000",
              border: "none",
              borderRadius: 6,
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Générer une maquette
          </button>
        </motion.div>
      </>
    )
  }

  return (
    <>
      {(state === "investigating" || state === "editing") && (
        <PromptEditorModal
          isLoading={state === "investigating"}
          prompt={prompt}
          onPromptChange={setPrompt}
          onCancel={() => setState("idle")}
          onValidate={() => void handleValidate()}
          error={null}
        />
      )}
      {showAdjustModal && (
        <AdjustModal
          adjusting={adjusting}
          instructions={adjustInstructions}
          onInstructionsChange={setAdjustInstructions}
          onCancel={() => setShowAdjustModal(false)}
          onApply={() => void handleAdjust()}
        />
      )}
      <motion.div
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {maquettes.length > 1 && (
            <div style={{ display: "flex", gap: 4 }}>
              {maquettes.map((m, i) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedIndex(i)}
                  style={{
                    background: i === selectedIndex ? "#ffffff" : "#0a0a0a",
                    color: i === selectedIndex ? "#000000" : "#737373",
                    border: "1px solid #1a1a1a",
                    borderRadius: 6,
                    padding: "4px 10px",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  v{m.version}
                </button>
              ))}
            </div>
          )}
          {selected && (
            <span
              style={{
                background: "#0a0a0a",
                color: STATUT_COLORS[selected.statut] ?? "#737373",
                border: "1px solid #1a1a1a",
                borderRadius: 9999,
                padding: "2px 10px",
                fontSize: 12,
              }}
            >
              {selected.statut}
            </span>
          )}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            {selected?.demoUrl && (
              <>
                <button
                  onClick={() => window.open(selected.demoUrl!, "_blank")}
                  style={{
                    background: "#0a0a0a",
                    color: "#fafafa",
                    border: "1px solid #1a1a1a",
                    borderRadius: 6,
                    padding: "6px 12px",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Plein écran
                </button>
                <button
                  onClick={handleCopyUrl}
                  style={{
                    background: "#0a0a0a",
                    color: "#fafafa",
                    border: "1px solid #1a1a1a",
                    borderRadius: 6,
                    padding: "6px 12px",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Copier l&apos;URL
                </button>
              </>
            )}
            {selected?.demoUrl && (
              <button
                onClick={() => setShowAdjustModal(true)}
                disabled={adjusting}
                style={{
                  background: "#0a0a0a",
                  color: adjusting ? "#555555" : "#fafafa",
                  border: "1px solid #1a1a1a",
                  borderRadius: 6,
                  padding: "6px 12px",
                  fontSize: 13,
                  cursor: adjusting ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {adjusting && (
                  <>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        border: "2px solid #333",
                        borderTopColor: "#fafafa",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                        display: "inline-block",
                      }}
                    />
                  </>
                )}
                Ajuster
              </button>
            )}
            {maquettes.length < 3 && (
              <button
                onClick={() => void handleGenerate()}
                style={{
                  background: "#0a0a0a",
                  color: "#fafafa",
                  border: "1px solid #1a1a1a",
                  borderRadius: 6,
                  padding: "6px 12px",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Régénérer
              </button>
            )}
          </div>
        </div>

        {error && <p style={{ color: "#f87171", fontSize: 13, margin: 0 }}>{error}</p>}

        {/* Preview iframe */}
        {selected?.demoUrl ? (
          <iframe
            src={selected.demoUrl}
            sandbox="allow-scripts allow-same-origin"
            style={{
              width: "100%",
              height: 600,
              border: "1px solid #1a1a1a",
              borderRadius: 6,
              background: "#0a0a0a",
            }}
            title={`Maquette v${selected.version}`}
          />
        ) : (
          <div
            style={{
              height: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid #1a1a1a",
              borderRadius: 6,
            }}
          >
            <p style={{ color: "#555555", fontSize: 14 }}>Aperçu non disponible</p>
          </div>
        )}
      </motion.div>
    </>
  )
}
