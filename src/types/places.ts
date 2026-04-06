export interface PlaceResult {
  placeId: string
  nom: string
  adresse: string
  telephone: string | null
  siteUrl: string | null
  noteGoogle: number | null
  nbAvisGoogle: number | null
  types: string[]
}

export interface SearchResult extends PlaceResult {
  dejaEnBase: boolean
  scoreGlobal?: number | null
}
