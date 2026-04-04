# Recherche Google Places — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Google Places search page — search for businesses, display results with duplicate detection, save selected ones as prospects.

**Architecture:** Google Places API client in lib/places.ts, two API routes for search and save, client-side page with form + results grid + expand cards. Server components not needed — the page is fully interactive.

**Tech Stack:** Next.js 16 App Router, Google Places API (New), Prisma, Framer Motion, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-04-04-recherche-google-places-design.md`

---

### Task 1: PlaceResult types

**Files:**
- Create: `src/types/places.ts`

- [ ] **Step 1: Create types file**

Create `src/types/places.ts`:

```typescript
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
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/places.ts
git commit -m "feat: add PlaceResult and SearchResult types"
```

---

### Task 2: Google Places API client

**Files:**
- Create: `src/lib/places.ts`
- Create: `src/__tests__/lib/places.test.ts`

- [ ] **Step 1: Create the test file**

Create `src/__tests__/lib/places.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"
import { searchPlaces, parsePlacesResponse } from "@/lib/places"

// Mock global fetch
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

    expect(results[1]).toEqual({
      placeId: "ChIJ0987654321",
      nom: "Salon Beauté",
      adresse: "5 Place du Général de Gaulle, 59000 Lille, France",
      telephone: null,
      siteUrl: null,
      noteGoogle: 3.8,
      nbAvisGoogle: 45,
      types: ["beauty_salon"],
    })
  })

  it("returns empty array when no places in response", () => {
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

  it("throws descriptive error on 403", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: { message: "forbidden" } }),
    })

    await expect(searchPlaces("test", "Lille")).rejects.toThrow(
      "Clé API Google Places invalide"
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/lib/places.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Create lib/places.ts**

Create `src/lib/places.ts`:

```typescript
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

export function parsePlacesResponse(
  response: GooglePlacesResponse
): PlaceResult[] {
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

export async function searchPlaces(
  query: string,
  ville: string
): Promise<PlaceResult[]> {
  const apiKey = process.env.GOOGLE_PLACES_KEY
  if (!apiKey) {
    throw new Error("Clé API Google Places non configurée")
  }

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
    if (res.status === 403) {
      throw new Error("Clé API Google Places invalide")
    }
    if (res.status === 429) {
      throw new Error("Quota API Google Places dépassé")
    }
    throw new Error(`Erreur Google Places API (${res.status})`)
  }

  const data: GooglePlacesResponse = await res.json()
  return parsePlacesResponse(data)
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/__tests__/lib/places.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/places.ts src/__tests__/lib/places.test.ts
git commit -m "feat: add Google Places API client with tests"
```

---

### Task 3: POST /api/prospection/search

**Files:**
- Create: `src/app/api/prospection/search/route.ts`

- [ ] **Step 1: Create the route**

Create `src/app/api/prospection/search/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { searchPlaces } from "@/lib/places"
import { validateString } from "@/lib/validation"

const ALLOWED_RAYONS = [5000, 10000, 20000, 30000] as const

export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const body = await request.json()

    const query = validateString(body.query, 100)
    if (!query) {
      return NextResponse.json(
        { error: "Activité requise (1-100 caractères)" },
        { status: 400 }
      )
    }

    const ville = validateString(body.ville, 100)
    if (!ville) {
      return NextResponse.json(
        { error: "Ville requise (1-100 caractères)" },
        { status: 400 }
      )
    }

    const rayon = Number(body.rayon)
    if (!ALLOWED_RAYONS.includes(rayon as (typeof ALLOWED_RAYONS)[number])) {
      return NextResponse.json(
        { error: "Rayon invalide (5000, 10000, 20000, 30000)" },
        { status: 400 }
      )
    }

    const places = await searchPlaces(query, ville)

    // Check duplicates by placeId
    const placeIds = places.map((p) => p.placeId).filter(Boolean)
    const existing = await prisma.prospect.findMany({
      where: { placeId: { in: placeIds } },
      select: { placeId: true },
    })
    const existingPlaceIds = new Set(existing.map((p) => p.placeId))

    const resultats = places.map((p) => ({
      ...p,
      dejaEnBase: existingPlaceIds.has(p.placeId),
    }))

    // Log the search
    const recherche = await prisma.recherche.create({
      data: {
        query,
        ville,
        resultatsCount: resultats.length,
        prospectsAjoutes: 0,
      },
    })

    return NextResponse.json({
      data: { rechercheId: recherche.id, resultats },
    })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    if (error instanceof Error && error.message.startsWith("Clé API")) {
      return NextResponse.json({ error: error.message }, { status: 502 })
    }
    if (error instanceof Error && error.message.startsWith("Quota")) {
      return NextResponse.json({ error: error.message }, { status: 429 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/prospection/search/route.ts
git commit -m "feat: add POST /api/prospection/search route"
```

---

### Task 4: POST /api/prospection/save

**Files:**
- Create: `src/app/api/prospection/save/route.ts`

- [ ] **Step 1: Create the route**

Create `src/app/api/prospection/save/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import type { PlaceResult } from "@/types/places"

function extractVille(adresse: string): string {
  // Try to extract city from "12 Rue X, 59000 Lille, France"
  const parts = adresse.split(",").map((s) => s.trim())
  if (parts.length >= 2) {
    // Second-to-last part often has postal code + city
    const cityPart = parts[parts.length - 2]
    // Remove postal code (digits at start)
    const city = cityPart.replace(/^\d{4,5}\s*/, "").trim()
    if (city) return city
  }
  return adresse
}

function extractActivite(types: string[]): string {
  if (types.length === 0) return "Entreprise"
  // Use first type, replace underscores with spaces, capitalize
  const first = types[0].replace(/_/g, " ")
  return first.charAt(0).toUpperCase() + first.slice(1)
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const body = await request.json()

    const { rechercheId, prospects } = body as {
      rechercheId: string
      prospects: PlaceResult[]
    }

    if (!rechercheId || typeof rechercheId !== "string") {
      return NextResponse.json(
        { error: "rechercheId requis" },
        { status: 400 }
      )
    }

    if (!Array.isArray(prospects) || prospects.length === 0) {
      return NextResponse.json(
        { error: "Au moins un prospect requis" },
        { status: 400 }
      )
    }

    // Check which placeIds already exist
    const placeIds = prospects.map((p) => p.placeId).filter(Boolean)
    const existing = await prisma.prospect.findMany({
      where: { placeId: { in: placeIds } },
      select: { placeId: true },
    })
    const existingSet = new Set(existing.map((p) => p.placeId))

    let saved = 0
    let skipped = 0

    for (const prospect of prospects) {
      if (existingSet.has(prospect.placeId)) {
        skipped++
        continue
      }

      const ville = extractVille(prospect.adresse)

      await prisma.prospect.create({
        data: {
          nom: prospect.nom,
          activite: extractActivite(prospect.types),
          ville,
          adresse: prospect.adresse,
          telephone: prospect.telephone,
          siteUrl: prospect.siteUrl,
          placeId: prospect.placeId,
          noteGoogle: prospect.noteGoogle,
          nbAvisGoogle: prospect.nbAvisGoogle,
          statutPipeline: "A_DEMARCHER",
          scorePresenceWeb: prospect.siteUrl ? 3 : 10,
        },
      })

      await prisma.activite.create({
        data: {
          prospectId: undefined, // Will be linked after we get the ID
          type: "RECHERCHE",
          description: `Prospect "${prospect.nom}" ajouté depuis la recherche`,
        },
      })

      saved++
    }

    // Fix: create prospects and activities properly
    // The above has a bug — we need the prospect ID for the activite.
    // Let me rewrite the loop properly.

    return NextResponse.json({ data: { saved, skipped } })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
```

**Wait — the above has a bug with prospectId for activities. Here's the corrected version:**

Replace the full route file with:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import type { PlaceResult } from "@/types/places"

function extractVille(adresse: string): string {
  const parts = adresse.split(",").map((s) => s.trim())
  if (parts.length >= 2) {
    const cityPart = parts[parts.length - 2]
    const city = cityPart.replace(/^\d{4,5}\s*/, "").trim()
    if (city) return city
  }
  return adresse
}

function extractActivite(types: string[]): string {
  if (types.length === 0) return "Entreprise"
  const first = types[0].replace(/_/g, " ")
  return first.charAt(0).toUpperCase() + first.slice(1)
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const body = await request.json()
    const { rechercheId, prospects } = body as {
      rechercheId: string
      prospects: PlaceResult[]
    }

    if (!rechercheId || typeof rechercheId !== "string") {
      return NextResponse.json(
        { error: "rechercheId requis" },
        { status: 400 }
      )
    }

    if (!Array.isArray(prospects) || prospects.length === 0) {
      return NextResponse.json(
        { error: "Au moins un prospect requis" },
        { status: 400 }
      )
    }

    const placeIds = prospects.map((p) => p.placeId).filter(Boolean)
    const existing = await prisma.prospect.findMany({
      where: { placeId: { in: placeIds } },
      select: { placeId: true },
    })
    const existingSet = new Set(existing.map((p) => p.placeId))

    let saved = 0
    let skipped = 0

    for (const prospect of prospects) {
      if (existingSet.has(prospect.placeId)) {
        skipped++
        continue
      }

      const ville = extractVille(prospect.adresse)

      const created = await prisma.prospect.create({
        data: {
          nom: prospect.nom,
          activite: extractActivite(prospect.types),
          ville,
          adresse: prospect.adresse,
          telephone: prospect.telephone,
          siteUrl: prospect.siteUrl,
          placeId: prospect.placeId,
          noteGoogle: prospect.noteGoogle,
          nbAvisGoogle: prospect.nbAvisGoogle,
          statutPipeline: "A_DEMARCHER",
          scorePresenceWeb: prospect.siteUrl ? 3 : 10,
        },
      })

      await prisma.activite.create({
        data: {
          prospectId: created.id,
          type: "RECHERCHE",
          description: `Prospect "${prospect.nom}" ajouté depuis la recherche`,
        },
      })

      saved++
    }

    // Update recherche count
    if (saved > 0) {
      await prisma.recherche.update({
        where: { id: rechercheId },
        data: { prospectsAjoutes: { increment: saved } },
      })
    }

    return NextResponse.json({ data: { saved, skipped } })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/prospection/save/route.ts
git commit -m "feat: add POST /api/prospection/save route"
```

---

### Task 5: Search form component

**Files:**
- Create: `src/components/recherche/search-form.tsx`

- [ ] **Step 1: Create search-form.tsx**

Create `src/components/recherche/search-form.tsx`:

```tsx
"use client"

import { Search, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"

interface SearchFormProps {
  query: string
  onQueryChange: (value: string) => void
  ville: string
  onVilleChange: (value: string) => void
  rayon: string
  onRayonChange: (value: string) => void
  onSubmit: () => void
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
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3 mb-6">
      <Input
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Ex: boulangerie, coiffeur..."
        className="flex-1 bg-[#0a0a0a] border-[#1a1a1a]"
      />
      <Input
        value={ville}
        onChange={(e) => onVilleChange(e.target.value)}
        placeholder="Ex: Lille, Roubaix..."
        className="flex-1 bg-[#0a0a0a] border-[#1a1a1a]"
      />
      <Select value={rayon} onValueChange={onRayonChange}>
        <SelectTrigger className="w-full md:w-[140px] bg-[#0a0a0a] border-[#1a1a1a]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-[#0a0a0a] border-[#1a1a1a]">
          <SelectItem value="5000">5 km</SelectItem>
          <SelectItem value="10000">10 km</SelectItem>
          <SelectItem value="20000">20 km</SelectItem>
          <SelectItem value="30000">30 km</SelectItem>
        </SelectContent>
      </Select>
      <Button type="submit" disabled={loading || !query.trim() || !ville.trim()}>
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Recherche...
          </>
        ) : (
          <>
            <Search size={16} />
            Rechercher
          </>
        )}
      </Button>
    </form>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/recherche/search-form.tsx
git commit -m "feat: add search form component"
```

---

### Task 6: Result card component

**Files:**
- Create: `src/components/recherche/result-card.tsx`

- [ ] **Step 1: Create result-card.tsx**

Create `src/components/recherche/result-card.tsx`:

```tsx
"use client"

import { motion, AnimatePresence } from "motion/react"
import { Star, Globe, GlobeIcon, Phone, MapPin, ExternalLink } from "lucide-react"
import { staggerItem, expandCollapse } from "@/lib/animations"
import { ScoreBar } from "@/components/prospects/score-bar"
import type { SearchResult } from "@/types/places"

interface ResultCardProps {
  result: SearchResult
  isSelected: boolean
  onToggleSelect: () => void
  isExpanded: boolean
  onToggleExpand: () => void
}

export function ResultCard({
  result,
  isSelected,
  onToggleSelect,
  isExpanded,
  onToggleExpand,
}: ResultCardProps) {
  return (
    <motion.div variants={staggerItem}>
      <div
        className={`rounded-[6px] border p-3 cursor-pointer transition-colors ${
          isSelected
            ? "border-[#fafafa] bg-[#0a0a0a]"
            : "border-[#1a1a1a] bg-[#0a0a0a] hover:border-[#333]"
        }`}
        onClick={onToggleExpand}
      >
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isSelected}
              disabled={result.dejaEnBase}
              onChange={onToggleSelect}
              className="w-4 h-4 rounded accent-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#fafafa] truncate">
                  {result.nom}
                </p>
                <p className="text-xs text-[#737373] truncate">{result.adresse}</p>
              </div>
            </div>

            <div className="flex items-center flex-wrap gap-2 mt-2">
              {/* Note Google */}
              {result.noteGoogle !== null && (
                <span className="flex items-center gap-1 text-xs text-[#fafafa]">
                  <Star size={12} className="text-[#fbbf24] fill-[#fbbf24]" />
                  {result.noteGoogle}
                  {result.nbAvisGoogle !== null && (
                    <span className="text-[#737373]">({result.nbAvisGoogle})</span>
                  )}
                </span>
              )}

              {/* Site badge */}
              {result.siteUrl ? (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: "#1a1a1a", color: "#4ade80", borderRadius: "9999px" }}
                >
                  <Globe size={10} />
                  A un site
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: "#1a1a1a", color: "#fbbf24", borderRadius: "9999px" }}
                >
                  <GlobeIcon size={10} />
                  Pas de site
                </span>
              )}

              {/* Deja en base badge */}
              {result.dejaEnBase && (
                <span
                  className="inline-flex items-center px-2 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: "#1a1a1a", color: "#737373", borderRadius: "9999px" }}
                >
                  Déjà enregistré
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expand */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            variants={expandCollapse}
            initial="initial"
            animate="animate"
            exit="exit"
            className="border border-t-0 border-[#1a1a1a] rounded-b-[6px] bg-[#0a0a0a] p-4"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <MapPin size={14} className="text-[#555555]" />
                <span className="text-[#fafafa]">{result.adresse}</span>
              </div>
              {result.telephone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone size={14} className="text-[#555555]" />
                  <span className="text-[#fafafa]">{result.telephone}</span>
                </div>
              )}
              {result.siteUrl && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe size={14} className="text-[#555555]" />
                  <a
                    href={result.siteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#fafafa] hover:underline flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {result.siteUrl} <ExternalLink size={12} />
                  </a>
                </div>
              )}
              <div className="pt-2">
                <ScoreBar
                  label="Présence web"
                  value={result.siteUrl ? 3 : 10}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/recherche/result-card.tsx
git commit -m "feat: add result card component with expand"
```

---

### Task 7: Search results + save button

**Files:**
- Create: `src/components/recherche/search-results.tsx`

- [ ] **Step 1: Create search-results.tsx**

Create `src/components/recherche/search-results.tsx`:

```tsx
"use client"

import { motion } from "motion/react"
import { Save, Loader2 } from "lucide-react"
import { staggerContainer } from "@/lib/animations"
import { Button } from "@/components/ui/button"
import { ResultCard } from "@/components/recherche/result-card"
import type { SearchResult } from "@/types/places"

interface SearchResultsProps {
  resultats: SearchResult[]
  selectedIds: Set<string>
  onToggleSelect: (placeId: string) => void
  expandedId: string | null
  onToggleExpand: (placeId: string) => void
  onSave: () => void
  saving: boolean
}

export function SearchResults({
  resultats,
  selectedIds,
  onToggleSelect,
  expandedId,
  onToggleExpand,
  onSave,
  saving,
}: SearchResultsProps) {
  const selectedCount = selectedIds.size

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[#737373]">
          {resultats.length} résultat{resultats.length > 1 ? "s" : ""} trouvé{resultats.length > 1 ? "s" : ""}
        </p>
        <Button
          onClick={onSave}
          disabled={selectedCount === 0 || saving}
          size="sm"
        >
          {saving ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save size={14} />
              Enregistrer ({selectedCount})
            </>
          )}
        </Button>
      </div>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-2"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {resultats.map((result) => (
          <ResultCard
            key={result.placeId}
            result={result}
            isSelected={selectedIds.has(result.placeId)}
            onToggleSelect={() => onToggleSelect(result.placeId)}
            isExpanded={expandedId === result.placeId}
            onToggleExpand={() => onToggleExpand(result.placeId)}
          />
        ))}
      </motion.div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/recherche/search-results.tsx
git commit -m "feat: add search results grid with save button"
```

---

### Task 8: Recherche page (main page)

**Files:**
- Modify: `src/app/(dashboard)/recherche/page.tsx`

- [ ] **Step 1: Replace the placeholder page**

Replace `src/app/(dashboard)/recherche/page.tsx` with:

```tsx
"use client"

import { useState, useCallback } from "react"
import { toast } from "sonner"
import { motion } from "motion/react"
import { fadeInUp } from "@/lib/animations"
import { Skeleton } from "@/components/ui/skeleton"
import { SearchForm } from "@/components/recherche/search-form"
import { SearchResults } from "@/components/recherche/search-results"
import type { SearchResult, PlaceResult } from "@/types/places"

export default function RecherchePage() {
  const [query, setQuery] = useState("")
  const [ville, setVille] = useState("")
  const [rayon, setRayon] = useState("10000")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [resultats, setResultats] = useState<SearchResult[] | null>(null)
  const [rechercheId, setRechercheId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleSearch = useCallback(async () => {
    setLoading(true)
    setResultats(null)
    setSelectedIds(new Set())
    setExpandedId(null)

    try {
      const res = await fetch("/api/prospection/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), ville: ville.trim(), rayon: Number(rayon) }),
      })

      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error ?? "Erreur lors de la recherche")
        return
      }

      setResultats(json.data.resultats)
      setRechercheId(json.data.rechercheId)

      if (json.data.resultats.length === 0) {
        toast.info("Aucun résultat trouvé")
      }
    } catch {
      toast.error("Erreur réseau")
    } finally {
      setLoading(false)
    }
  }, [query, ville, rayon])

  const handleToggleSelect = useCallback((placeId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(placeId)) next.delete(placeId)
      else next.add(placeId)
      return next
    })
  }, [])

  const handleToggleExpand = useCallback((placeId: string) => {
    setExpandedId((prev) => (prev === placeId ? null : placeId))
  }, [])

  const handleSave = useCallback(async () => {
    if (!rechercheId || selectedIds.size === 0) return

    setSaving(true)
    try {
      const prospects: PlaceResult[] = resultats!
        .filter((r) => selectedIds.has(r.placeId))
        .map(({ dejaEnBase: _, ...rest }) => rest)

      const res = await fetch("/api/prospection/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rechercheId, prospects }),
      })

      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error ?? "Erreur lors de l'enregistrement")
        return
      }

      toast.success(
        `${json.data.saved} prospect${json.data.saved > 1 ? "s" : ""} enregistré${json.data.saved > 1 ? "s" : ""}${
          json.data.skipped > 0 ? ` (${json.data.skipped} doublon${json.data.skipped > 1 ? "s" : ""})` : ""
        }`
      )

      // Update dejaEnBase flags and clear selection
      setResultats((prev) =>
        prev!.map((r) =>
          selectedIds.has(r.placeId) ? { ...r, dejaEnBase: true } : r
        )
      )
      setSelectedIds(new Set())
    } catch {
      toast.error("Erreur réseau")
    } finally {
      setSaving(false)
    }
  }, [rechercheId, selectedIds, resultats])

  return (
    <div>
      <h1 className="text-xl font-bold text-[#fafafa] mb-6">Recherche de prospects</h1>

      <SearchForm
        query={query}
        onQueryChange={setQuery}
        ville={ville}
        onVilleChange={setVille}
        rayon={rayon}
        onRayonChange={setRayon}
        onSubmit={handleSearch}
        loading={loading}
      />

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full bg-[#0a0a0a]" />
          ))}
        </div>
      )}

      {!loading && resultats !== null && resultats.length === 0 && (
        <motion.p
          variants={fadeInUp}
          initial="initial"
          animate="animate"
          className="text-center text-sm text-[#555555] py-12"
        >
          Aucun résultat trouvé pour cette recherche
        </motion.p>
      )}

      {!loading && resultats !== null && resultats.length > 0 && (
        <SearchResults
          resultats={resultats}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          expandedId={expandedId}
          onToggleExpand={handleToggleExpand}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/recherche/page.tsx
git commit -m "feat: add recherche page with search, results, and save"
```

---

### Task 9: Final verification

**Files:** None (verification only)

- [ ] **Step 1: TypeScript check**

Run: `npx tsc --noEmit --pretty`

- [ ] **Step 2: Run all tests**

Run: `npm run test`
Expected: All tests pass (11 existing + new places tests).

- [ ] **Step 3: Lint check**

Run: `npm run lint`

- [ ] **Step 4: Fix any issues and commit**

If fixes needed:
```bash
git add -A
git commit -m "fix: resolve build/lint issues in recherche feature"
```
