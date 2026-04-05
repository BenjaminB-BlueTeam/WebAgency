"use client"

import { useState } from "react"
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { toast } from "sonner"
import { KanbanColumn } from "@/components/pipeline/kanban-column"
import { KanbanCard } from "@/components/pipeline/kanban-card"
import { LostReasonModal } from "@/components/pipeline/lost-reason-modal"
import type { Prospect } from "@/types/prospect"

const COLUMNS: { id: string; label: string }[] = [
  { id: "A_DEMARCHER", label: "À démarcher" },
  { id: "MAQUETTE_EMAIL_ENVOYES", label: "Maquette + Email envoyés" },
  { id: "REPONDU", label: "Répondu" },
  { id: "RDV_PLANIFIE", label: "RDV planifié" },
  { id: "NEGOCIATION", label: "Négociation" },
  { id: "CLIENT", label: "Client" },
  { id: "PERDU", label: "Perdu" },
]

interface LostModalState {
  prospectId: string
  prospectName: string
  targetColumn: string
}

interface KanbanBoardProps {
  initialProspects: Prospect[]
}

export function KanbanBoard({ initialProspects }: KanbanBoardProps) {
  const [prospects, setProspects] = useState<Prospect[]>(initialProspects)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [lostModal, setLostModal] = useState<LostModalState | null>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  )

  const activeProspect = activeId ? prospects.find((p) => p.id === activeId) ?? null : null

  async function moveProspect(
    prospectId: string,
    newColumn: string,
    raisonPerte?: string
  ) {
    // Optimistic update
    setProspects((prev) =>
      prev.map((p) =>
        p.id === prospectId
          ? { ...p, statutPipeline: newColumn, raisonPerte: raisonPerte ?? p.raisonPerte }
          : p
      )
    )

    try {
      const body: Record<string, string> = { statutPipeline: newColumn }
      if (raisonPerte !== undefined) body.raisonPerte = raisonPerte

      const res = await fetch(`/api/prospects/${prospectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? "Erreur lors du déplacement")
      }

      toast.success("Prospect déplacé")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur réseau")
      // Revert optimistic update
      setProspects(initialProspects)
    }
  }

  function onDragStart({ active }: DragStartEvent) {
    setActiveId(String(active.id))
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)

    if (!over) return

    const prospectId = active.id as string
    const targetColumn = over.id as string

    const prospect = prospects.find((p) => p.id === prospectId)
    if (!prospect) return

    if (prospect.statutPipeline === targetColumn) return

    if (targetColumn === "PERDU") {
      setLostModal({ prospectId, prospectName: prospect.nom, targetColumn })
    } else {
      moveProspect(prospectId, targetColumn)
    }
  }

  function handleLostConfirm(reason: string) {
    if (!lostModal) return
    moveProspect(lostModal.prospectId, lostModal.targetColumn, reason)
    setLostModal(null)
  }

  function handleLostCancel() {
    setLostModal(null)
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div
          className="flex flex-row gap-3 overflow-x-auto pb-4"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              id={col.id}
              label={col.label}
              prospects={prospects.filter((p) => p.statutPipeline === col.id)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeProspect ? (
            <KanbanCard prospect={activeProspect} isDragOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>

      {lostModal && (
        <LostReasonModal
          prospectName={lostModal.prospectName}
          onConfirm={handleLostConfirm}
          onCancel={handleLostCancel}
        />
      )}
    </>
  )
}
