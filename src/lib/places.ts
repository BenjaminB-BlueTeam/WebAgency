import type { PlaceResult } from "@/types/places"

const PLACES_ENDPOINT = "https://places.googleapis.com/v1/places:searchText"
const FIELD_MASK =
  "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.types"

interface GooglePlace {
  id?: string
  displayName?: { text?: string }
  formattedAddress?: string
  nationalPhoneNumber?: string
  websiteUri?: string
  rating?: number
  userRatingCount?: number
  types?: string[]
}

interface GooglePlacesResponse {
  places?: GooglePlace[]
}

export function parsePlacesResponse(response: GooglePlacesResponse): PlaceResult[] {
  if (!response.places || response.places.length === 0) return []
  return response.places.map((place) => ({
    placeId: place.id ?? "",
    nom: place.displayName?.text ?? "",
    adresse: place.formattedAddress ?? "",
    telephone: place.nationalPhoneNumber ?? null,
    siteUrl: place.websiteUri ?? null,
    noteGoogle: place.rating ?? null,
    nbAvisGoogle: place.userRatingCount ?? null,
    types: place.types ?? [],
  }))
}

export async function searchPlaces(query: string, ville: string): Promise<PlaceResult[]> {
  const apiKey = process.env.GOOGLE_PLACES_KEY
  if (!apiKey) throw new Error("Clé API Google Places non configurée")

  const res = await fetch(PLACES_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({ textQuery: `${query} ${ville}` }),
  })

  if (!res.ok) {
    if (res.status === 403) throw new Error("Clé API Google Places invalide")
    if (res.status === 429) throw new Error("Quota API Google Places dépassé")
    throw new Error(`Erreur Google Places API (${res.status})`)
  }

  const data: GooglePlacesResponse = await res.json()
  return parsePlacesResponse(data)
}
