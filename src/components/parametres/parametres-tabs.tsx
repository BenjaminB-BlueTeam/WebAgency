"use client"

import { useState } from "react"
import { ApiStatusSection } from "@/components/parametres/api-status-section"
import { ProfilSection } from "@/components/parametres/profil-section"
import { ScoringSection } from "@/components/parametres/scoring-section"
import { RelanceSection } from "@/components/parametres/relance-section"
import { ZoneProspectionSection } from "@/components/parametres/zone-prospection-section"
import { OffresSection } from "@/components/parametres/offres-section"
import { TemplatesEmailSection } from "@/components/parametres/templates-email-section"

type Tab = "apis" | "profil" | "scoring" | "relances" | "zone" | "offres" | "emails"

const TABS: { id: Tab; label: string }[] = [
  { id: "apis", label: "APIs" },
  { id: "profil", label: "Profil" },
  { id: "scoring", label: "Scoring" },
  { id: "relances", label: "Relances" },
  { id: "zone", label: "Zone" },
  { id: "offres", label: "Offres" },
  { id: "emails", label: "Emails" },
]

type Props = {
  profil: {
    nom: string
    contact: string
    email: string
    telephone: string
    adresse: string
  }
  scoring: {
    presenceWeb: number
    seo: number
    design: number
    financier: number
    potentiel: number
  }
  relances: {
    email: number
    maquette: number
    rdv: number
    devis: number
  }
  zone: {
    villes: string[]
    rayonKm: number
  }
  offres: {
    vitrine: { prix: string; description: string }
    visibilite: { prix: string; maintenance: string; description: string }
  }
  emails: {
    prospection: string
    relance: string
  }
}

export function ParametresTabs({ profil, scoring, relances, zone, offres, emails }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("apis")

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-[#1a1a1a] mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm whitespace-nowrap transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-[#fafafa] text-[#fafafa] font-medium"
                : "border-transparent text-[#737373] hover:text-[#fafafa]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "apis" && <ApiStatusSection />}
      {activeTab === "profil" && <ProfilSection initial={profil} />}
      {activeTab === "scoring" && <ScoringSection initial={scoring} />}
      {activeTab === "relances" && <RelanceSection initial={relances} />}
      {activeTab === "zone" && (
        <ZoneProspectionSection initialVilles={zone.villes} initialRayon={zone.rayonKm} />
      )}
      {activeTab === "offres" && (
        <OffresSection
          initialVitrine={offres.vitrine}
          initialVisibilite={offres.visibilite}
        />
      )}
      {activeTab === "emails" && (
        <TemplatesEmailSection
          initialProspection={emails.prospection}
          initialRelance={emails.relance}
        />
      )}
    </div>
  )
}
