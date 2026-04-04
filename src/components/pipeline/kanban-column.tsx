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
    <div className="flex flex-col min-w-[220px] flex-shrink-0" style={{ scrollSnapAlign: "start" }}>
      <div className="flex items-center justify-between px-2 py-2 mb-2">
        <h3 className="text-xs font-medium text-[#737373] uppercase tracking-wider">{label}</h3>
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
          <p className="text-xs text-[#555555] text-center py-4">Aucun prospect</p>
        )}
      </div>
    </div>
  )
}
