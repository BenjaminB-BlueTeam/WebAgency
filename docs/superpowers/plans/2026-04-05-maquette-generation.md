# Maquette Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implémenter la génération de maquettes multi-pages (Google Stitch + Netlify) déclenchée depuis l'onglet Maquette de la fiche prospect.

**Architecture:** `buildStitchPrompt` → Claude construit un prompt de design. `generateMaquette` → Stitch SDK génère 4 écrans HTML. `deployToNetlify` → déploiement multi-pages via Netlify File Digest API. Route POST orchestre tout ; UI remplace le PlaceholderTab existant.

**Tech Stack:** `@google/stitch-sdk` (v0.1.0), Netlify File Digest API, Anthropic SDK (via `analyzeWithClaude`), Next.js App Router, Vitest, Framer Motion.

---

## File Map

| Statut | Fichier | Rôle |
|--------|---------|------|
| Créer | `src/lib/stitch/buildPrompt.ts` | Claude construit le prompt Stitch |
| Créer | `src/lib/stitch.ts` | Wrapper SDK : createProject + 4×generate + fetch HTML |
| Créer | `src/lib/netlify-deploy.ts` | Deploy multi-pages via Netlify API |
| Créer | `src/app/api/maquettes/generate/route.ts` | POST : orchestration complète |
| Créer | `src/app/api/maquettes/[id]/route.ts` | GET : détail maquette |
| Créer | `src/app/api/maquettes/[id]/preview/route.ts` | GET : redirect vers demoUrl |
| Créer | `src/components/prospects/prospect-maquette-tab.tsx` | UI onglet Maquette |
| Créer | `src/__tests__/lib/stitch-build-prompt.test.ts` | Tests buildStitchPrompt |
| Créer | `src/__tests__/lib/stitch.test.ts` | Tests generateMaquette |
| Créer | `src/__tests__/lib/netlify-deploy.test.ts` | Tests slugify, injectNav, deployToNetlify |
| Créer | `src/__tests__/api/maquettes-generate.test.ts` | Tests route POST generate |
| Modifier | `src/components/prospects/prospect-detail.tsx` | Brancher ProspectMaquetteTab |

---

## Task 1 — Installer @google/stitch-sdk

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Installer le SDK**

```bash
npm install @google/stitch-sdk
```

Expected output: `added N packages`

- [ ] **Step 2: Vérifier l'installation**

```bash
npm list @google/stitch-sdk
```

Expected: `@google/stitch-sdk@0.1.0`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @google/stitch-sdk"
```

---

## Task 2 — lib/stitch/buildPrompt.ts (TDD)

**Files:**
- Create: `src/lib/stitch/buildPrompt.ts`
- Test: `src/__tests__/lib/stitch-build-prompt.test.ts`

- [ ] **Step 1: Écrire les tests**

```typescript
// src/__tests__/lib/stitch-build-prompt.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/anthropic", () => ({
  analyzeWithClaude: vi.fn().mockResolvedValue("Prompt de design généré"),
}))

import { buildStitchPrompt } from "@/lib/stitch/buildPrompt"
import { analyzeWithClaude } from "@/lib/anthropic"

const mockClaude = analyzeWithClaude as ReturnType<typeof vi.fn>

describe("buildStitchPrompt", () => {
  beforeEach(() => vi.clearAllMocks())

  it("includes prospect nom, activite, ville in user prompt", async () => {
    await buildStitchPrompt({ nom: "Plomberie Martin", activite: "Plombier", ville: "Steenvoorde" })
    const userPrompt = mockClaude.mock.calls[0][1]
    expect(userPrompt).toContain("Plomberie Martin")
    expect(userPrompt).toContain("Plombier")
    expect(userPrompt).toContain("Steenvoorde")
  })

  it("includes telephone when provided", async () => {
    await buildStitchPrompt({ nom: "T", activite: "X", ville: "Y", telephone: "0320001122" })
    const userPrompt = mockClaude.mock.calls[0][1]
    expect(userPrompt).toContain("0320001122")
  })

  it("mentions no website when siteUrl is null", async () => {
    await buildStitchPrompt({ nom: "T", activite: "X", ville: "Y", siteUrl: null })
    const userPrompt = mockClaude.mock.calls[0][1]
    expect(userPrompt).toContain("Pas de site web")
  })

  it("includes recommandations from analyse when provided", async () => {
    const analyse = { recommandations: JSON.stringify([{ axe: "SEO", conseil: "Améliorer les balises" }]) }
    await buildStitchPrompt({ nom: "T", activite: "X", ville: "Y" }, analyse)
    const userPrompt = mockClaude.mock.calls[0][1]
    expect(userPrompt).toContain("Recommandations")
  })

  it("returns the Claude response", async () => {
    const result = await buildStitchPrompt({ nom: "T", activite: "X", ville: "Y" })
    expect(result).toBe("Prompt de design généré")
  })
})
```

- [ ] **Step 2: Vérifier que les tests échouent**

```bash
npx vitest run src/__tests__/lib/stitch-build-prompt.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/stitch/buildPrompt'`

- [ ] **Step 3: Implémenter buildPrompt.ts**

```typescript
// src/lib/stitch/buildPrompt.ts
import { analyzeWithClaude } from "@/lib/anthropic"

const SYSTEM_PROMPT =
  "Tu es un expert en design de sites vitrines pour artisans et petites entreprises locales en Flandre Intérieure. " +
  "Tu génères des prompts de design UI pour Google Stitch. " +
  "Règles : style professionnel mais chaleureux (jamais startup tech), mobile-first, textes en français, " +
  "palette cohérente avec le métier, intégrer nom/téléphone/ville. " +
  "Réponds uniquement avec le prompt de design, sans commentaires ni explications."

interface ProspectInput {
  nom: string
  activite: string
  ville: string
  telephone?: string | null
  siteUrl?: string | null
}

interface AnalyseInput {
  recommandations: string
}

export async function buildStitchPrompt(
  prospect: ProspectInput,
  analyse?: AnalyseInput | null
): Promise<string> {
  const parts: string[] = [
    `Entreprise : ${prospect.nom}`,
    `Activité : ${prospect.activite}`,
    `Ville : ${prospect.ville}`,
  ]
  if (prospect.telephone) parts.push(`Téléphone : ${prospect.telephone}`)
  parts.push(prospect.siteUrl ? `Site actuel : ${prospect.siteUrl}` : "Pas de site web actuellement")

  if (analyse) {
    try {
      const reco = JSON.parse(analyse.recommandations)
      parts.push(`\nRecommandations : ${JSON.stringify(reco)}`)
    } catch {
      // ignore malformed JSON
    }
  }

  return analyzeWithClaude(SYSTEM_PROMPT, parts.join("\n"))
}
```

- [ ] **Step 4: Vérifier que les tests passent**

```bash
npx vitest run src/__tests__/lib/stitch-build-prompt.test.ts
```

Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/stitch/buildPrompt.ts src/__tests__/lib/stitch-build-prompt.test.ts
git commit -m "feat: add buildStitchPrompt with Claude"
```

---

## Task 3 — lib/stitch.ts (TDD)

**Files:**
- Create: `src/lib/stitch.ts`
- Test: `src/__tests__/lib/stitch.test.ts`

- [ ] **Step 1: Écrire les tests**

```typescript
// src/__tests__/lib/stitch.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"

const mockGetHtml = vi.fn().mockResolvedValue("https://stitch.example.com/screen.html")
const mockGenerate = vi.fn()
const mockProject = { id: "proj-123", generate: mockGenerate }
const mockCreateProject = vi.fn().mockResolvedValue(mockProject)

vi.mock("@google/stitch-sdk", () => ({
  Stitch: vi.fn().mockImplementation(() => ({ createProject: mockCreateProject })),
}))

vi.mock("@/lib/stitch/buildPrompt", () => ({
  buildStitchPrompt: vi.fn().mockResolvedValue("Design professionnel pour plombier"),
}))

global.fetch = vi.fn().mockResolvedValue({
  text: () => Promise.resolve("<html><body>Screen HTML</body></html>"),
  ok: true,
} as unknown as Response)

import { generateMaquette } from "@/lib/stitch"

const prospect = { nom: "Plomberie Martin", activite: "Plombier", ville: "Steenvoorde" }

describe("generateMaquette", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGenerate.mockResolvedValue({ getHtml: mockGetHtml })
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      text: () => Promise.resolve("<html><body>Screen HTML</body></html>"),
      ok: true,
    })
  })

  it("creates a Stitch project with the prospect name", async () => {
    await generateMaquette(prospect)
    expect(mockCreateProject).toHaveBeenCalledWith("Plomberie Martin")
  })

  it("generates exactly 4 screens", async () => {
    await generateMaquette(prospect)
    expect(mockGenerate).toHaveBeenCalledTimes(4)
  })

  it("returns screens named accueil, services, contact, a-propos", async () => {
    const result = await generateMaquette(prospect)
    expect(result.screens.map((s) => s.name)).toEqual(["accueil", "services", "contact", "a-propos"])
  })

  it("fetches HTML from the URL returned by getHtml()", async () => {
    await generateMaquette(prospect)
    expect(global.fetch).toHaveBeenCalledWith("https://stitch.example.com/screen.html")
  })

  it("returns projectId and promptUsed", async () => {
    const result = await generateMaquette(prospect)
    expect(result.projectId).toBe("proj-123")
    expect(result.promptUsed).toBe("Design professionnel pour plombier")
  })

  it("generates each screen with MOBILE device type", async () => {
    await generateMaquette(prospect)
    for (const call of mockGenerate.mock.calls) {
      expect(call[1]).toBe("MOBILE")
    }
  })
})
```

- [ ] **Step 2: Vérifier que les tests échouent**

```bash
npx vitest run src/__tests__/lib/stitch.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/stitch'`

- [ ] **Step 3: Implémenter stitch.ts**

```typescript
// src/lib/stitch.ts
import { Stitch } from "@google/stitch-sdk"
import { buildStitchPrompt } from "./stitch/buildPrompt"

const stitchClient = new Stitch()

const SCREENS = [
  { name: "accueil", suffix: "Page d'accueil avec hero, accroche principale et CTA contact" },
  { name: "services", suffix: "Page listant les prestations et services proposés" },
  { name: "contact", suffix: "Page contact avec formulaire de contact, téléphone et adresse" },
  { name: "a-propos", suffix: "Page à propos présentant l'entreprise, ses valeurs et zone géographique" },
] as const

export type MaquetteScreen = { name: string; html: string }

export type MaquetteResult = {
  projectId: string
  screens: MaquetteScreen[]
  promptUsed: string
}

interface ProspectInput {
  nom: string
  activite: string
  ville: string
  telephone?: string | null
  siteUrl?: string | null
}

interface AnalyseInput {
  recommandations: string
}

export async function generateMaquette(
  prospect: ProspectInput,
  analyse?: AnalyseInput | null
): Promise<MaquetteResult> {
  const project = await stitchClient.createProject(prospect.nom)
  const basePrompt = await buildStitchPrompt(prospect, analyse)

  const screens: MaquetteScreen[] = []
  for (const screen of SCREENS) {
    const prompt = `${basePrompt}\n\n${screen.suffix}`
    const generated = await project.generate(prompt, "MOBILE")
    const htmlUrl = await generated.getHtml()
    const response = await fetch(htmlUrl)
    const html = await response.text()
    screens.push({ name: screen.name, html })
  }

  return { projectId: project.id, screens, promptUsed: basePrompt }
}
```

- [ ] **Step 4: Vérifier que les tests passent**

```bash
npx vitest run src/__tests__/lib/stitch.test.ts
```

Expected: 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/stitch.ts src/__tests__/lib/stitch.test.ts
git commit -m "feat: add generateMaquette with Stitch SDK"
```

---

## Task 4 — lib/netlify-deploy.ts (TDD)

**Files:**
- Create: `src/lib/netlify-deploy.ts`
- Test: `src/__tests__/lib/netlify-deploy.test.ts`

- [ ] **Step 1: Écrire les tests**

```typescript
// src/__tests__/lib/netlify-deploy.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { slugify, injectNav, deployToNetlify } from "@/lib/netlify-deploy"

describe("slugify", () => {
  it("lowercases and removes accents", () => {
    expect(slugify("Plomberie Généreux")).toBe("plomberie-genereux")
  })

  it("replaces spaces and special chars with hyphens", () => {
    expect(slugify("Jean & Martin SARL")).toBe("jean-martin-sarl")
  })

  it("truncates to 63 chars", () => {
    expect(slugify("a".repeat(100))).toHaveLength(63)
  })

  it("removes leading and trailing hyphens", () => {
    expect(slugify("---test---")).toBe("test")
  })
})

describe("injectNav", () => {
  it("injects nav before </body>", () => {
    const result = injectNav("<html><body><h1>Hello</h1></body></html>", "accueil")
    expect(result).toContain("<nav")
    expect(result.indexOf("<nav")).toBeLessThan(result.indexOf("</body>"))
  })

  it("highlights the current page link in white (#ffffff)", () => {
    const result = injectNav("<body></body>", "services")
    expect(result).toMatch(/href="services\.html"[^>]*#ffffff/)
  })

  it("shows other pages in grey (#737373)", () => {
    const result = injectNav("<body></body>", "accueil")
    expect(result).toMatch(/href="services\.html"[^>]*#737373/)
  })

  it("appends nav even when no </body> tag", () => {
    const result = injectNav("<div>content</div>", "accueil")
    expect(result).toContain("<nav")
  })

  it("includes links to all 4 pages", () => {
    const result = injectNav("<body></body>", "accueil")
    expect(result).toContain("index.html")
    expect(result).toContain("services.html")
    expect(result).toContain("contact.html")
    expect(result).toContain("a-propos.html")
  })
})

describe("deployToNetlify", () => {
  const screens = [
    { name: "accueil", html: "<html><body>Accueil</body></html>" },
    { name: "services", html: "<html><body>Services</body></html>" },
    { name: "contact", html: "<html><body>Contact</body></html>" },
    { name: "a-propos", html: "<html><body>A propos</body></html>" },
  ]

  beforeEach(() => {
    process.env.NETLIFY_TOKEN = "test-token"
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: "site-abc" }),
        text: () => Promise.resolve(""),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: "deploy-xyz" }),
        text: () => Promise.resolve(""),
      })
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(""),
      })
  })

  it("creates a Netlify site with slugified name", async () => {
    await deployToNetlify(screens, "Plomberie Martin", "Steenvoorde")
    const firstCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(firstCall[0]).toContain("/sites")
    expect(JSON.parse(firstCall[1].body).name).toBe("fwa-plomberie-martin-steenvoorde")
  })

  it("uploads exactly 4 files", async () => {
    await deployToNetlify(screens, "Martin", "Lille")
    const allCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls
    // call 0: POST /sites, call 1: POST /deploys, calls 2-5: PUT files
    const putCalls = allCalls.slice(2)
    expect(putCalls).toHaveLength(4)
  })

  it("returns url built from site name and siteId", async () => {
    const result = await deployToNetlify(screens, "Plomberie Martin", "Steenvoorde")
    expect(result.url).toBe("https://fwa-plomberie-martin-steenvoorde.netlify.app")
    expect(result.siteId).toBe("site-abc")
  })

  it("reuses existing siteId when provided (skips site creation)", async () => {
    // Reset mock: first call is now the deploy (not site creation)
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: "deploy-xyz" }),
        text: () => Promise.resolve(""),
      })
      .mockResolvedValue({ ok: true, json: () => Promise.resolve({}), text: () => Promise.resolve("") })

    const result = await deployToNetlify(screens, "Martin", "Lille", "existing-site-id")
    expect(result.siteId).toBe("existing-site-id")
    // Only 1 + 4 = 5 calls (no POST /sites)
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(5)
  })
})
```

- [ ] **Step 2: Vérifier que les tests échouent**

```bash
npx vitest run src/__tests__/lib/netlify-deploy.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/netlify-deploy'`

- [ ] **Step 3: Implémenter netlify-deploy.ts**

```typescript
// src/lib/netlify-deploy.ts
import { createHash } from "crypto"

const NETLIFY_API = "https://api.netlify.com/api/v1"

export type DeployResult = { url: string; siteId: string }

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63)
}

export function injectNav(html: string, currentPage: string): string {
  const pages = [
    { name: "accueil", file: "index.html", label: "Accueil" },
    { name: "services", file: "services.html", label: "Services" },
    { name: "contact", file: "contact.html", label: "Contact" },
    { name: "a-propos", file: "a-propos.html", label: "À propos" },
  ]
  const links = pages
    .map(
      (p) =>
        `<a href="${p.file}" style="color:${p.name === currentPage ? "#ffffff" : "#737373"};text-decoration:none;font-family:system-ui,sans-serif;font-size:14px;">${p.label}</a>`
    )
    .join("")
  const nav =
    `<nav style="position:fixed;top:0;left:0;right:0;background:#000;padding:12px 16px;display:flex;gap:16px;z-index:9999;border-bottom:1px solid #1a1a1a;">${links}</nav>` +
    `<div style="height:48px;"></div>`

  if (html.includes("</body>")) {
    return html.replace("</body>", `${nav}\n</body>`)
  }
  return html + nav
}

async function netlifyRequest(path: string, options: RequestInit): Promise<unknown> {
  const res = await fetch(`${NETLIFY_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.NETLIFY_TOKEN}`,
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Netlify ${path}: ${res.status} ${body}`)
  }
  return res.json()
}

const NAME_TO_FILE: Record<string, string> = {
  accueil: "index.html",
  services: "services.html",
  contact: "contact.html",
  "a-propos": "a-propos.html",
}

export async function deployToNetlify(
  screens: { name: string; html: string }[],
  prospectName: string,
  ville: string,
  existingSiteId?: string | null
): Promise<DeployResult> {
  const siteName = `fwa-${slugify(`${prospectName}-${ville}`)}`

  // Build file map with nav injected
  const fileMap: Record<string, string> = {}
  for (const screen of screens) {
    fileMap[`/${NAME_TO_FILE[screen.name]}`] = injectNav(screen.html, screen.name)
  }

  // Get or create site
  const siteId =
    existingSiteId ??
    ((await netlifyRequest("/sites", {
      method: "POST",
      body: JSON.stringify({ name: siteName }),
    })) as { id: string }).id

  // Compute SHA1 digests
  const digests: Record<string, string> = {}
  for (const [path, content] of Object.entries(fileMap)) {
    digests[path] = createHash("sha1").update(content).digest("hex")
  }

  // Create deploy
  const deploy = (await netlifyRequest(`/sites/${siteId}/deploys`, {
    method: "POST",
    body: JSON.stringify({ files: digests }),
  })) as { id: string }

  // Upload files
  for (const [path, content] of Object.entries(fileMap)) {
    await fetch(`${NETLIFY_API}/deploys/${deploy.id}/files${path}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${process.env.NETLIFY_TOKEN}`,
        "Content-Type": "application/octet-stream",
      },
      body: content,
    })
  }

  return { url: `https://${siteName}.netlify.app`, siteId }
}
```

- [ ] **Step 4: Vérifier que les tests passent**

```bash
npx vitest run src/__tests__/lib/netlify-deploy.test.ts
```

Expected: 9 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/netlify-deploy.ts src/__tests__/lib/netlify-deploy.test.ts
git commit -m "feat: add deployToNetlify with multi-page Netlify File Digest API"
```

---

## Task 5 — POST /api/maquettes/generate (TDD)

**Files:**
- Create: `src/app/api/maquettes/generate/route.ts`
- Test: `src/__tests__/api/maquettes-generate.test.ts`

- [ ] **Step 1: Écrire les tests**

```typescript
// src/__tests__/api/maquettes-generate.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/db", () => ({
  prisma: {
    prospect: { findUnique: vi.fn() },
    maquette: { create: vi.fn() },
    activite: { create: vi.fn() },
  },
}))
vi.mock("@/lib/stitch", () => ({
  generateMaquette: vi.fn().mockResolvedValue({
    screens: [
      { name: "accueil", html: "<html>accueil</html>" },
      { name: "services", html: "<html>services</html>" },
      { name: "contact", html: "<html>contact</html>" },
      { name: "a-propos", html: "<html>a-propos</html>" },
    ],
    projectId: "proj-123",
    promptUsed: "Design plombier",
  }),
}))
vi.mock("@/lib/netlify-deploy", () => ({
  deployToNetlify: vi.fn().mockResolvedValue({
    url: "https://fwa-test.netlify.app",
    siteId: "site-abc",
  }),
}))

import { POST } from "@/app/api/maquettes/generate/route"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

const baseMockProspect = {
  id: "prospect-1",
  nom: "Plomberie Martin",
  activite: "Plombier",
  ville: "Steenvoorde",
  telephone: null,
  siteUrl: null,
  maquettes: [],
  analyses: [],
}

function makeRequest(body: object) {
  return new NextRequest("http://localhost/api/maquettes/generate", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

describe("POST /api/maquettes/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(prisma.prospect.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(baseMockProspect)
    ;(prisma.maquette.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "maq-1",
      demoUrl: "https://fwa-test.netlify.app",
      version: 1,
    })
    ;(prisma.activite.create as ReturnType<typeof vi.fn>).mockResolvedValue({})
  })

  it("returns 400 if prospectId is missing", async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
  })

  it("returns 400 if prospectId is not a string", async () => {
    const res = await POST(makeRequest({ prospectId: 123 }))
    expect(res.status).toBe(400)
  })

  it("returns 401 if not authenticated", async () => {
    ;(requireAuth as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Unauthorized"))
    const res = await POST(makeRequest({ prospectId: "prospect-1" }))
    expect(res.status).toBe(401)
  })

  it("returns 404 if prospect not found", async () => {
    ;(prisma.prospect.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    const res = await POST(makeRequest({ prospectId: "unknown" }))
    expect(res.status).toBe(404)
  })

  it("returns 409 if 3 maquettes already exist", async () => {
    ;(prisma.prospect.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseMockProspect,
      maquettes: [{ id: "1" }, { id: "2" }, { id: "3" }],
    })
    const res = await POST(makeRequest({ prospectId: "prospect-1" }))
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toContain("maximum")
  })

  it("returns 200 with id, demoUrl, version on success", async () => {
    const res = await POST(makeRequest({ prospectId: "prospect-1" }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.demoUrl).toBe("https://fwa-test.netlify.app")
    expect(json.data.version).toBe(1)
    expect(json.data.id).toBeDefined()
  })

  it("creates an activite with type MAQUETTE", async () => {
    await POST(makeRequest({ prospectId: "prospect-1" }))
    expect(prisma.activite.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "MAQUETTE", prospectId: "prospect-1" }),
      })
    )
  })

  it("saves maquette with statut BROUILLON", async () => {
    await POST(makeRequest({ prospectId: "prospect-1" }))
    expect(prisma.maquette.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ statut: "BROUILLON", prospectId: "prospect-1" }),
      })
    )
  })

  it("passes existingSiteId to deployToNetlify when prospect has a previous maquette", async () => {
    const { deployToNetlify } = await import("@/lib/netlify-deploy")
    ;(prisma.prospect.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseMockProspect,
      maquettes: [{ id: "m1", netlifySiteId: "site-existing" }],
    })
    await POST(makeRequest({ prospectId: "prospect-1" }))
    expect(deployToNetlify).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      "site-existing"
    )
  })
})
```

- [ ] **Step 2: Vérifier que les tests échouent**

```bash
npx vitest run src/__tests__/api/maquettes-generate.test.ts
```

Expected: FAIL — `Cannot find module '@/app/api/maquettes/generate/route'`

- [ ] **Step 3: Implémenter la route**

```typescript
// src/app/api/maquettes/generate/route.ts
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { generateMaquette } from "@/lib/stitch"
import { deployToNetlify } from "@/lib/netlify-deploy"

export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const body = await request.json()
    const { prospectId } = body

    if (!prospectId || typeof prospectId !== "string" || prospectId.length > 50) {
      return NextResponse.json({ error: "prospectId invalide" }, { status: 400 })
    }

    const prospect = await prisma.prospect.findUnique({
      where: { id: prospectId },
      include: {
        maquettes: { orderBy: { createdAt: "asc" } },
        analyses: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    })

    if (!prospect) {
      return NextResponse.json({ error: "Prospect introuvable" }, { status: 404 })
    }

    if (prospect.maquettes.length >= 3) {
      return NextResponse.json(
        { error: "Nombre maximum de maquettes atteint" },
        { status: 409 }
      )
    }

    const lastAnalyse = prospect.analyses[0] ?? null
    const lastMaquette = prospect.maquettes[prospect.maquettes.length - 1] ?? null

    const { screens, promptUsed } = await generateMaquette(prospect, lastAnalyse)
    const { url, siteId } = await deployToNetlify(
      screens,
      prospect.nom,
      prospect.ville,
      lastMaquette?.netlifySiteId ?? null
    )

    const version = prospect.maquettes.length + 1

    const maquette = await prisma.maquette.create({
      data: {
        prospectId,
        html: JSON.stringify(screens),
        demoUrl: url,
        netlifySiteId: siteId,
        version,
        promptUsed,
        statut: "BROUILLON",
      },
    })

    await prisma.activite.create({
      data: {
        prospectId,
        type: "MAQUETTE",
        description: `Maquette v${version} générée`,
      },
    })

    return NextResponse.json({ data: { id: maquette.id, demoUrl: url, version } })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
```

- [ ] **Step 4: Vérifier que les tests passent**

```bash
npx vitest run src/__tests__/api/maquettes-generate.test.ts
```

Expected: 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/maquettes/generate/route.ts src/__tests__/api/maquettes-generate.test.ts
git commit -m "feat: add POST /api/maquettes/generate route"
```

---

## Task 6 — GET /api/maquettes/[id] et preview

**Files:**
- Create: `src/app/api/maquettes/[id]/route.ts`
- Create: `src/app/api/maquettes/[id]/preview/route.ts`

- [ ] **Step 1: Implémenter GET /api/maquettes/[id]**

```typescript
// src/app/api/maquettes/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id } = await params
    const maquette = await prisma.maquette.findUnique({
      where: { id },
      select: {
        id: true,
        demoUrl: true,
        version: true,
        statut: true,
        promptUsed: true,
        createdAt: true,
      },
    })
    if (!maquette) {
      return NextResponse.json({ error: "Maquette introuvable" }, { status: 404 })
    }
    return NextResponse.json({ data: maquette })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
```

- [ ] **Step 2: Implémenter GET /api/maquettes/[id]/preview**

```typescript
// src/app/api/maquettes/[id]/preview/route.ts
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id } = await params
    const maquette = await prisma.maquette.findUnique({
      where: { id },
      select: { demoUrl: true },
    })
    if (!maquette?.demoUrl) {
      return NextResponse.json({ error: "Maquette introuvable" }, { status: 404 })
    }
    return NextResponse.redirect(maquette.demoUrl)
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
```

- [ ] **Step 3: Build check**

```bash
npm run build
```

Expected: 0 erreurs TypeScript

- [ ] **Step 4: Commit**

```bash
git add src/app/api/maquettes/
git commit -m "feat: add GET /api/maquettes/[id] and preview routes"
```

---

## Task 7 — ProspectMaquetteTab UI

**Files:**
- Create: `src/components/prospects/prospect-maquette-tab.tsx`

- [ ] **Step 1: Créer le composant**

```typescript
// src/components/prospects/prospect-maquette-tab.tsx
"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import { fadeInUp } from "@/lib/animations"

interface Maquette {
  id: string
  demoUrl: string | null
  version: number
  statut: string
  createdAt: string
}

interface Props {
  prospect: { id: string; maquettes: Maquette[] }
}

const STATUT_COLORS: Record<string, string> = {
  BROUILLON: "#737373",
  ENVOYEE: "#60a5fa",
  VALIDEE: "#4ade80",
  REJETEE: "#f87171",
}

export function ProspectMaquetteTab({ prospect }: Props) {
  const router = useRouter()
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const maquettes = [...prospect.maquettes].sort((a, b) => a.version - b.version)
  const selected = maquettes[selectedIndex] ?? null

  async function handleGenerate() {
    setGenerating(true)
    setError(null)

    timeoutRef.current = setTimeout(() => {
      setGenerating(false)
      setError("La génération a pris trop de temps. Réessaie dans quelques instants.")
    }, 5 * 60 * 1000)

    try {
      const res = await fetch("/api/maquettes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectId: prospect.id }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "Erreur lors de la génération")
        return
      }
      setSelectedIndex(maquettes.length)
      router.refresh()
    } catch {
      setError("Erreur réseau. Réessaie.")
    } finally {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      setGenerating(false)
    }
  }

  function handleCopyUrl() {
    if (!selected?.demoUrl) return
    navigator.clipboard.writeText(selected.demoUrl)
  }

  if (generating) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          padding: "48px 16px",
        }}
      >
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div
          style={{
            width: 32,
            height: 32,
            border: "2px solid #1a1a1a",
            borderTopColor: "#fff",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <p style={{ color: "#737373", fontSize: 14, margin: 0 }}>
          Génération en cours… (jusqu&apos;à 2 min)
        </p>
      </div>
    )
  }

  if (maquettes.length === 0) {
    return (
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          padding: "48px 16px",
        }}
      >
        <p style={{ color: "#737373", fontSize: 14, margin: 0 }}>Aucune maquette générée</p>
        {error && <p style={{ color: "#f87171", fontSize: 13, margin: 0 }}>{error}</p>}
        <button
          onClick={handleGenerate}
          style={{
            background: "#ffffff",
            color: "#000000",
            border: "none",
            borderRadius: 6,
            padding: "10px 20px",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Générer une maquette
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {maquettes.length > 1 && (
          <div style={{ display: "flex", gap: 4 }}>
            {maquettes.map((m, i) => (
              <button
                key={m.id}
                onClick={() => setSelectedIndex(i)}
                style={{
                  background: i === selectedIndex ? "#ffffff" : "#0a0a0a",
                  color: i === selectedIndex ? "#000000" : "#737373",
                  border: "1px solid #1a1a1a",
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                v{m.version}
              </button>
            ))}
          </div>
        )}
        {selected && (
          <span
            style={{
              background: "#0a0a0a",
              color: STATUT_COLORS[selected.statut] ?? "#737373",
              border: "1px solid #1a1a1a",
              borderRadius: 9999,
              padding: "2px 10px",
              fontSize: 12,
            }}
          >
            {selected.statut}
          </span>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {selected?.demoUrl && (
            <>
              <button
                onClick={() => window.open(selected.demoUrl!, "_blank")}
                style={{
                  background: "#0a0a0a",
                  color: "#fafafa",
                  border: "1px solid #1a1a1a",
                  borderRadius: 6,
                  padding: "6px 12px",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Plein écran
              </button>
              <button
                onClick={handleCopyUrl}
                style={{
                  background: "#0a0a0a",
                  color: "#fafafa",
                  border: "1px solid #1a1a1a",
                  borderRadius: 6,
                  padding: "6px 12px",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Copier l&apos;URL
              </button>
            </>
          )}
          {maquettes.length < 3 && (
            <button
              onClick={handleGenerate}
              style={{
                background: "#0a0a0a",
                color: "#fafafa",
                border: "1px solid #1a1a1a",
                borderRadius: 6,
                padding: "6px 12px",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Régénérer
            </button>
          )}
        </div>
      </div>

      {error && <p style={{ color: "#f87171", fontSize: 13, margin: 0 }}>{error}</p>}

      {/* Preview iframe */}
      {selected?.demoUrl ? (
        <iframe
          src={selected.demoUrl}
          sandbox="allow-scripts allow-same-origin"
          style={{
            width: "100%",
            height: 600,
            border: "1px solid #1a1a1a",
            borderRadius: 6,
            background: "#0a0a0a",
          }}
          title={`Maquette v${selected.version}`}
        />
      ) : (
        <div
          style={{
            height: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid #1a1a1a",
            borderRadius: 6,
          }}
        >
          <p style={{ color: "#555555", fontSize: 14 }}>Aperçu non disponible</p>
        </div>
      )}
    </motion.div>
  )
}
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: 0 erreurs TypeScript

- [ ] **Step 3: Commit**

```bash
git add src/components/prospects/prospect-maquette-tab.tsx
git commit -m "feat: add ProspectMaquetteTab component"
```

---

## Task 8 — Brancher ProspectMaquetteTab dans prospect-detail.tsx

**Files:**
- Modify: `src/components/prospects/prospect-detail.tsx`

- [ ] **Step 1: Lire le fichier actuel**

Lire `src/components/prospects/prospect-detail.tsx` pour localiser le `PlaceholderTab` de l'onglet maquette.

- [ ] **Step 2: Ajouter l'import**

En haut du fichier, après les imports existants, ajouter :

```typescript
import { ProspectMaquetteTab } from "@/components/prospects/prospect-maquette-tab"
```

- [ ] **Step 3: Remplacer le PlaceholderTab maquette**

Localiser ce bloc dans `prospect-detail.tsx` :

```typescript
{activeTab === "maquette" && (
  <PlaceholderTab
    title="Aucune maquette générée"
    buttonLabel="Générer une maquette"
  />
)}
```

Le remplacer par :

```typescript
{activeTab === "maquette" && (
  <ProspectMaquetteTab prospect={prospect} />
)}
```

- [ ] **Step 4: Vérifier le build**

```bash
npm run build
```

Expected: 0 erreurs TypeScript

- [ ] **Step 5: Run tous les tests**

```bash
npm run test
```

Expected: tous les tests PASS (anciens + nouveaux)

- [ ] **Step 6: Commit final**

```bash
git add src/components/prospects/prospect-detail.tsx
git commit -m "feat: wire ProspectMaquetteTab into prospect detail page"
```

---

## Task 9 — Vérification finale et ajout STITCH_API_KEY + NETLIFY_TOKEN

**Files:**
- Modify: `.env.local` (par l'utilisateur)

- [ ] **Step 1: Vérifier que les variables d'env sont renseignées**

```bash
grep -E "STITCH_API_KEY|NETLIFY_TOKEN" .env.local
```

Expected: les deux variables sont renseignées (non vides)

- [ ] **Step 2: Démarrer le serveur et tester manuellement**

```bash
npm run dev
```

1. Aller sur `/prospects` → cliquer sur un prospect → onglet "Maquette"
2. Cliquer "Générer une maquette"
3. Attendre (spinner visible)
4. Vérifier : iframe visible avec le site déployé sur Netlify
5. Tester "Plein écran" → site s'ouvre dans un nouvel onglet
6. Tester "Copier l'URL"

- [ ] **Step 3: Commit final de session**

```bash
git add -A
git commit -m "feat: Session 7 — génération de maquette (Stitch + Netlify)"
```
