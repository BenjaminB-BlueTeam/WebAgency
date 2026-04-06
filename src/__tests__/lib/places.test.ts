import { describe, it, expect, vi, beforeEach } from "vitest"
import { searchPlaces, parsePlacesResponse } from "@/lib/places"

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

describe("parsePlacesResponse", () => {
  it("parses a valid Google Places response into PlaceResult[]", () => {
    const googleResponse = {
      places: [
        {
          id: "ChIJ1234567890",
          displayName: { text: "Boulangerie Dupont", languageCode: "fr" },
          formattedAddress: "12 Rue de la Paix, 59000 Lille, France",
          nationalPhoneNumber: "03 20 12 34 56",
          websiteUri: "https://boulangerie-dupont.fr",
          rating: 4.5,
          userRatingCount: 120,
          types: ["bakery", "food", "store"],
        },
        {
          id: "ChIJ0987654321",
          displayName: { text: "Salon Beauté" },
          formattedAddress: "5 Place du Général de Gaulle, 59000 Lille, France",
          rating: 3.8,
          userRatingCount: 45,
          types: ["beauty_salon"],
        },
      ],
    }

    const results = parsePlacesResponse(googleResponse)
    expect(results).toHaveLength(2)
    expect(results[0]).toEqual({
      placeId: "ChIJ1234567890",
      nom: "Boulangerie Dupont",
      adresse: "12 Rue de la Paix, 59000 Lille, France",
      telephone: "03 20 12 34 56",
      siteUrl: "https://boulangerie-dupont.fr",
      noteGoogle: 4.5,
      nbAvisGoogle: 120,
      types: ["bakery", "food", "store"],
    })
    expect(results[1].telephone).toBeNull()
    expect(results[1].siteUrl).toBeNull()
  })

  it("returns empty array when no places", () => {
    expect(parsePlacesResponse({})).toEqual([])
    expect(parsePlacesResponse({ places: [] })).toEqual([])
  })
})

describe("searchPlaces", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("GOOGLE_PLACES_KEY", "test-api-key")
  })

  it("calls Google Places API with correct params", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ places: [] }),
    })

    await searchPlaces("boulangerie", "Lille")

    expect(mockFetch).toHaveBeenCalledWith(
      "https://places.googleapis.com/v1/places:searchText",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "X-Goog-Api-Key": "test-api-key",
        }),
      })
    )
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.textQuery).toBe("boulangerie Lille")
  })

  it("throws on 403", async () => {
    mockFetch.mockResolvedValue({
      ok: false, status: 403,
      json: async () => ({}),
    })
    await expect(searchPlaces("test", "Lille")).rejects.toThrow("Clé API Google Places invalide")
  })

  it("throws on 429", async () => {
    mockFetch.mockResolvedValue({
      ok: false, status: 429,
      json: async () => ({}),
    })
    await expect(searchPlaces("test", "Lille")).rejects.toThrow("Quota API Google Places dépassé")
  })

  it("passe locationBias quand radiusMeters est fourni et geocoding réussit", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [{ geometry: { location: { lat: 50.83, lng: 2.57 } } }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ places: [] }),
      })
    await searchPlaces("plombier", "Saint-Sylvestre-Cappel", 20000)
    expect(mockFetch).toHaveBeenCalledTimes(2)
    const placesBody = JSON.parse(mockFetch.mock.calls[1][1].body as string)
    expect(placesBody.locationBias).toEqual({
      circle: { center: { latitude: 50.83, longitude: 2.57 }, radius: 20000 },
    })
  })

  it("envoie la requête sans locationBias si geocoding échoue", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ places: [] }) })
    await searchPlaces("plombier", "Inconnu", 20000)
    const placesBody = JSON.parse(mockFetch.mock.calls[1][1].body as string)
    expect(placesBody.locationBias).toBeUndefined()
  })
})
