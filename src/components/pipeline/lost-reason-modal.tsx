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

export function LostReasonModal({ prospectName, onConfirm, onCancel }: LostReasonModalProps) {
  const [reason, setReason] = useState("")

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <motion.div
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        className="relative z-10 w-full max-w-md rounded-[6px] border border-[#1a1a1a] bg-[#0a0a0a] p-6"
      >
        <h2 className="text-base font-semibold text-[#fafafa] mb-1">Raison de perte</h2>
        <p className="text-sm text-[#737373] mb-4">Pourquoi {prospectName} est perdu ?</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex: budget insuffisant, a choisi un concurrent..."
          rows={3}
          className="w-full resize-none rounded-[6px] border border-[#1a1a1a] bg-[#000] px-3 py-2 text-sm text-[#fafafa] placeholder:text-[#555555] focus:outline-none focus:ring-1 focus:ring-white/50 mb-4"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>Annuler</Button>
          <Button size="sm" onClick={() => onConfirm(reason)}>Confirmer</Button>
        </div>
      </motion.div>
    </div>
  )
}
