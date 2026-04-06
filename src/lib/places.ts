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

async function geocodeCity(ville: string, apiKey: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json")
    url.searchParams.set("address", `${ville}, France`)
    url.searchParams.set("key", apiKey)
    const res = await fetch(url.toString())
    if (!res.ok) return null
    const data = await res.json() as {
      results?: Array<{ geometry?: { location?: { lat: number; lng: number } } }>
    }
    return data.results?.[0]?.geometry?.location ?? null
  } catch {
    return null
  }
}

export async function searchPlaces(query: string, ville: string, radiusMeters?: number): Promise<PlaceResult[]> {
  const apiKey = process.env.GOOGLE_PLACES_KEY
  if (!apiKey) throw new Error("Clé API Google Places non configurée")

  const body: Record<string, unknown> = { textQuery: `${query} ${ville}` }

  if (radiusMeters) {
    const coords = await geocodeCity(ville, apiKey)
    if (coords) {
      body.locationBias = {
        circle: {
          center: { latitude: coords.lat, longitude: coords.lng },
          radius: radiusMeters,
        },
      }
    }
  }

  const res = await fetch(PLACES_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    if (res.status === 403) throw new Error("Clé API Google Places invalide")
    if (res.status === 429) throw new Error("Quota API Google Places dépassé")
    throw new Error(`Erreur Google Places API (${res.status})`)
  }

  const data: GooglePlacesResponse = await res.json()
  return parsePlacesResponse(data)
}
