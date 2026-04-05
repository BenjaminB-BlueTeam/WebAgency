"use client"

import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { STATUT_PIPELINE_VALUES } from "@/lib/validation"

const STATUT_LABELS: Record<string, string> = {
  A_DEMARCHER: "À démarcher",
  MAQUETTE_EMAIL_ENVOYES: "Maquette + Email envoyés",
  REPONDU: "Répondu",
  RDV_PLANIFIE: "RDV planifié",
  NEGOCIATION: "Négociation",
  CLIENT: "Client",
  PERDU: "Perdu",
}

interface ProspectFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  statut: string
  onStatutChange: (value: string) => void
  scoreMin: number
  onScoreMinChange: (value: number) => void
}

export function ProspectFilters({
  search,
  onSearchChange,
  statut,
  onStatutChange,
  scoreMin,
  onScoreMinChange,
}: ProspectFiltersProps) {
  return (
    <div className="flex flex-col md:flex-row gap-3 mb-6">
      <div className="relative flex-1">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555555]"
        />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher un prospect..."
          className="pl-9 bg-[#0a0a0a] border-[#1a1a1a]"
        />
      </div>
      <Select value={statut} onValueChange={onStatutChange}>
        <SelectTrigger className="w-full md:w-[180px] bg-[#0a0a0a] border-[#1a1a1a]">
          <SelectValue placeholder="Tous les statuts" />
        </SelectTrigger>
        <SelectContent className="bg-[#0a0a0a] border-[#1a1a1a]">
          <SelectItem value="all">Tous les statuts</SelectItem>
          {STATUT_PIPELINE_VALUES.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUT_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex items-center gap-2 min-w-[180px]">
        <span className="text-xs text-[#737373] whitespace-nowrap">
          Score min: {scoreMin}
        </span>
        <Slider
          value={[scoreMin]}
          onValueChange={([v]) => onScoreMinChange(v)}
          min={0}
          max={10}
          step={1}
          className="flex-1"
        />
      </div>
    </div>
  )
}
