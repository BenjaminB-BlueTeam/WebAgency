// src/components/emails/emails-client.tsx
"use client"

import { useState } from "react"
import { motion } from "motion/react"
import { staggerContainer, staggerItem } from "@/lib/animations"
import { EmailProspectRow } from "@/components/emails/email-prospect-row"
import { DemarcherSheet } from "@/components/prospects/demarcher-sheet"
import type { EmailProspectItem, RelanceType } from "@/types/emails"

interface Props {
  prospects: EmailProspectItem[]
}

interface ModalState {
  prospect: { id: string; nom: string; email: string | null }
  isRelance: boolean
  relanceType: RelanceType | null
}

export function EmailsClient({ prospects }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState | null>(null)

  if (prospects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-sm text-[#737373]">Tous vos prospects actifs ont été traités.</p>
      </div>
    )
  }

  function handleClose() {
    setModal(null)
    // DemarcherSheet appelle déjà router.refresh() après envoi réussi
  }

  return (
    <>
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="flex flex-col gap-2"
      >
        {prospects.map((prospect) => (
          <motion.div key={prospect.id} variants={staggerItem}>
            <EmailProspectRow
              prospect={prospect}
              isExpanded={expandedId === prospect.id}
              onToggleExpand={() =>
                setExpandedId(expandedId === prospect.id ? null : prospect.id)
              }
              onDemarcher={() => setModal({ prospect, isRelance: false, relanceType: null })}
              onRelancer={(relanceType) => setModal({ prospect, isRelance: true, relanceType })}
            />
          </motion.div>
        ))}
      </motion.div>

      {modal && (
        <DemarcherSheet
          prospect={modal.prospect}
          isRelance={modal.isRelance}
          relanceType={modal.relanceType ?? undefined}
          onClose={handleClose}
        />
      )}
    </>
  )
}
