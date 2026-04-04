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
        <p className="text-sm font-medium text-[#fafafa] truncate">{prospect.nom}</p>
        <ScorePastille score={prospect.scoreGlobal} size={20} />
      </div>
      <p className="text-xs text-[#737373] truncate">{prospect.activite} — {prospect.ville}</p>
      <p className="text-xs text-[#555555] mt-1">{timeAgo(prospect.updatedAt)}</p>
    </>
  )
}
