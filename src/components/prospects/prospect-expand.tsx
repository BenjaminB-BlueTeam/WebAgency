"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { Phone, Mail, MapPin, Globe, ExternalLink } from "lucide-react"
import { expandCollapse } from "@/lib/animations"
import { Button } from "@/components/ui/button"
import { ScoreBar } from "@/components/prospects/score-bar"
import type { Prospect } from "@/types/prospect"

export function ProspectExpand({ prospect }: { prospect: Prospect }) {
  return (
    <motion.div
      variants={expandCollapse}
      initial="initial"
      animate="animate"
      exit="exit"
      className="border-t border-[#1a1a1a] bg-[#0a0a0a]"
    >
      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contact info */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-[#737373] uppercase tracking-wider mb-2">
            Contact
          </h4>
          <div className="flex items-center gap-2 text-sm">
            <Phone size={14} className="text-[#555555]" />
            <span className="text-[#fafafa]">
              {prospect.telephone ?? "\u2014"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Mail size={14} className="text-[#555555]" />
            {prospect.email ? (
              <a href={`mailto:${prospect.email}`} className="text-[#fafafa] hover:underline">
                {prospect.email}
              </a>
            ) : (
              <span className="text-[#555555]">{"\u2014"}</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin size={14} className="text-[#555555]" />
            <span className="text-[#fafafa]">
              {prospect.adresse ?? "\u2014"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Globe size={14} className="text-[#555555]" />
            {prospect.siteUrl ? (
              <a
                href={prospect.siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#fafafa] hover:underline flex items-center gap-1"
              >
                Site web <ExternalLink size={12} />
              </a>
            ) : (
              <span className="text-[#555555]">Aucun site</span>
            )}
          </div>
          {prospect.noteGoogle !== null && (
            <div className="text-sm text-[#fafafa] mt-2">
              {"⭐"} {prospect.noteGoogle}/5
              {prospect.nbAvisGoogle !== null && (
                <span className="text-[#737373]">
                  {" "}({prospect.nbAvisGoogle} avis)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Scoring */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-[#737373] uppercase tracking-wider mb-2">
            Scoring
          </h4>
          <ScoreBar label="Potentiel web" value={prospect.scorePresenceWeb} />
          <ScoreBar label="SEO" value={prospect.scoreSEO} />
          <ScoreBar label="Design" value={prospect.scoreDesign} />
          <ScoreBar label="Financier" value={prospect.scoreFinancier} />
          <ScoreBar label="Potentiel" value={prospect.scorePotentiel} />
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-medium text-[#737373] uppercase tracking-wider mb-2">
            Actions
          </h4>
          <Button asChild size="sm">
            <Link href={`/prospects/${prospect.id}`}>Voir fiche</Link>
          </Button>
          <Button variant="outline" size="sm" disabled className="opacity-50">
            Analyser concurrence
          </Button>
          <Button variant="outline" size="sm" disabled className="opacity-50">
            Démarcher
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
