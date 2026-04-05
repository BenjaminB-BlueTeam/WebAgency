"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import { fadeInUp } from "@/lib/animations"

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

const STATUT_COLORS: Record<string, string> = {
  BROUILLON: "#737373",
  ENVOYEE: "#60a5fa",
  VALIDEE: "#4ade80",
  REJETEE: "#f87171",
}

export function ProspectMaquetteTab({ prospect }: Props) {
  const router = useRouter()
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const maquettes = [...prospect.maquettes].sort((a, b) => a.version - b.version)
  const selected = maquettes[selectedIndex] ?? null

  async function handleGenerate() {
    setGenerating(true)
    setError(null)

    timeoutRef.current = setTimeout(() => {
      setGenerating(false)
      setError("La génération a pris trop de temps. Réessaie dans quelques instants.")
    }, 5 * 60 * 1000)

    try {
      const res = await fetch("/api/maquettes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectId: prospect.id }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "Erreur lors de la génération")
        return
      }
      setSelectedIndex(maquettes.length)
      router.refresh()
    } catch {
      setError("Erreur réseau. Réessaie.")
    } finally {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      setGenerating(false)
    }
  }

  function handleCopyUrl() {
    if (!selected?.demoUrl) return
    navigator.clipboard.writeText(selected.demoUrl)
  }

  if (generating) {
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
          onClick={handleGenerate}
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
    )
  }

  return (
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
          {maquettes.length < 3 && (
            <button
              onClick={handleGenerate}
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
  )
}
