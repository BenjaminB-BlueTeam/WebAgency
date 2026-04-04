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

interface SearchFormProps {
  query: string
  onQueryChange: (value: string) => void
  ville: string
  onVilleChange: (value: string) => void
  rayon: string
  onRayonChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  loading: boolean
}

export function SearchForm({
  query,
  onQueryChange,
  ville,
  onVilleChange,
  rayon,
  onRayonChange,
  onSubmit,
  loading,
}: SearchFormProps) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col md:flex-row gap-3 mb-6">
      <Input
        placeholder="Ex: boulangerie, coiffeur..."
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        className="bg-[#0a0a0a] border-[#1a1a1a] text-[#fafafa] placeholder:text-[#555555]"
        disabled={loading}
      />
      <Input
        placeholder="Ex: Lille, Roubaix..."
        value={ville}
        onChange={(e) => onVilleChange(e.target.value)}
        className="bg-[#0a0a0a] border-[#1a1a1a] text-[#fafafa] placeholder:text-[#555555]"
        disabled={loading}
      />
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
        disabled={loading || !query.trim() || !ville.trim()}
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
    </form>
  )
}
