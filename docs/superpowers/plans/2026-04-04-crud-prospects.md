# CRUD Prospects + API Routes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete CRUD API for prospects, activities, and notes — the foundation for all CRM business logic.

**Architecture:** Next.js App Router API routes, each protected by `requireAuth()`. Prisma ORM for DB access. Inline validation with allowlists. Vitest with mocked Prisma for unit tests.

**Tech Stack:** Next.js 16 (App Router), Prisma 7 (SQLite/LibSQL), TypeScript strict, Vitest

**Spec:** `docs/superpowers/specs/2026-04-04-crud-prospects-design.md`

---

### Task 1: Vitest Setup

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (add test script + vitest devDep)

- [ ] **Step 1: Install vitest**

Run:
```bash
npm install -D vitest
```

- [ ] **Step 2: Create vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
```

- [ ] **Step 3: Add test script to package.json**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run"
```

- [ ] **Step 4: Verify setup**

Run:
```bash
npm run test
```
Expected: Vitest runs, finds no tests, exits cleanly (no error).

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts package.json package-lock.json
git commit -m "chore: add vitest test setup"
```

---

### Task 2: Validation Helpers

**Files:**
- Create: `src/lib/validation.ts`

These helpers are shared across all prospect routes.

- [ ] **Step 1: Create validation helpers**

Create `src/lib/validation.ts`:

```typescript
export const STATUT_PIPELINE_VALUES = [
  "A_DEMARCHER",
  "CONTACTE",
  "RDV_PLANIFIE",
  "MAQUETTE_ENVOYEE",
  "RELANCE",
  "SIGNE",
  "PERDU",
] as const

export type StatutPipeline = (typeof STATUT_PIPELINE_VALUES)[number]

export function isValidStatutPipeline(value: unknown): value is StatutPipeline {
  return (
    typeof value === "string" &&
    STATUT_PIPELINE_VALUES.includes(value as StatutPipeline)
  )
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(value: unknown): boolean {
  return typeof value === "string" && EMAIL_REGEX.test(value)
}

export function isValidISODate(value: unknown): boolean {
  if (typeof value !== "string") return false
  const d = new Date(value)
  return !isNaN(d.getTime())
}

export function validateString(
  value: unknown,
  maxLength: number
): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (trimmed.length === 0 || trimmed.length > maxLength) return null
  return trimmed
}

export function validateOptionalString(
  value: unknown,
  maxLength: number
): string | null | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (trimmed.length > maxLength) return null
  return trimmed.length === 0 ? undefined : trimmed
}

/** Allowlisted fields for POST /api/prospects */
export const PROSPECT_CREATE_FIELDS = [
  "nom",
  "activite",
  "ville",
  "adresse",
  "telephone",
  "email",
  "siteUrl",
] as const

/** Allowlisted fields for PATCH /api/prospects/[id] */
export const PROSPECT_UPDATE_FIELDS = [
  "nom",
  "activite",
  "ville",
  "adresse",
  "telephone",
  "email",
  "siteUrl",
  "placeId",
  "noteGoogle",
  "nbAvisGoogle",
  "statutPipeline",
  "dateContact",
  "dateRdv",
  "dateMaquetteEnvoi",
  "dateSignature",
  "raisonPerte",
  "derniereRelance",
  "prochaineRelance",
] as const

export interface ProspectCreateErrors {
  nom?: string
  activite?: string
  ville?: string
  email?: string
  telephone?: string
  siteUrl?: string
  adresse?: string
}

export function validateProspectCreate(body: Record<string, unknown>): {
  data: Record<string, unknown> | null
  errors: ProspectCreateErrors | null
} {
  const errors: ProspectCreateErrors = {}

  const nom = validateString(body.nom, 100)
  if (!nom) errors.nom = "Nom requis (1-100 caractères)"

  const activite = validateString(body.activite, 100)
  if (!activite) errors.activite = "Activité requise (1-100 caractères)"

  const ville = validateString(body.ville, 100)
  if (!ville) errors.ville = "Ville requise (1-100 caractères)"

  // Optional fields
  const adresse = validateOptionalString(body.adresse, 200)
  if (adresse === null) errors.adresse = "Adresse invalide (max 200 caractères)"

  const telephone = validateOptionalString(body.telephone, 20)
  if (telephone === null)
    errors.telephone = "Téléphone invalide (max 20 caractères)"

  const email =
    body.email !== undefined && body.email !== null
      ? isValidEmail(body.email)
        ? (body.email as string)
        : null
      : undefined
  if (email === null) errors.email = "Email invalide"

  const siteUrl = validateOptionalString(body.siteUrl, 500)
  if (siteUrl === null)
    errors.siteUrl = "URL du site invalide (max 500 caractères)"

  if (Object.keys(errors).length > 0) {
    return { data: null, errors }
  }

  const data: Record<string, unknown> = { nom, activite, ville }
  if (adresse !== undefined) data.adresse = adresse
  if (telephone !== undefined) data.telephone = telephone
  if (email !== undefined) data.email = email
  if (siteUrl !== undefined) data.siteUrl = siteUrl

  return { data, errors: null }
}

export function validateProspectUpdate(body: Record<string, unknown>): {
  data: Record<string, unknown> | null
  errors: Record<string, string> | null
} {
  const errors: Record<string, string> = {}
  const data: Record<string, unknown> = {}

  for (const key of PROSPECT_UPDATE_FIELDS) {
    if (body[key] === undefined) continue

    switch (key) {
      case "nom":
      case "activite":
      case "ville": {
        const val = validateString(body[key], 100)
        if (!val) errors[key] = `${key} invalide (1-100 caractères)`
        else data[key] = val
        break
      }
      case "adresse": {
        const val = validateOptionalString(body[key], 200)
        if (val === null) errors[key] = "Adresse invalide (max 200 caractères)"
        else if (val !== undefined) data[key] = val
        break
      }
      case "telephone": {
        const val = validateOptionalString(body[key], 20)
        if (val === null)
          errors[key] = "Téléphone invalide (max 20 caractères)"
        else if (val !== undefined) data[key] = val
        break
      }
      case "email": {
        if (body[key] === null) {
          data[key] = null
          break
        }
        if (!isValidEmail(body[key])) errors[key] = "Email invalide"
        else data[key] = body[key]
        break
      }
      case "siteUrl":
      case "placeId": {
        const maxLen = key === "siteUrl" ? 500 : 200
        const val = validateOptionalString(body[key], maxLen)
        if (val === null) errors[key] = `${key} invalide`
        else if (val !== undefined) data[key] = val
        break
      }
      case "raisonPerte": {
        const val = validateOptionalString(body[key], 500)
        if (val === null)
          errors[key] = "Raison perte invalide (max 500 caractères)"
        else if (val !== undefined) data[key] = val
        break
      }
      case "noteGoogle": {
        const val = Number(body[key])
        if (isNaN(val)) errors[key] = "Note Google doit être un nombre"
        else data[key] = val
        break
      }
      case "nbAvisGoogle": {
        const val = Number(body[key])
        if (isNaN(val) || !Number.isInteger(val))
          errors[key] = "Nombre d'avis doit être un entier"
        else data[key] = val
        break
      }
      case "statutPipeline": {
        if (!isValidStatutPipeline(body[key]))
          errors[key] = `Statut invalide. Valeurs acceptées: ${STATUT_PIPELINE_VALUES.join(", ")}`
        else data[key] = body[key]
        break
      }
      case "dateContact":
      case "dateRdv":
      case "dateMaquetteEnvoi":
      case "dateSignature":
      case "derniereRelance":
      case "prochaineRelance": {
        if (body[key] === null) {
          data[key] = null
          break
        }
        if (!isValidISODate(body[key]))
          errors[key] = `${key} doit être une date ISO valide`
        else data[key] = new Date(body[key] as string)
        break
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return { data: null, errors }
  }

  if (Object.keys(data).length === 0) {
    return { data: null, errors: { _: "Aucun champ valide à modifier" } }
  }

  return { data, errors: null }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/validation.ts
git commit -m "feat: add prospect validation helpers and allowlists"
```

---

### Task 3: GET + POST /api/prospects

**Files:**
- Create: `src/app/api/prospects/route.ts`

- [ ] **Step 1: Create the route file**

Create `src/app/api/prospects/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { validateProspectCreate } from "@/lib/validation"
import { Prisma } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { searchParams } = request.nextUrl
    const search = searchParams.get("search")?.trim().toLowerCase()
    const statut = searchParams.get("statut")
    const scoreMinStr = searchParams.get("scoreMin")
    const sort = searchParams.get("sort") || "createdAt"
    const order = searchParams.get("order") || "desc"

    // Build Prisma where clause
    const where: Prisma.ProspectWhereInput = {}

    if (statut) {
      where.statutPipeline = statut
    }

    if (scoreMinStr) {
      const scoreMin = parseFloat(scoreMinStr)
      if (!isNaN(scoreMin)) {
        where.scoreGlobal = { gte: scoreMin }
      }
    }

    // Validate sort column
    const allowedSortFields = ["nom", "scoreGlobal", "createdAt"]
    const sortField = allowedSortFields.includes(sort) ? sort : "createdAt"
    const sortOrder = order === "asc" ? "asc" : "desc"

    let prospects = await prisma.prospect.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
    })

    // Search filter (case-insensitive, JS-side for SQLite compat)
    if (search) {
      prospects = prospects.filter(
        (p) =>
          p.nom.toLowerCase().includes(search) ||
          p.activite.toLowerCase().includes(search) ||
          p.ville.toLowerCase().includes(search)
      )
    }

    return NextResponse.json({ data: prospects })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const body = await request.json()
    const { data, errors } = validateProspectCreate(body)

    if (errors) {
      return NextResponse.json({ error: errors }, { status: 400 })
    }

    const prospect = await prisma.prospect.create({
      data: data as Prisma.ProspectCreateInput,
    })

    return NextResponse.json({ data: prospect }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Un prospect avec ce nom dans cette ville existe déjà" },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```
Expected: No errors related to `src/app/api/prospects/route.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/prospects/route.ts
git commit -m "feat: add GET + POST /api/prospects routes"
```

---

### Task 4: GET + PATCH + DELETE /api/prospects/[id]

**Files:**
- Create: `src/app/api/prospects/[id]/route.ts`

- [ ] **Step 1: Create the route file**

Create `src/app/api/prospects/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { validateProspectUpdate } from "@/lib/validation"
import { Prisma } from "@prisma/client"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()

    const { id } = await params

    const prospect = await prisma.prospect.findUnique({
      where: { id },
      include: {
        maquettes: true,
        analyses: true,
        emails: true,
        notes: { orderBy: { createdAt: "desc" } },
        activites: { orderBy: { createdAt: "desc" } },
      },
    })

    if (!prospect) {
      return NextResponse.json(
        { error: "Prospect non trouvé" },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: prospect })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()

    const { id } = await params
    const body = await request.json()
    const { data, errors } = validateProspectUpdate(body)

    if (errors) {
      return NextResponse.json({ error: errors }, { status: 400 })
    }

    // Check if prospect exists and get current statutPipeline
    const existing = await prisma.prospect.findUnique({
      where: { id },
      select: { statutPipeline: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Prospect non trouvé" },
        { status: 404 }
      )
    }

    const statutChanged =
      data!.statutPipeline &&
      data!.statutPipeline !== existing.statutPipeline

    if (statutChanged) {
      // Transaction: update prospect + create activity
      const [prospect] = await prisma.$transaction([
        prisma.prospect.update({
          where: { id },
          data: data as Prisma.ProspectUpdateInput,
        }),
        prisma.activite.create({
          data: {
            prospectId: id,
            type: "CHANGEMENT_STATUT",
            description: `Statut changé de ${existing.statutPipeline} vers ${data!.statutPipeline}`,
          },
        }),
      ])
      return NextResponse.json({ data: prospect })
    }

    const prospect = await prisma.prospect.update({
      where: { id },
      data: data as Prisma.ProspectUpdateInput,
    })

    return NextResponse.json({ data: prospect })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Un prospect avec ce nom dans cette ville existe déjà" },
        { status: 409 }
      )
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Prospect non trouvé" },
        { status: 404 }
      )
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()

    const { id } = await params

    await prisma.prospect.delete({ where: { id } })

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Prospect non trouvé" },
        { status: 404 }
      )
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```
Expected: No errors related to this file.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/prospects/[id]/route.ts
git commit -m "feat: add GET + PATCH + DELETE /api/prospects/[id] routes"
```

---

### Task 5: Activites Routes

**Files:**
- Create: `src/app/api/prospects/[id]/activites/route.ts`

- [ ] **Step 1: Create the route file**

Create `src/app/api/prospects/[id]/activites/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { validateString } from "@/lib/validation"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()

    const { id } = await params

    const prospect = await prisma.prospect.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!prospect) {
      return NextResponse.json(
        { error: "Prospect non trouvé" },
        { status: 404 }
      )
    }

    const activites = await prisma.activite.findMany({
      where: { prospectId: id },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ data: activites })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()

    const { id } = await params

    const prospect = await prisma.prospect.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!prospect) {
      return NextResponse.json(
        { error: "Prospect non trouvé" },
        { status: 404 }
      )
    }

    const body = await request.json()

    const description = validateString(body.description, 1000)
    if (!description) {
      return NextResponse.json(
        { error: "Description requise (1-1000 caractères)" },
        { status: 400 }
      )
    }

    const activite = await prisma.activite.create({
      data: {
        prospectId: id,
        type: "NOTE",
        description,
      },
    })

    return NextResponse.json({ data: activite }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/prospects/[id]/activites/route.ts
git commit -m "feat: add GET + POST /api/prospects/[id]/activites routes"
```

---

### Task 6: Notes Routes

**Files:**
- Create: `src/app/api/prospects/[id]/notes/route.ts`
- Create: `src/app/api/notes/[id]/route.ts`

- [ ] **Step 1: Create POST /api/prospects/[id]/notes**

Create `src/app/api/prospects/[id]/notes/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { validateString } from "@/lib/validation"

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()

    const { id } = await params

    const prospect = await prisma.prospect.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!prospect) {
      return NextResponse.json(
        { error: "Prospect non trouvé" },
        { status: 404 }
      )
    }

    const body = await request.json()

    const contenu = validateString(body.contenu, 5000)
    if (!contenu) {
      return NextResponse.json(
        { error: "Contenu requis (1-5000 caractères)" },
        { status: 400 }
      )
    }

    const note = await prisma.note.create({
      data: {
        prospectId: id,
        contenu,
      },
    })

    return NextResponse.json({ data: note }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create DELETE /api/notes/[id]**

Create `src/app/api/notes/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Prisma } from "@prisma/client"

type RouteParams = { params: Promise<{ id: string }> }

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()

    const { id } = await params

    await prisma.note.delete({ where: { id } })

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Note non trouvée" },
        { status: 404 }
      )
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/prospects/[id]/notes/route.ts src/app/api/notes/[id]/route.ts
git commit -m "feat: add notes routes (POST prospect notes + DELETE note)"
```

---

### Task 7: Unit Tests — POST Validation

**Files:**
- Create: `src/__tests__/api/prospects.test.ts`

- [ ] **Step 1: Create test file with POST validation tests**

Create `src/__tests__/api/prospects.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock requireAuth before importing routes
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(),
}))

// Mock Prisma
const mockPrismaProspect = {
  findMany: vi.fn(),
  create: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
}

vi.mock("@/lib/db", () => ({
  prisma: {
    prospect: mockPrismaProspect,
  },
}))

// Import after mocks
import { POST, GET } from "@/app/api/prospects/route"
import { NextRequest } from "next/server"

function makeRequest(
  url: string,
  options?: { method?: string; body?: Record<string, unknown> }
): NextRequest {
  const { method = "GET", body } = options ?? {}
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method,
    ...(body ? { body: JSON.stringify(body) } : {}),
    headers: body ? { "Content-Type": "application/json" } : {},
  })
}

describe("POST /api/prospects", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("creates a prospect with valid data", async () => {
    const prospectData = {
      id: "clx123",
      nom: "Boulangerie Dupont",
      activite: "Boulangerie",
      ville: "Lille",
      statutPipeline: "A_DEMARCHER",
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    mockPrismaProspect.create.mockResolvedValue(prospectData)

    const req = makeRequest("http://localhost:3000/api/prospects", {
      method: "POST",
      body: { nom: "Boulangerie Dupont", activite: "Boulangerie", ville: "Lille" },
    })

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.data.nom).toBe("Boulangerie Dupont")
    expect(mockPrismaProspect.create).toHaveBeenCalledWith({
      data: { nom: "Boulangerie Dupont", activite: "Boulangerie", ville: "Lille" },
    })
  })

  it("returns 400 when nom is missing", async () => {
    const req = makeRequest("http://localhost:3000/api/prospects", {
      method: "POST",
      body: { activite: "Boulangerie", ville: "Lille" },
    })

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error.nom).toBeDefined()
    expect(mockPrismaProspect.create).not.toHaveBeenCalled()
  })

  it("returns 400 when activite is missing", async () => {
    const req = makeRequest("http://localhost:3000/api/prospects", {
      method: "POST",
      body: { nom: "Test", ville: "Lille" },
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("returns 400 when ville is missing", async () => {
    const req = makeRequest("http://localhost:3000/api/prospects", {
      method: "POST",
      body: { nom: "Test", activite: "Boulangerie" },
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("returns 409 on duplicate nom+ville", async () => {
    const { Prisma } = await import("@prisma/client")
    mockPrismaProspect.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "7.0.0",
        meta: { target: ["nom", "ville"] },
      })
    )

    const req = makeRequest("http://localhost:3000/api/prospects", {
      method: "POST",
      body: { nom: "Boulangerie Dupont", activite: "Boulangerie", ville: "Lille" },
    })

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toContain("existe déjà")
  })
})
```

- [ ] **Step 2: Run tests to verify they pass**

Run:
```bash
npx vitest run src/__tests__/api/prospects.test.ts
```
Expected: All 5 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/api/prospects.test.ts
git commit -m "test: add POST /api/prospects validation tests"
```

---

### Task 8: Unit Tests — Allowlist

**Files:**
- Modify: `src/__tests__/api/prospects.test.ts`

- [ ] **Step 1: Add allowlist tests to the existing test file**

Append to `src/__tests__/api/prospects.test.ts`, inside the file but after the existing `describe` block:

```typescript
describe("POST /api/prospects — allowlist", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("ignores id, createdAt, scoreGlobal in POST body", async () => {
    mockPrismaProspect.create.mockResolvedValue({
      id: "clx123",
      nom: "Test",
      activite: "Test",
      ville: "Test",
    })

    const req = makeRequest("http://localhost:3000/api/prospects", {
      method: "POST",
      body: {
        nom: "Test",
        activite: "Test",
        ville: "Test",
        id: "HACKED",
        createdAt: "2020-01-01",
        scoreGlobal: 999,
        updatedAt: "2020-01-01",
      },
    })

    const res = await POST(req)
    expect(res.status).toBe(201)

    const createCall = mockPrismaProspect.create.mock.calls[0][0]
    expect(createCall.data.id).toBeUndefined()
    expect(createCall.data.createdAt).toBeUndefined()
    expect(createCall.data.scoreGlobal).toBeUndefined()
    expect(createCall.data.updatedAt).toBeUndefined()
  })
})
```

- [ ] **Step 2: Add PATCH allowlist test**

We need to import the PATCH route and add a test for it. Add to the same file:

```typescript
// Add this import at the top of the file, after existing imports:
import { PATCH } from "@/app/api/prospects/[id]/route"

// Mock $transaction for PATCH tests
const mockPrisma = {
  prospect: mockPrismaProspect,
  activite: { create: vi.fn() },
  $transaction: vi.fn(),
}

// Update the prisma mock to include $transaction:
// This requires updating the vi.mock block. Instead, add a new describe:

describe("PATCH /api/prospects/[id] — allowlist", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("ignores id, createdAt, scoreGlobal in PATCH body", async () => {
    mockPrismaProspect.findUnique.mockResolvedValue({
      id: "clx123",
      statutPipeline: "A_DEMARCHER",
    })
    mockPrismaProspect.update.mockResolvedValue({
      id: "clx123",
      nom: "Updated",
    })

    const req = makeRequest("http://localhost:3000/api/prospects/clx123", {
      method: "PATCH",
      body: {
        nom: "Updated",
        id: "HACKED",
        createdAt: "2020-01-01",
        scoreGlobal: 999,
      },
    })

    const params = Promise.resolve({ id: "clx123" })
    const res = await PATCH(req, { params })
    expect(res.status).toBe(200)

    const updateCall = mockPrismaProspect.update.mock.calls[0][0]
    expect(updateCall.data.id).toBeUndefined()
    expect(updateCall.data.createdAt).toBeUndefined()
    expect(updateCall.data.scoreGlobal).toBeUndefined()
  })
})
```

- [ ] **Step 3: Run tests**

Run:
```bash
npx vitest run src/__tests__/api/prospects.test.ts
```
Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/api/prospects.test.ts
git commit -m "test: add allowlist tests for POST and PATCH prospects"
```

---

### Task 9: Unit Tests — Search Filter

**Files:**
- Modify: `src/__tests__/api/prospects.test.ts`

- [ ] **Step 1: Add search filter tests**

Append to `src/__tests__/api/prospects.test.ts`:

```typescript
describe("GET /api/prospects — search filter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProspects = [
    {
      id: "1",
      nom: "Boulangerie Dupont",
      activite: "Boulangerie",
      ville: "Lille",
      statutPipeline: "A_DEMARCHER",
    },
    {
      id: "2",
      nom: "Garage Martin",
      activite: "Garage automobile",
      ville: "Roubaix",
      statutPipeline: "CONTACTE",
    },
    {
      id: "3",
      nom: "Salon Beauté",
      activite: "Coiffure",
      ville: "Tourcoing",
      statutPipeline: "A_DEMARCHER",
    },
  ]

  it("filters by nom with search=boulang", async () => {
    mockPrismaProspect.findMany.mockResolvedValue(mockProspects)

    const req = makeRequest(
      "http://localhost:3000/api/prospects?search=boulang"
    )

    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data).toHaveLength(1)
    expect(json.data[0].nom).toBe("Boulangerie Dupont")
  })

  it("filters by ville with search=lille (case insensitive)", async () => {
    mockPrismaProspect.findMany.mockResolvedValue(mockProspects)

    const req = makeRequest(
      "http://localhost:3000/api/prospects?search=lille"
    )

    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data).toHaveLength(1)
    expect(json.data[0].ville).toBe("Lille")
  })

  it("filters by activite with search=garage", async () => {
    mockPrismaProspect.findMany.mockResolvedValue(mockProspects)

    const req = makeRequest(
      "http://localhost:3000/api/prospects?search=garage"
    )

    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data).toHaveLength(1)
    expect(json.data[0].activite).toBe("Garage automobile")
  })

  it("returns empty array for no match", async () => {
    mockPrismaProspect.findMany.mockResolvedValue(mockProspects)

    const req = makeRequest(
      "http://localhost:3000/api/prospects?search=xyz"
    )

    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run all tests**

Run:
```bash
npx vitest run src/__tests__/api/prospects.test.ts
```
Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/api/prospects.test.ts
git commit -m "test: add search filter tests for GET /api/prospects"
```

---

### Task 10: TypeScript Check + Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Full TypeScript check**

Run:
```bash
npx tsc --noEmit --pretty
```
Expected: No errors.

- [ ] **Step 2: Run all tests**

Run:
```bash
npm run test
```
Expected: All tests PASS.

- [ ] **Step 3: Run linter**

Run:
```bash
npm run lint
```
Expected: No errors.

- [ ] **Step 4: Final commit if any fixes were needed**

If any fixes were made during verification:
```bash
git add -A
git commit -m "fix: resolve TypeScript/lint issues in prospects API"
```
