// src/components/emails/email-history-expand.tsx
"use client"

import { motion } from "motion/react"
import { expandCollapse } from "@/lib/animations"
import type { EmailProspectItem } from "@/types/emails"

interface Props {
  emails: EmailProspectItem["emailsHistory"]
}

export function EmailHistoryExpand({ emails }: Props) {
  if (emails.length === 0) {
    return (
      <motion.div
        variants={expandCollapse}
        initial="initial"
        animate="animate"
        exit="exit"
        className="px-4 pb-4"
      >
        <p className="text-xs text-[#555555] py-3">Aucun email envoyé pour ce prospect.</p>
      </motion.div>
    )
  }

  return (
    <motion.div
      variants={expandCollapse}
      initial="initial"
      animate="animate"
      exit="exit"
      className="px-4 pb-4"
    >
      <div className="border border-[#1a1a1a] rounded-[6px] overflow-hidden">
        {emails.map((email, i) => (
          <div
            key={email.id}
            className={`flex items-center justify-between px-4 py-3 text-sm${
              i < emails.length - 1 ? " border-b border-[#1a1a1a]" : ""
            }`}
          >
            <span className="text-[#fafafa] truncate max-w-[60%]">{email.sujet}</span>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-[#737373]">
                {email.dateEnvoi
                  ? new Date(email.dateEnvoi).toLocaleDateString("fr-FR")
                  : "—"}
              </span>
              <span
                className="text-xs px-2 py-0.5"
                style={{
                  backgroundColor: "#1a1a1a",
                  color: email.statut === "ENVOYE" ? "#4ade80" : "#737373",
                  borderRadius: "9999px",
                }}
              >
                {email.statut === "ENVOYE" ? "Envoyé" : "Brouillon"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
