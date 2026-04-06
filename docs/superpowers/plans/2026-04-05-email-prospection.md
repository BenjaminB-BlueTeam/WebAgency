# Email Prospection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre d'envoyer un email de prospection personnalisé par IA depuis la fiche prospect, avec brouillon éditable et envoi via Resend.

**Architecture:** `lib/email.ts` expose 3 fonctions : génération IA du corps (Claude), construction HTML email-compatible (inline styles, tables), et envoi via Resend. Deux API routes orchestrent la création de brouillon et l'envoi. Un composant `DemarcherSheet` (modal custom) affiche sujet + corps éditables + iframe preview + boutons d'action.

**Tech Stack:** Resend SDK, Anthropic SDK (via `analyzeWithClaude`), Next.js App Router, Vitest, Framer Motion.

---

## File Map

| Statut | Fichier | Rôle |
|--------|---------|------|
| Créer | `src/lib/email.ts` | generateProspectionEmail, buildEmailHtml, sendEmail |
| Créer | `src/app/api/prospects/[id]/email/generate/route.ts` | POST : génère brouillon IA + sauvegarde en DB |
| Créer | `src/app/api/prospects/[id]/email/send/route.ts` | POST : envoie via Resend, met à jour DB + pipeline |
| Créer | `src/components/prospects/demarcher-sheet.tsx` | Modal : sujet éditables, corps éditable, iframe preview, envoi |
| Modifier | `src/components/prospects/prospect-detail.tsx` | Ajouter bouton "Démarcher" + DemarcherSheet |
| Modifier | `src/components/prospects/prospect-info-tab.tsx` | Corriger STATUT_LABELS (anciens statuts obsolètes) |
| Créer | `src/__tests__/lib/email.test.ts` | Tests generateProspectionEmail, buildEmailHtml, sendEmail |
| Créer | `src/__tests__/api/email-generate.test.ts` | Tests route generate |
| Créer | `src/__tests__/api/email-send.test.ts` | Tests route send |

---

## Task 1 — Installer resend

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Installer le package**

```bash
npm install resend
```

Expected: `added N packages, found 0 vulnerabilities`

- [ ] **Step 2: Vérifier l'installation**

```bash
npm list resend
```

Expected: `resend@x.x.x`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add resend"
```

---

## Task 2 — lib/email.ts (TDD)

**Files:**
- Create: `src/lib/email.ts`
- Test: `src/__tests__/lib/email.test.ts`

**Contexte :** `analyzeWithClaude` et `parseClaudeJSON` viennent de `@/lib/anthropic`. `RESEND_API_KEY` et `RESEND_FROM_EMAIL` sont dans `.env.local`. Le modèle `Email` en DB a les champs : id, prospectId, type, sujet, contenu (HTML), statut, dateEnvoi.

- [ ] **Step 1: Écrire les tests**

```typescript
// src/__tests__/lib/email.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/anthropic", () => ({
  analyzeWithClaude: vi.fn(),
  parseClaudeJSON: vi.fn(),
}))

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: vi.fn() },
  })),
}))

import { generateProspectionEmail, buildEmailHtml, sendEmail } from "@/lib/email"
import { analyzeWithClaude, parseClaudeJSON } from "@/lib/anthropic"
import { Resend } from "resend"

const mockProspect = {
  nom: "Garage Martin",
  activite: "garagiste",
  ville: "Steenvoorde",
  email: "martin@garage.fr",
  telephone: "03 28 50 94 90",
}

describe("generateProspectionEmail", () => {
  beforeEach(() => vi.clearAllMocks())

  it("includes activite and ville in the user prompt", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue("{}")
    vi.mocked(parseClaudeJSON).mockReturnValue({ sujet: "S", corps: "C" })
    await generateProspectionEmail(mockProspect)
    const [, userPrompt] = vi.mocked(analyzeWithClaude).mock.calls[0]
    expect(userPrompt).toContain("garagiste")
    expect(userPrompt).toContain("Steenvoorde")
  })

  it("includes demoUrl in prompt when maquette provided", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue("{}")
    vi.mocked(parseClaudeJSON).mockReturnValue({ sujet: "S", corps: "C" })
    await generateProspectionEmail(mockProspect, { demoUrl: "https://demo.netlify.app", version: 1 })
    const [, userPrompt] = vi.mocked(analyzeWithClaude).mock.calls[0]
    expect(userPrompt).toContain("https://demo.netlify.app")
  })

  it("returns sujet and corps from Claude response", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue("{}")
    vi.mocked(parseClaudeJSON).mockReturnValue({ sujet: "Votre site web", corps: "Bonjour Martin" })
    const result = await generateProspectionEmail(mockProspect)
    expect(result.sujet).toBe("Votre site web")
    expect(result.corps).toBe("Bonjour Martin")
  })
})

describe("buildEmailHtml", () => {
  it("returns HTML string containing corps text", () => {
    const html = buildEmailHtml("Bonjour, je vous contacte.", mockProspect)
    expect(typeof html).toBe("string")
    expect(html).toContain("Bonjour, je vous contacte.")
  })

  it("includes demo link when maquetteDemoUrl provided", () => {
    const html = buildEmailHtml("Test", mockProspect, "https://demo.netlify.app")
    expect(html).toContain("https://demo.netlify.app")
    expect(html).toContain("Voir la démo")
  })

  it("excludes demo section when maquetteDemoUrl is null", () => {
    const html = buildEmailHtml("Test", mockProspect, null)
    expect(html).not.toContain("Voir la démo")
  })

  it("contains Benjamin B. signature", () => {
    const html = buildEmailHtml("Test", mockProspect)
    expect(html).toContain("Benjamin B.")
    expect(html).toContain("Flandre Web Agency")
  })
})

describe("sendEmail", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns true on successful send", async () => {
    const mockSend = vi.fn().mockResolvedValue({ data: { id: "123" }, error: null })
    vi.mocked(Resend).mockImplementation(() => ({ emails: { send: mockSend } } as unknown as Resend))
    const result = await sendEmail("test@example.com", "Sujet", "<p>HTML</p>")
    expect(result).toBe(true)
  })

  it("returns false when Resend returns an error", async () => {
    const mockSend = vi.fn().mockResolvedValue({ data: null, error: { message: "send failed" } })
    vi.mocked(Resend).mockImplementation(() => ({ emails: { send: mockSend } } as unknown as Resend))
    const result = await sendEmail("test@example.com", "Sujet", "<p>HTML</p>")
    expect(result).toBe(false)
  })
})
```

- [ ] **Step 2: Vérifier que les tests échouent**

```bash
npx vitest run src/__tests__/lib/email.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/email'`

- [ ] **Step 3: Implémenter lib/email.ts**

```typescript
// src/lib/email.ts
import { Resend } from "resend"
import { analyzeWithClaude, parseClaudeJSON } from "@/lib/anthropic"

interface ProspectInput {
  nom: string
  activite: string
  ville: string
  email: string | null
  telephone: string | null
}

interface MaquetteInput {
  demoUrl: string | null
  version: number
}

export async function generateProspectionEmail(
  prospect: ProspectInput,
  maquette?: MaquetteInput | null,
  analyse?: { recommandations: string } | null
): Promise<{ sujet: string; corps: string }> {
  const contextParts: string[] = [
    `activité = ${prospect.activite}`,
    `ville = ${prospect.ville}`,
  ]
  if (maquette?.demoUrl) contextParts.push(`lien démo: ${maquette.demoUrl}`)
  if (analyse) contextParts.push(`recommandations: ${analyse.recommandations}`)

  const response = await analyzeWithClaude(
    "Tu rédiges des emails de prospection pour Flandre Web Agency. Ton professionnel mais chaleureux, personnalisé au métier du prospect. Court (max 150 mots). Pas de ton commercial agressif — tu es un voisin qui propose un service utile. Réponds en JSON : {\"sujet\": string, \"corps\": string}",
    `Génère un email de prospection pour ${prospect.nom}, ${contextParts.join(", ")}`
  )
  const parsed = parseClaudeJSON<{ sujet: string; corps: string }>(response)
  return { sujet: parsed.sujet, corps: parsed.corps }
}

export function buildEmailHtml(
  corps: string,
  prospect: ProspectInput,
  maquetteDemoUrl?: string | null
): string {
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? ""

  const demoSection = maquetteDemoUrl
    ? `<tr><td style="padding: 20px 0;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="background-color: #f5f5f5; padding: 20px; border-radius: 8px;"><p style="font-size: 14px; color: #555555; margin: 0 0 12px 0; font-family: Arial, sans-serif;">Aperçu de votre futur site web :</p><a href="${maquetteDemoUrl}" style="display: inline-block; background-color: #000000; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600; font-family: Arial, sans-serif;">Voir la démo →</a></td></tr></table></td></tr>`
    : ""

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin: 0; padding: 0; background-color: #ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td style="padding-bottom: 24px;">
              <p style="font-size: 16px; color: #1a1a1a; line-height: 1.7; margin: 0; font-family: Arial, sans-serif; white-space: pre-line;">${corps}</p>
            </td>
          </tr>
          ${demoSection}
          <tr>
            <td style="border-top: 1px solid #e5e5e5; padding-top: 20px;">
              <p style="font-size: 13px; color: #737373; margin: 0; line-height: 1.6; font-family: Arial, sans-serif;">
                <strong style="color: #1a1a1a;">Benjamin B.</strong> — Flandre Web Agency<br>
                Création de sites vitrines pour artisans et PME locales en Flandre Intérieure<br>
                ${fromEmail}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string
): Promise<boolean> {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject,
    html: htmlContent,
  })
  return error === null
}
```

- [ ] **Step 4: Vérifier que les tests passent**

```bash
npx vitest run src/__tests__/lib/email.test.ts
```

Expected: 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/email.ts src/__tests__/lib/email.test.ts
git commit -m "feat: add email lib (generateProspectionEmail, buildEmailHtml, sendEmail)"
```

---

## Task 3 — POST /api/prospects/[id]/email/generate (TDD)

**Files:**
- Create: `src/app/api/prospects/[id]/email/generate/route.ts`
- Test: `src/__tests__/api/email-generate.test.ts`

**Contexte :**
- `requireAuth()` de `@/lib/auth` — lance `new Error("Unauthorized")` si non connecté
- `prisma` de `@/lib/db`
- `generateProspectionEmail` et `buildEmailHtml` de `@/lib/email`
- Réponses JSON : `{ data: ... }` en succès, `{ error: "message" }` en erreur

- [ ] **Step 1: Écrire les tests**

```typescript
// src/__tests__/api/email-generate.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/db", () => ({
  prisma: {
    prospect: { findUnique: vi.fn() },
    email: { create: vi.fn() },
  },
}))
vi.mock("@/lib/email", () => ({
  generateProspectionEmail: vi.fn(),
  buildEmailHtml: vi.fn(),
}))

import { POST } from "@/app/api/prospects/[id]/email/generate/route"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { generateProspectionEmail, buildEmailHtml } from "@/lib/email"

const params = Promise.resolve({ id: "p1" })
function makeReq() {
  return new Request("http://localhost/api/prospects/p1/email/generate", { method: "POST" })
}

const mockProspect = {
  id: "p1",
  nom: "Garage Martin",
  activite: "garagiste",
  ville: "Steenvoorde",
  email: "martin@garage.fr",
  telephone: "03 28 50 94 90",
  maquettes: [],
  analyses: [],
}

describe("POST /api/prospects/[id]/email/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(undefined)
    vi.mocked(prisma.prospect.findUnique).mockResolvedValue(mockProspect as any)
    vi.mocked(generateProspectionEmail).mockResolvedValue({ sujet: "Votre site web", corps: "Bonjour Martin" })
    vi.mocked(buildEmailHtml).mockReturnValue("<html>preview</html>")
    vi.mocked(prisma.email.create).mockResolvedValue({
      id: "e1", sujet: "Votre site web", contenu: "<html>preview</html>", statut: "BROUILLON",
    } as any)
  })

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"))
    const res = await POST(makeReq() as any, { params })
    expect(res.status).toBe(401)
  })

  it("returns 404 when prospect not found", async () => {
    vi.mocked(prisma.prospect.findUnique).mockResolvedValue(null)
    const res = await POST(makeReq() as any, { params })
    expect(res.status).toBe(404)
  })

  it("returns 200 with id, sujet, contenu, htmlPreview", async () => {
    const res = await POST(makeReq() as any, { params })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.id).toBe("e1")
    expect(json.data.sujet).toBe("Votre site web")
    expect(json.data.corps).toBe("Bonjour Martin")
    expect(json.data.htmlPreview).toBe("<html>preview</html>")
  })

  it("creates email with type PROSPECTION and statut BROUILLON", async () => {
    await POST(makeReq() as any, { params })
    expect(vi.mocked(prisma.email.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "PROSPECTION", statut: "BROUILLON" }),
      })
    )
  })

  it("passes last maquette demoUrl to buildEmailHtml", async () => {
    vi.mocked(prisma.prospect.findUnique).mockResolvedValue({
      ...mockProspect,
      maquettes: [{ id: "m1", demoUrl: "https://test.netlify.app", version: 1, createdAt: new Date() }],
    } as any)
    await POST(makeReq() as any, { params })
    expect(vi.mocked(buildEmailHtml)).toHaveBeenCalledWith(
      "Bonjour Martin",
      expect.anything(),
      "https://test.netlify.app"
    )
  })
})
```

- [ ] **Step 2: Vérifier que les tests échouent**

```bash
npx vitest run src/__tests__/api/email-generate.test.ts
```

Expected: FAIL — `Cannot find module '…/email/generate/route'`

- [ ] **Step 3: Implémenter la route**

```typescript
// src/app/api/prospects/[id]/email/generate/route.ts
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { generateProspectionEmail, buildEmailHtml } from "@/lib/email"

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()
    const { id } = await params

    const prospect = await prisma.prospect.findUnique({
      where: { id },
      include: {
        maquettes: { orderBy: { createdAt: "desc" }, take: 1 },
        analyses: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    })

    if (!prospect) {
      return NextResponse.json({ error: "Prospect introuvable" }, { status: 404 })
    }

    const lastMaquette = prospect.maquettes[0] ?? null
    const lastAnalyse = prospect.analyses[0] ?? null

    const { sujet, corps } = await generateProspectionEmail(
      prospect,
      lastMaquette ? { demoUrl: lastMaquette.demoUrl, version: lastMaquette.version } : null,
      lastAnalyse ? { recommandations: lastAnalyse.recommandations } : null
    )

    const htmlContent = buildEmailHtml(corps, prospect, lastMaquette?.demoUrl ?? null)

    const email = await prisma.email.create({
      data: {
        prospectId: id,
        type: "PROSPECTION",
        sujet,
        contenu: htmlContent,
        statut: "BROUILLON",
      },
    })

    return NextResponse.json({
      data: {
        id: email.id,
        sujet: email.sujet,
        corps,
        contenu: email.contenu,
        htmlPreview: email.contenu,
      },
    })
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
npx vitest run src/__tests__/api/email-generate.test.ts
```

Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/prospects/[id]/email/generate/route.ts src/__tests__/api/email-generate.test.ts
git commit -m "feat: add POST /api/prospects/[id]/email/generate route"
```

---

## Task 4 — POST /api/prospects/[id]/email/send (TDD)

**Files:**
- Create: `src/app/api/prospects/[id]/email/send/route.ts`
- Test: `src/__tests__/api/email-send.test.ts`

**Contexte :**
- Body attendu : `{ emailId: string, sujet: string, corps: string }`
- Reconstruction HTML via `buildEmailHtml(corps, prospect, lastMaquette?.demoUrl)`
- Transition pipeline : si `statutPipeline === "A_DEMARCHER"` → `"MAQUETTE_EMAIL_ENVOYES"`
- Activité type : `"EMAIL"`

- [ ] **Step 1: Écrire les tests**

```typescript
// src/__tests__/api/email-send.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/db", () => ({
  prisma: {
    prospect: { findUnique: vi.fn(), update: vi.fn() },
    email: { findUnique: vi.fn(), update: vi.fn() },
    activite: { create: vi.fn() },
  },
}))
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
  buildEmailHtml: vi.fn(),
}))

import { POST } from "@/app/api/prospects/[id]/email/send/route"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { sendEmail, buildEmailHtml } from "@/lib/email"

const params = Promise.resolve({ id: "p1" })
function makeReq(body = { emailId: "e1", sujet: "Votre site web", corps: "Bonjour Martin" }) {
  return new Request("http://localhost/api/prospects/p1/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

const mockProspect = {
  id: "p1",
  nom: "Garage Martin",
  activite: "garagiste",
  ville: "Steenvoorde",
  email: "martin@garage.fr",
  telephone: "03 28 50 94 90",
  statutPipeline: "A_DEMARCHER",
  maquettes: [],
}

const mockEmail = {
  id: "e1",
  prospectId: "p1",
  sujet: "Votre site web",
  contenu: "<html>...</html>",
  statut: "BROUILLON",
}

describe("POST /api/prospects/[id]/email/send", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(undefined)
    vi.mocked(prisma.prospect.findUnique).mockResolvedValue(mockProspect as any)
    vi.mocked(prisma.email.findUnique).mockResolvedValue(mockEmail as any)
    vi.mocked(buildEmailHtml).mockReturnValue("<html>rebuilt</html>")
    vi.mocked(sendEmail).mockResolvedValue(true)
    vi.mocked(prisma.email.update).mockResolvedValue({} as any)
    vi.mocked(prisma.activite.create).mockResolvedValue({} as any)
    vi.mocked(prisma.prospect.update).mockResolvedValue({} as any)
  })

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"))
    const res = await POST(makeReq() as any, { params })
    expect(res.status).toBe(401)
  })

  it("returns 400 when emailId is missing", async () => {
    const res = await POST(makeReq({ emailId: "", sujet: "S", corps: "C" }) as any, { params })
    expect(res.status).toBe(400)
  })

  it("returns 404 when prospect not found", async () => {
    vi.mocked(prisma.prospect.findUnique).mockResolvedValue(null)
    const res = await POST(makeReq() as any, { params })
    expect(res.status).toBe(404)
  })

  it("returns 400 when prospect has no email address", async () => {
    vi.mocked(prisma.prospect.findUnique).mockResolvedValue({ ...mockProspect, email: null } as any)
    const res = await POST(makeReq() as any, { params })
    expect(res.status).toBe(400)
  })

  it("returns 404 when email not found", async () => {
    vi.mocked(prisma.email.findUnique).mockResolvedValue(null)
    const res = await POST(makeReq() as any, { params })
    expect(res.status).toBe(404)
  })

  it("returns 400 when email already sent", async () => {
    vi.mocked(prisma.email.findUnique).mockResolvedValue({ ...mockEmail, statut: "ENVOYE" } as any)
    const res = await POST(makeReq() as any, { params })
    expect(res.status).toBe(400)
  })

  it("returns 502 when Resend fails", async () => {
    vi.mocked(sendEmail).mockResolvedValue(false)
    const res = await POST(makeReq() as any, { params })
    expect(res.status).toBe(502)
  })

  it("returns 200 on success", async () => {
    const res = await POST(makeReq() as any, { params })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.success).toBe(true)
  })

  it("updates email to ENVOYE with new sujet and rebuilt HTML", async () => {
    await POST(makeReq() as any, { params })
    expect(vi.mocked(prisma.email.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ statut: "ENVOYE", sujet: "Votre site web", contenu: "<html>rebuilt</html>" }),
      })
    )
  })

  it("creates EMAIL activite", async () => {
    await POST(makeReq() as any, { params })
    expect(vi.mocked(prisma.activite.create)).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: "EMAIL" }) })
    )
  })

  it("updates pipeline to MAQUETTE_EMAIL_ENVOYES when was A_DEMARCHER", async () => {
    await POST(makeReq() as any, { params })
    expect(vi.mocked(prisma.prospect.update)).toHaveBeenCalledWith(
      expect.objectContaining({ data: { statutPipeline: "MAQUETTE_EMAIL_ENVOYES" } })
    )
  })

  it("does not update pipeline when was not A_DEMARCHER", async () => {
    vi.mocked(prisma.prospect.findUnique).mockResolvedValue({ ...mockProspect, statutPipeline: "REPONDU" } as any)
    await POST(makeReq() as any, { params })
    expect(vi.mocked(prisma.prospect.update)).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Vérifier que les tests échouent**

```bash
npx vitest run src/__tests__/api/email-send.test.ts
```

Expected: FAIL — `Cannot find module '…/email/send/route'`

- [ ] **Step 3: Implémenter la route**

```typescript
// src/app/api/prospects/[id]/email/send/route.ts
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { sendEmail, buildEmailHtml } from "@/lib/email"
import { validateString } from "@/lib/validation"

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()
    const { id } = await params

    const body: unknown = await request.json()
    const b = body as Record<string, unknown>
    const emailId = validateString(b.emailId, 50)
    const sujet = validateString(b.sujet, 500)
    const corps = validateString(b.corps, 10000)

    if (!emailId || !sujet || !corps) {
      return NextResponse.json({ error: "emailId, sujet et corps sont requis" }, { status: 400 })
    }

    const prospect = await prisma.prospect.findUnique({
      where: { id },
      include: { maquettes: { orderBy: { createdAt: "desc" }, take: 1 } },
    })

    if (!prospect) {
      return NextResponse.json({ error: "Prospect introuvable" }, { status: 404 })
    }
    if (!prospect.email) {
      return NextResponse.json({ error: "Le prospect n'a pas d'adresse email" }, { status: 400 })
    }

    const email = await prisma.email.findUnique({ where: { id: emailId } })
    if (!email || email.prospectId !== id) {
      return NextResponse.json({ error: "Email introuvable" }, { status: 404 })
    }
    if (email.statut !== "BROUILLON") {
      return NextResponse.json({ error: "Cet email a déjà été envoyé" }, { status: 400 })
    }

    const lastMaquetteDemoUrl = prospect.maquettes[0]?.demoUrl ?? null
    const htmlContent = buildEmailHtml(corps, prospect, lastMaquetteDemoUrl)

    const success = await sendEmail(prospect.email, sujet, htmlContent)
    if (!success) {
      return NextResponse.json({ error: "Échec de l'envoi de l'email" }, { status: 502 })
    }

    await prisma.email.update({
      where: { id: emailId },
      data: { sujet, contenu: htmlContent, statut: "ENVOYE", dateEnvoi: new Date() },
    })

    await prisma.activite.create({
      data: {
        prospectId: id,
        type: "EMAIL",
        description: `Email de prospection envoyé à ${prospect.email}`,
      },
    })

    if (prospect.statutPipeline === "A_DEMARCHER") {
      await prisma.prospect.update({
        where: { id },
        data: { statutPipeline: "MAQUETTE_EMAIL_ENVOYES" },
      })
    }

    return NextResponse.json({ data: { success: true } })
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
npx vitest run src/__tests__/api/email-send.test.ts
```

Expected: 12 tests PASS

- [ ] **Step 5: Run tous les tests**

```bash
npx vitest run
```

Expected: tous les tests PASS (anciens + nouveaux)

- [ ] **Step 6: Commit**

```bash
git add src/app/api/prospects/[id]/email/send/route.ts src/__tests__/api/email-send.test.ts
git commit -m "feat: add POST /api/prospects/[id]/email/send route"
```

---

## Task 5 — DemarcherSheet + wiring + fix STATUT_LABELS

**Files:**
- Create: `src/components/prospects/demarcher-sheet.tsx`
- Modify: `src/components/prospects/prospect-detail.tsx`
- Modify: `src/components/prospects/prospect-info-tab.tsx`

**Contexte :**
- Pas de shadcn Sheet installé — utiliser modal custom (pattern de `lost-reason-modal.tsx`)
- Design system : fond `#000000`, cartes `#0a0a0a`, bordures `#1a1a1a`, texte `#fafafa`
- `motion` + `fadeInUp` de `@/lib/animations`
- `toast` de `sonner`
- `useRouter` + `router.refresh()` pour rafraîchir après envoi
- `useEffect` pour déclencher la génération au montage

**Flux :**
1. User clique "Démarcher" dans le header de la fiche
2. `DemarcherSheet` s'ouvre, appelle `POST /email/generate` (spinner pendant la génération)
3. Affiche : champ sujet éditable, textarea corps éditable, iframe preview (HTML statique généré)
4. User clique "Envoyer" → `POST /email/send` avec sujet + corps modifiés
5. Toast succès + fermeture + `router.refresh()`

- [ ] **Step 1: Créer DemarcherSheet**

```typescript
// src/components/prospects/demarcher-sheet.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import { toast } from "sonner"
import { motion } from "motion/react"
import { fadeInUp } from "@/lib/animations"
import { Button } from "@/components/ui/button"
import type { ProspectWithRelations } from "@/types/prospect"

interface Props {
  prospect: ProspectWithRelations
  onClose: () => void
}

interface EmailDraft {
  id: string
  sujet: string
  corps: string
  htmlPreview: string
}

export function DemarcherSheet({ prospect, onClose }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [draft, setDraft] = useState<EmailDraft | null>(null)
  const [sujet, setSujet] = useState("")
  const [corps, setCorps] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function generate() {
      try {
        const res = await fetch(`/api/prospects/${prospect.id}/email/generate`, {
          method: "POST",
        })
        const json = await res.json()
        if (!res.ok) {
          setError(json.error ?? "Erreur lors de la génération")
          return
        }
        setDraft(json.data)
        setSujet(json.data.sujet)
        setCorps(json.data.corps)
      } catch {
        setError("Erreur réseau")
      } finally {
        setLoading(false)
      }
    }
    generate()
  }, [prospect.id])

  async function handleSend() {
    if (!draft) return
    setSending(true)
    try {
      const res = await fetch(`/api/prospects/${prospect.id}/email/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId: draft.id, sujet, corps }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? "Erreur lors de l'envoi")
        return
      }
      toast.success("Email envoyé !")
      router.refresh()
      onClose()
    } catch {
      toast.error("Erreur réseau")
    } finally {
      setSending(false)
    }
  }

  async function handleSaveDraft() {
    toast.success("Brouillon sauvegardé")
    onClose()
  }

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/70" onClick={onClose} />
        <motion.div
          variants={fadeInUp}
          initial="initial"
          animate="animate"
          className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[6px] border border-[#1a1a1a] bg-[#0a0a0a] p-6 mx-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-semibold text-[#fafafa]">
              Démarcher {prospect.nom}
            </h2>
            <button
              onClick={onClose}
              className="text-[#737373] hover:text-[#fafafa] transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center gap-3 py-12">
              <div
                style={{
                  width: 20,
                  height: 20,
                  border: "2px solid #1a1a1a",
                  borderTopColor: "#fff",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
              <p className="text-sm text-[#737373]">Génération de l'email en cours…</p>
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <p className="text-sm text-[#f87171] text-center py-8">{error}</p>
          )}

          {/* Draft form */}
          {!loading && draft && (
            <div className="flex flex-col gap-4">
              {/* To */}
              <div>
                <label className="text-xs text-[#737373] block mb-1">Destinataire</label>
                <p
                  className="text-sm px-3 py-2 rounded-[6px] border border-[#1a1a1a] bg-[#000]"
                  style={{ color: prospect.email ? "#737373" : "#f87171" }}
                >
                  {prospect.email ?? "Aucun email — ajoutez-en un dans les informations"}
                </p>
              </div>

              {/* Sujet */}
              <div>
                <label className="text-xs text-[#737373] block mb-1">Sujet</label>
                <input
                  value={sujet}
                  onChange={(e) => setSujet(e.target.value)}
                  className="w-full rounded-[6px] border border-[#1a1a1a] bg-[#000] px-3 py-2 text-sm text-[#fafafa] focus:outline-none focus:ring-1 focus:ring-white/30"
                />
              </div>

              {/* Corps */}
              <div>
                <label className="text-xs text-[#737373] block mb-1">Corps</label>
                <textarea
                  value={corps}
                  onChange={(e) => setCorps(e.target.value)}
                  rows={5}
                  className="w-full resize-none rounded-[6px] border border-[#1a1a1a] bg-[#000] px-3 py-2 text-sm text-[#fafafa] focus:outline-none focus:ring-1 focus:ring-white/30"
                />
              </div>

              {/* HTML Preview */}
              <div>
                <label className="text-xs text-[#737373] block mb-1">Aperçu</label>
                <iframe
                  srcDoc={draft.htmlPreview}
                  sandbox="allow-same-origin"
                  title="Aperçu email"
                  style={{
                    width: "100%",
                    height: 260,
                    border: "1px solid #1a1a1a",
                    borderRadius: 6,
                    background: "#fff",
                  }}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={handleSaveDraft}>
                  Sauvegarder le brouillon
                </Button>
                <Button
                  size="sm"
                  onClick={handleSend}
                  disabled={sending || !prospect.email}
                >
                  {sending ? "Envoi…" : "Envoyer"}
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Ajouter le bouton "Démarcher" dans prospect-detail.tsx**

Lire `src/components/prospects/prospect-detail.tsx`. Localiser le header :

```typescript
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-[#fafafa]">{prospect.nom}</h1>
          <StatusBadge statut={prospect.statutPipeline} />
        </div>
```

Ajouter l'import et le state, puis modifier le header et ajouter le composant :

```typescript
// Ajouter en haut, après les imports existants :
import { DemarcherSheet } from "@/components/prospects/demarcher-sheet"

// Dans le composant ProspectDetail, ajouter le state :
const [showDemarcher, setShowDemarcher] = useState(false)

// Remplacer le bloc header div "flex items-center gap-3" par :
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-[#fafafa]">{prospect.nom}</h1>
            <StatusBadge statut={prospect.statutPipeline} />
          </div>
          <Button size="sm" onClick={() => setShowDemarcher(true)}>
            Démarcher
          </Button>
        </div>

// Ajouter juste avant la fermeture du return (avant le dernier </div>) :
      {showDemarcher && (
        <DemarcherSheet prospect={prospect} onClose={() => setShowDemarcher(false)} />
      )}
```

- [ ] **Step 3: Corriger STATUT_LABELS dans prospect-info-tab.tsx**

Lire `src/components/prospects/prospect-info-tab.tsx`. Localiser :

```typescript
const STATUT_LABELS: Record<string, string> = {
  A_DEMARCHER: "A démarcher",
  CONTACTE: "Contacté",
  RDV_PLANIFIE: "RDV planifié",
  MAQUETTE_ENVOYEE: "Maquette envoyée",
  RELANCE: "Relance",
  SIGNE: "Signé",
  PERDU: "Perdu",
}
```

Remplacer par :

```typescript
const STATUT_LABELS: Record<string, string> = {
  A_DEMARCHER: "À démarcher",
  MAQUETTE_EMAIL_ENVOYES: "Maquette + Email envoyés",
  REPONDU: "Répondu",
  RDV_PLANIFIE: "RDV planifié",
  NEGOCIATION: "Négociation",
  CLIENT: "Client",
  PERDU: "Perdu",
}
```

- [ ] **Step 4: Build check**

```bash
npm run build
```

Expected: 0 erreurs TypeScript

- [ ] **Step 5: Run tous les tests**

```bash
npx vitest run
```

Expected: tous les tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/prospects/demarcher-sheet.tsx src/components/prospects/prospect-detail.tsx src/components/prospects/prospect-info-tab.tsx
git commit -m "feat: add DemarcherSheet with email compose, preview and send"
```
