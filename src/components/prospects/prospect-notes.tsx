"use client"

import { useState } from "react"
import { motion } from "motion/react"
import { Trash2 } from "lucide-react"
import { staggerContainer, staggerItem } from "@/lib/animations"
import { timeAgo } from "@/lib/date"
import type { Note } from "@/types/prospect"

interface ProspectNotesProps {
  prospectId: string
  initialNotes: Note[]
}

export function ProspectNotes({ prospectId, initialNotes }: ProspectNotesProps) {
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [contenu, setContenu] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleAdd() {
    const trimmed = contenu.trim()
    if (!trimmed || submitting) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/prospects/${prospectId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contenu: trimmed }),
      })
      if (!res.ok) throw new Error("Erreur lors de l'ajout de la note")
      const { data } = await res.json()
      setNotes((prev) => [data, ...prev])
      setContenu("")
    } catch {
      // silent — toast would go here in a toast-enabled setup
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(noteId: string) {
    try {
      const res = await fetch(`/api/notes/${noteId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Erreur lors de la suppression")
      setNotes((prev) => prev.filter((n) => n.id !== noteId))
    } catch {
      // silent
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Add note form */}
      <div className="flex flex-col gap-2">
        <textarea
          value={contenu}
          onChange={(e) => setContenu(e.target.value)}
          placeholder="Ajouter une note…"
          rows={3}
          className="w-full resize-none rounded-[6px] border border-[#1a1a1a] bg-[#0a0a0a] px-3 py-2 text-sm text-[#fafafa] placeholder-[#555555] outline-none focus:border-[#333] transition-colors"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleAdd()
          }}
        />
        <button
          onClick={handleAdd}
          disabled={!contenu.trim() || submitting}
          className="self-end rounded-[6px] bg-white px-4 py-1.5 text-sm font-medium text-black transition-opacity disabled:opacity-40 hover:opacity-90"
        >
          {submitting ? "Ajout…" : "Ajouter"}
        </button>
      </div>

      {/* Notes list */}
      {notes.length === 0 ? (
        <p className="text-sm text-[#555555] text-center py-4">Aucune note pour le moment</p>
      ) : (
        <motion.ul
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="flex flex-col gap-2"
        >
          {notes.map((note) => (
            <motion.li
              key={note.id}
              variants={staggerItem}
              className="group flex items-start gap-3 rounded-[6px] border border-[#1a1a1a] bg-[#0a0a0a] p-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#fafafa] whitespace-pre-wrap break-words">{note.contenu}</p>
                <p className="mt-1 text-xs text-[#737373]">{timeAgo(note.createdAt)}</p>
              </div>
              <button
                onClick={() => handleDelete(note.id)}
                className="shrink-0 mt-0.5 text-[#555555] hover:text-[#f87171] transition-colors"
                aria-label="Supprimer la note"
              >
                <Trash2 size={14} />
              </button>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </div>
  )
}
