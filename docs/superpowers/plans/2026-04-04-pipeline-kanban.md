# Pipeline Kanban — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a drag & drop kanban board for the prospect pipeline with 7 columns, mobile touch support, and a "lost reason" modal.

**Architecture:** @dnd-kit for drag & drop, client component with local state management, PATCH API for status updates.

**Tech Stack:** @dnd-kit/core, @dnd-kit/utilities, Next.js 16, Framer Motion, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-04-04-pipeline-kanban-design.md`

---

### Task 1: Install @dnd-kit

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install dependencies**

```bash
npm install @dnd-kit/core @dnd-kit/utilities
```

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @dnd-kit/core and @dnd-kit/utilities"
```

---

### Task 2: Lost reason modal

**Files:**
- Create: `src/components/pipeline/lost-reason-modal.tsx`

- [ ] **Step 1: Create lost-reason-modal.tsx**

Create `src/components/pipeline/lost-reason-modal.tsx`:

```tsx
"use client"

import { useState } from "react"
import { motion } from "motion/react"
import { fadeInUp } from "@/lib/animations"
import { Button } from "@/components/ui/button"

interface LostReasonModalProps {
  prospectName: string
  onConfirm: (reason: string) => void
  onCancel: () => void
}

export function LostReasonModal({
  prospectName,
  onConfirm,
  onCancel,
}: LostReasonModalProps) {
  const [reason, setReason] = useState("")

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onCancel}
      />
      <motion.div
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        className="relative z-10 w-full max-w-md rounded-[6px] border border-[#1a1a1a] bg-[#0a0a0a] p-6"
      >
        <h2 className="text-base font-semibold text-[#fafafa] mb-1">
          Raison de perte
        </h2>
        <p className="text-sm text-[#737373] mb-4">
          Pourquoi {prospectName} est perdu ?
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex: budget insuffisant, a choisi un concurrent..."
          rows={3}
          className="w-full resize-none rounded-[6px] border border-[#1a1a1a] bg-[#000] px-3 py-2 text-sm text-[#fafafa] placeholder:text-[#555555] focus:outline-none focus:ring-1 focus:ring-white/50 mb-4"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Annuler
          </Button>
          <Button size="sm" onClick={() => onConfirm(reason)}>
            Confirmer
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/pipeline/lost-reason-modal.tsx
git commit -m "feat: add lost reason modal for pipeline"
```

---

### Task 3: Kanban card

**Files:**
- Create: `src/components/pipeline/kanban-card.tsx`

- [ ] **Step 1: Create kanban-card.tsx**

Create `src/components/pipeline/kanban-card.tsx`:

```tsx
"use client"

import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { useRouter } from "next/navigation"
import { ScorePastille } from "@/components/prospects/score-pastille"
import { timeAgo } from "@/lib/date"
import type { Prospect } from "@/types/prospect"

interface KanbanCardProps {
  prospect: Prospect
  isDragOverlay?: boolean
}

export function KanbanCard({ prospect, isDragOverlay }: KanbanCardProps) {
  const router = useRouter()
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: prospect.id })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  }

  function handleClick() {
    if (!isDragging && !isDragOverlay) {
      router.push(`/prospects/${prospect.id}`)
    }
  }

  if (isDragOverlay) {
    return (
      <div className="rounded-[6px] border border-[#333] bg-[#0a0a0a] p-3 w-[200px] cursor-grabbing">
        <CardContent prospect={prospect} />
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className="rounded-[6px] border border-[#1a1a1a] bg-[#0a0a0a] p-3 cursor-grab active:cursor-grabbing hover:border-[#333] transition-colors"
    >
      <CardContent prospect={prospect} />
    </div>
  )
}

function CardContent({ prospect }: { prospect: Prospect }) {
  return (
    <>
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-sm font-medium text-[#fafafa] truncate">
          {prospect.nom}
        </p>
        <ScorePastille score={prospect.scoreGlobal} size={20} />
      </div>
      <p className="text-xs text-[#737373] truncate">
        {prospect.activite} — {prospect.ville}
      </p>
      <p className="text-xs text-[#555555] mt-1">
        {timeAgo(prospect.updatedAt)}
      </p>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/pipeline/kanban-card.tsx
git commit -m "feat: add draggable kanban card"
```

---

### Task 4: Kanban column

**Files:**
- Create: `src/components/pipeline/kanban-column.tsx`

- [ ] **Step 1: Create kanban-column.tsx**

Create `src/components/pipeline/kanban-column.tsx`:

```tsx
"use client"

import { useDroppable } from "@dnd-kit/core"
import { KanbanCard } from "@/components/pipeline/kanban-card"
import type { Prospect } from "@/types/prospect"

interface KanbanColumnProps {
  id: string
  label: string
  prospects: Prospect[]
}

export function KanbanColumn({ id, label, prospects }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      className="flex flex-col min-w-[220px] flex-shrink-0 scroll-snap-align-start"
      style={{ scrollSnapAlign: "start" }}
    >
      <div className="flex items-center justify-between px-2 py-2 mb-2">
        <h3 className="text-xs font-medium text-[#737373] uppercase tracking-wider">
          {label}
        </h3>
        <span className="text-xs text-[#555555]">{prospects.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-[6px] border p-2 space-y-2 min-h-[100px] max-h-[calc(100vh-200px)] overflow-y-auto transition-colors ${
          isOver ? "border-[#333] bg-[#0a0a0a]" : "border-[#1a1a1a]"
        }`}
      >
        {prospects.map((prospect) => (
          <KanbanCard key={prospect.id} prospect={prospect} />
        ))}
        {prospects.length === 0 && (
          <p className="text-xs text-[#555555] text-center py-4">
            Aucun prospect
          </p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/pipeline/kanban-column.tsx
git commit -m "feat: add droppable kanban column"
```

---

### Task 5: Kanban board (main component)

**Files:**
- Create: `src/components/pipeline/kanban-board.tsx`

This is the main component. Read the following files first:
- `src/components/pipeline/kanban-column.tsx`
- `src/components/pipeline/kanban-card.tsx`
- `src/components/pipeline/lost-reason-modal.tsx`
- `src/types/prospect.ts`
- `src/lib/animations.ts`

- [ ] **Step 1: Create kanban-board.tsx**

Create `src/components/pipeline/kanban-board.tsx`:

```tsx
"use client"

import { useState, useCallback, useEffect } from "react"
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { KanbanColumn } from "@/components/pipeline/kanban-column"
import { KanbanCard } from "@/components/pipeline/kanban-card"
import { LostReasonModal } from "@/components/pipeline/lost-reason-modal"
import type { Prospect } from "@/types/prospect"

const COLUMNS = [
  { id: "A_DEMARCHER", label: "A démarcher" },
  { id: "CONTACTE", label: "Contacté" },
  { id: "RDV_PLANIFIE", label: "RDV planifié" },
  { id: "MAQUETTE_ENVOYEE", label: "Maquette envoyée" },
  { id: "RELANCE", label: "Relance" },
  { id: "SIGNE", label: "Signé" },
  { id: "PERDU", label: "Perdu" },
] as const

interface KanbanBoardProps {
  initialProspects: Prospect[]
}

export function KanbanBoard({ initialProspects }: KanbanBoardProps) {
  const [prospects, setProspects] = useState<Prospect[]>(initialProspects)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [lostModal, setLostModal] = useState<{
    prospectId: string
    prospectName: string
  } | null>(null)
  const [loading, setLoading] = useState(false)

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 5 },
  })
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 150, tolerance: 5 },
  })
  const sensors = useSensors(mouseSensor, touchSensor)

  const activeProspect = activeId
    ? prospects.find((p) => p.id === activeId) ?? null
    : null

  const grouped = COLUMNS.map((col) => ({
    ...col,
    prospects: prospects.filter((p) => p.statutPipeline === col.id),
  }))

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  async function moveProspect(
    prospectId: string,
    newStatut: string,
    raisonPerte?: string
  ) {
    const body: Record<string, string> = { statutPipeline: newStatut }
    if (raisonPerte !== undefined) body.raisonPerte = raisonPerte

    // Optimistic update
    setProspects((prev) =>
      prev.map((p) =>
        p.id === prospectId ? { ...p, statutPipeline: newStatut } : p
      )
    )

    try {
      const res = await fetch(`/api/prospects/${prospectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        // Rollback
        setProspects((prev) =>
          prev.map((p) =>
            p.id === prospectId
              ? { ...p, statutPipeline: p.statutPipeline }
              : p
          )
        )
        toast.error("Erreur lors du déplacement")
        return
      }

      const colLabel = COLUMNS.find((c) => c.id === newStatut)?.label ?? newStatut
      toast.success(`Déplacé vers "${colLabel}"`)
    } catch {
      toast.error("Erreur réseau")
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const prospectId = active.id as string
    const newStatut = over.id as string
    const prospect = prospects.find((p) => p.id === prospectId)
    if (!prospect || prospect.statutPipeline === newStatut) return

    if (newStatut === "PERDU") {
      setLostModal({ prospectId, prospectName: prospect.nom })
      return
    }

    moveProspect(prospectId, newStatut)
  }

  function handleLostConfirm(reason: string) {
    if (!lostModal) return
    moveProspect(lostModal.prospectId, "PERDU", reason)
    setLostModal(null)
  }

  function handleLostCancel() {
    setLostModal(null)
  }

  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <div key={col.id} className="min-w-[220px] flex-shrink-0">
            <Skeleton className="h-6 w-24 mb-3 bg-[#0a0a0a]" />
            <div className="space-y-2">
              <Skeleton className="h-20 w-full bg-[#0a0a0a]" />
              <Skeleton className="h-20 w-full bg-[#0a0a0a]" />
              <Skeleton className="h-20 w-full bg-[#0a0a0a]" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          className="flex gap-3 overflow-x-auto pb-4"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {grouped.map((col) => (
            <KanbanColumn
              key={col.id}
              id={col.id}
              label={col.label}
              prospects={col.prospects}
            />
          ))}
        </div>

        <DragOverlay>
          {activeProspect && (
            <KanbanCard prospect={activeProspect} isDragOverlay />
          )}
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
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/components/pipeline/kanban-board.tsx
git commit -m "feat: add kanban board with drag & drop, lost reason modal"
```

---

### Task 6: Pipeline page

**Files:**
- Modify: `src/app/(dashboard)/pipeline/page.tsx`

- [ ] **Step 1: Replace the placeholder page**

Replace `src/app/(dashboard)/pipeline/page.tsx` with:

```tsx
import { prisma } from "@/lib/db"
import { KanbanBoard } from "@/components/pipeline/kanban-board"

async function getProspects() {
  try {
    return await prisma.prospect.findMany({
      orderBy: { updatedAt: "desc" },
    })
  } catch {
    return []
  }
}

export default async function PipelinePage() {
  const prospects = await getProspects()

  return (
    <div>
      <h1 className="text-xl font-bold text-[#fafafa] mb-6">Pipeline</h1>
      <KanbanBoard
        initialProspects={JSON.parse(JSON.stringify(prospects))}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/pipeline/page.tsx
git commit -m "feat: wire pipeline page with kanban board"
```

---

### Task 7: Final verification

- [ ] **Step 1:** `npx tsc --noEmit --pretty`
- [ ] **Step 2:** `npm run test`
- [ ] **Step 3:** `npm run lint`
- [ ] **Step 4:** Fix any issues and commit
