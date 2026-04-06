"use client"

import { Search, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ZoneMode } from "@/lib/zones"

interface SearchFormProps {
  query: string
  onQueryChange: (value: string) => void
  ville: string
  onVilleChange: (value: string) => void
  rayon: string
  onRayonChange: (value: string) => void
  zone: ZoneMode
  onZoneChange: (value: ZoneMode) => void
  onSubmit: (e: React.FormEvent) => void
  loading: boolean
  progressText?: string
}

export function SearchForm({
  query,
  onQueryChange,
  ville,
  onVilleChange,
  rayon,
  onRayonChange,
  zone,
  onZoneChange,
  onSubmit,
  loading,
  progressText,
}: SearchFormProps) {
  const canSubmit = zone === "ville" ? ville.trim().length > 0 : true

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 mb-6">
      <div className="flex flex-col md:flex-row gap-3">
        <Input
          placeholder="Activité (optionnel) — ex: boulangerie, coiffeur..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="bg-[#0a0a0a] border-[#1a1a1a] text-[#fafafa] placeholder:text-[#555555]"
          disabled={loading}
        />

        {zone === "ville" && (
          <Input
            placeholder="Ex: Lille, Roubaix..."
            value={ville}
            onChange={(e) => onVilleChange(e.target.value)}
            className="bg-[#0a0a0a] border-[#1a1a1a] text-[#fafafa] placeholder:text-[#555555]"
            disabled={loading}
          />
        )}

        <Select value={zone} onValueChange={(v) => onZoneChange(v as ZoneMode)} disabled={loading}>
          <SelectTrigger className="bg-[#0a0a0a] border-[#1a1a1a] text-[#fafafa] md:w-[200px] shrink-0">
            <SelectValue placeholder="Zone" />
          </SelectTrigger>
          <SelectContent className="bg-[#0a0a0a] border-[#1a1a1a] text-[#fafafa]">
            <SelectItem value="ville">Ville</SelectItem>
            <SelectItem value="departement">Département (Nord — 59)</SelectItem>
            <SelectItem value="region">Région (Hauts-de-France)</SelectItem>
          </SelectContent>
        </Select>

        <Select value={rayon} onValueChange={onRayonChange} disabled={loading}>
          <SelectTrigger className="bg-[#0a0a0a] border-[#1a1a1a] text-[#fafafa] md:w-[160px] shrink-0">
            <SelectValue placeholder="Rayon" />
          </SelectTrigger>
          <SelectContent className="bg-[#0a0a0a] border-[#1a1a1a] text-[#fafafa]">
            <SelectItem value="5000">5 km</SelectItem>
            <SelectItem value="10000">10 km</SelectItem>
            <SelectItem value="20000">20 km</SelectItem>
            <SelectItem value="30000">30 km</SelectItem>
          </SelectContent>
        </Select>

        <Button
          type="submit"
          disabled={loading || !canSubmit}
          className="bg-white text-black hover:bg-white/90 shrink-0"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" />
              Recherche...
            </>
          ) : (
            <>
              <Search />
              Rechercher
            </>
          )}
        </Button>
      </div>

      {loading && progressText && (
        <p className="text-sm text-[#737373]">{progressText}</p>
      )}
    </form>
  )
}
