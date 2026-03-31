// crm/src/lib/places.ts

export interface GooglePlace {
  place_id: string;
  name: string;
  formatted_address: string;
  rating?: number;
  types: string[];
}

export interface PlaceDetails {
  name: string;
  formatted_phone_number?: string;
  website?: string;
  rating?: number;
  opening_hours?: {
    weekday_text: string[];
  };
}

const PLACES_KEY = process.env.GOOGLE_PLACES_KEY;

export async function placesTextSearch(query: string): Promise<GooglePlace[]> {
  if (!PLACES_KEY) throw new Error("GOOGLE_PLACES_KEY manquant");

  // Enrich single-word queries
  const words = query.trim().split(/\s+/);
  const effectiveQuery = words.length === 1 ? `commerces ${query}` : query;

  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(effectiveQuery)}&language=fr&region=fr&key=${PLACES_KEY}`;

  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) {
    console.error(`[places] Text search HTTP error: ${res.status}`);
    return [];
  }
  const data = await res.json() as { status: string; results?: GooglePlace[] };

  if (data.status === "ZERO_RESULTS") return [];
  if (data.status !== "OK") {
    console.error(`[places] Text search error: ${data.status}`);
    return [];
  }

  const NON_GEO = new Set(["locality", "political", "administrative_area_level_1", "administrative_area_level_2", "country"]);
  return (data.results ?? []).filter(r => !r.types?.every(t => NON_GEO.has(t)));
}

export async function placesDetails(placeId: string): Promise<PlaceDetails | null> {
  if (!PLACES_KEY) {
    console.warn("[places] GOOGLE_PLACES_KEY manquant — placesDetails retourne null");
    return null;
  }

  const fields = "name,formatted_phone_number,website,opening_hours,rating";
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&language=fr&key=${PLACES_KEY}`;

  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    const data = await res.json() as { status: string; result?: PlaceDetails };
    if (data.status !== "OK") return null;
    return data.result ?? null;
  } catch {
    return null;
  }
}
