# Session 1 — Initialisation CRM Flandre Web Agency v2

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Initialiser le projet Next.js complet avec Prisma, auth JWT, design system "Noir Absolu", animations Framer Motion, layout sidebar, et page login fonctionnelle.

**Architecture:** App monolithique Next.js App Router dans le dossier WebAgency/. Prisma avec SQLite pour la persistence. Auth mono-utilisateur via JWT en cookie httpOnly. Design system custom CSS variables + shadcn/ui thème dark.

**Tech Stack:** Next.js 15, TypeScript strict, Tailwind CSS, shadcn/ui (neutral/dark), Prisma (SQLite), bcryptjs, jsonwebtoken, sonner, lucide-react, motion (Framer Motion)

---

## File Structure

```
WebAgency/
├── .env.local                    # Variables d'environnement (existe deja)
├── .gitignore
├── next.config.ts
├── package.json
├── tsconfig.json
├── postcss.config.mjs
├── components.json               # Config shadcn/ui
├── prisma/
│   └── schema.prisma             # Schema complet (10 modeles)
├── src/
│   ├── app/
│   │   ├── globals.css           # Design system CSS variables + Tailwind
│   │   ├── layout.tsx            # Root layout
│   │   ├── login/
│   │   │   └── page.tsx          # Page login
│   │   ├── api/
│   │   │   └── auth/
│   │   │       ├── login/
│   │   │       │   └── route.ts  # POST login
│   │   │       └── logout/
│   │   │           └── route.ts  # POST logout
│   │   └── (dashboard)/
│   │       ├── layout.tsx        # Layout avec sidebar
│   │       ├── page.tsx          # Dashboard placeholder
│   │       ├── recherche/
│   │       │   └── page.tsx      # Placeholder
│   │       ├── prospects/
│   │       │   └── page.tsx      # Placeholder
│   │       ├── pipeline/
│   │       │   └── page.tsx      # Placeholder
│   │       ├── emails/
│   │       │   └── page.tsx      # Placeholder
│   │       ├── clients/
│   │       │   └── page.tsx      # Placeholder
│   │       └── parametres/
│   │           └── page.tsx      # Placeholder
│   ├── components/
│   │   ├── ui/                   # Composants shadcn/ui
│   │   └── sidebar.tsx           # Sidebar navigation
│   ├── lib/
│   │   ├── db.ts                 # Client Prisma singleton
│   │   ├── auth.ts               # JWT sign/verify/requireAuth
│   │   └── animations.ts         # Variants Framer Motion
│   └── middleware.ts             # Redirect /login si pas authentifie
```

---

### Task 1: Initialiser le projet Next.js + dependencies

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `.gitignore`

- [ ] **Step 1: Creer le projet Next.js**

```bash
cd C:/Users/Benja/OneDrive/Bureau/WebAgency
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
```

Note : le `.env.local` existe deja a la racine, ne pas l'ecraser.

- [ ] **Step 2: Installer les dependances supplementaires**

```bash
npm install prisma @prisma/client bcryptjs jsonwebtoken sonner lucide-react motion
npm install -D @types/bcryptjs @types/jsonwebtoken
```

- [ ] **Step 3: Activer TypeScript strict**

Dans `tsconfig.json`, verifier que `"strict": true` est present (Next.js le met par defaut).

- [ ] **Step 4: Initialiser shadcn/ui**

```bash
npx shadcn@latest init -d --style default --base-color neutral
```

Puis configurer `components.json` :
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

- [ ] **Step 5: Installer les composants shadcn necessaires**

```bash
npx shadcn@latest add button input label tabs card
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: init Next.js project with dependencies and shadcn/ui"
```

---

### Task 2: Design System "Noir Absolu" — CSS Variables + globals.css

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Ecrire globals.css avec les variables du design system**

```css
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: #000000;
  --color-foreground: #fafafa;
  --color-surface: #0a0a0a;
  --color-surface-hover: #111111;
  --color-border: #1a1a1a;
  --color-accent: #ffffff;
  --color-accent-foreground: #000000;
  --color-muted: #737373;
  --color-muted-foreground: #555555;
  --color-destructive: #f87171;
  --color-success: #4ade80;
  --color-warning: #fbbf24;
  --color-score-bar-bg: #1a1a1a;
  --color-card: #0a0a0a;
  --color-card-border: #1a1a1a;
  --color-sidebar-bg: #000000;
  --color-sidebar-border: #111111;
  --color-sidebar-active: #111111;
  --color-sidebar-text: #555555;
  --color-sidebar-active-text: #fafafa;
  --radius: 6px;
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

body {
  background-color: var(--color-background);
  color: var(--color-foreground);
  font-family: var(--font-sans);
}

/* Focus ring global */
*:focus-visible {
  outline: none;
  box-shadow: 0 0 0 1px #ffffff;
  border-radius: var(--radius);
}
```

- [ ] **Step 2: Verifier que le build passe**

```bash
npm run build
```

Expected: Build success, pas d'erreur CSS.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: design system Noir Absolu - CSS variables"
```

---

### Task 3: Animations Framer Motion — lib/animations.ts

**Files:**
- Create: `src/lib/animations.ts`

- [ ] **Step 1: Creer le fichier animations.ts**

```typescript
import type { Variants, Transition } from "motion/react"

// --- Transitions reutilisables ---
const easeOut: Transition = { duration: 0.3, ease: "easeOut" }

// --- Variants ---

/** Cartes, panneaux, sections au montage */
export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: easeOut },
}

/** Container pour les listes en cascade (50ms entre chaque) */
export const staggerContainer: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.05 } },
}

/** Item dans un staggerContainer */
export const staggerItem: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: easeOut },
}

/** Props pour hover sur les cartes (translateY -1px) */
export const hoverLift = {
  whileHover: { y: -1, borderColor: "#333" },
  transition: { duration: 0.15 },
}

/** Props pour drag sur les cartes kanban */
export const scaleOnDrag = {
  whileDrag: { scale: 1.02, boxShadow: "0 4px 20px rgba(0,0,0,0.5)" },
}

/** Barres de scoring — remplissage anime au montage */
export const progressBar = (value: number): Variants => ({
  initial: { width: "0%" },
  animate: {
    width: `${value}%`,
    transition: { duration: 0.6, ease: "easeOut" },
  },
})

/** Transitions entre onglets avec AnimatePresence */
export const slideIn: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0, transition: easeOut },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
}

/**
 * Hook-style countUp — a utiliser avec useMotionValue + useTransform
 * Exemple :
 *   const count = useMotionValue(0)
 *   const rounded = useTransform(count, Math.round)
 *   useEffect(() => { animate(count, target, { duration: 0.4 }) }, [target])
 *   <motion.span>{rounded}</motion.span>
 */
export const countUpTransition: Transition = { duration: 0.4, ease: "easeOut" }
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/animations.ts
git commit -m "feat: Framer Motion animation variants"
```

---

### Task 4: Prisma — Schema complet + migration initiale

**Files:**
- Create: `prisma/schema.prisma`, `src/lib/db.ts`

- [ ] **Step 1: Initialiser Prisma**

```bash
npx prisma init --datasource-provider sqlite
```

- [ ] **Step 2: Ecrire le schema complet**

Fichier `prisma/schema.prisma` :

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Prospect {
  id                String     @id @default(cuid())
  nom               String
  activite          String
  ville             String
  adresse           String?
  telephone         String?
  email             String?
  siteUrl           String?
  placeId           String?    @unique
  noteGoogle        Float?
  nbAvisGoogle      Int?
  scorePresenceWeb  Int?
  scoreSEO          Int?
  scoreDesign       Int?
  scoreFinancier    Int?
  scorePotentiel    Int?
  scoreGlobal       Int?
  statutPipeline    String     @default("A_DEMARCHER")
  dateContact       DateTime?
  dateRdv           DateTime?
  dateMaquetteEnvoi DateTime?
  dateSignature     DateTime?
  raisonPerte       String?
  derniereRelance   DateTime?
  prochaineRelance  DateTime?
  createdAt         DateTime   @default(now())
  updatedAt         DateTime   @updatedAt

  maquettes  Maquette[]
  analyses   Analyse[]
  emails     Email[]
  notes      Note[]
  activites  Activite[]
  client     Client?

  @@unique([nom, ville])
  @@index([statutPipeline])
  @@index([scoreGlobal])
}

model Analyse {
  id              String   @id @default(cuid())
  prospectId      String
  concurrents     String   // JSON
  recommandations String   // JSON
  promptUsed      String?
  createdAt       DateTime @default(now())

  prospect Prospect @relation(fields: [prospectId], references: [id], onDelete: Cascade)
}

model Maquette {
  id            String   @id @default(cuid())
  prospectId    String
  html          String
  demoUrl       String?
  netlifySiteId String?
  version       Int      @default(1)
  promptUsed    String?
  statut        String   @default("BROUILLON") // BROUILLON | ENVOYEE | VALIDEE | REJETEE
  createdAt     DateTime @default(now())

  prospect Prospect @relation(fields: [prospectId], references: [id], onDelete: Cascade)
}

model Email {
  id         String    @id @default(cuid())
  prospectId String
  type       String    // PROSPECTION | RELANCE | MAQUETTE | CUSTOM
  sujet      String
  contenu    String
  statut     String    @default("BROUILLON") // BROUILLON | ENVOYE
  dateEnvoi  DateTime?
  createdAt  DateTime  @default(now())

  prospect Prospect @relation(fields: [prospectId], references: [id], onDelete: Cascade)
}

model Note {
  id         String   @id @default(cuid())
  prospectId String
  contenu    String
  createdAt  DateTime @default(now())

  prospect Prospect @relation(fields: [prospectId], references: [id], onDelete: Cascade)
}

model Activite {
  id          String   @id @default(cuid())
  prospectId  String?
  type        String   // RECHERCHE | ANALYSE | MAQUETTE | EMAIL | RELANCE | PIPELINE | NOTE
  description String
  createdAt   DateTime @default(now())

  prospect Prospect? @relation(fields: [prospectId], references: [id], onDelete: Cascade)
}

model Recherche {
  id              String   @id @default(cuid())
  query           String
  ville           String?
  resultatsCount  Int
  prospectsAjoutes Int
  createdAt       DateTime @default(now())
}

model Parametre {
  id     String @id @default(cuid())
  cle    String @unique
  valeur String
}

model Client {
  id                    String    @id @default(cuid())
  prospectId            String    @unique
  siteUrl               String
  plausibleSiteId       String?
  dateLivraison         DateTime
  offreType             String    // VITRINE | VISIBILITE
  maintenanceActive     Boolean   @default(true)
  stripeCustomerId      String?
  stripeSubscriptionId  String?
  stripeStatus          String?   // active | past_due | canceled
  createdAt             DateTime  @default(now())

  prospect Prospect  @relation(fields: [prospectId], references: [id], onDelete: Cascade)
  rapports Rapport[]
}

model Rapport {
  id         String    @id @default(cuid())
  clientId   String
  mois       String    // "2026-04"
  visiteurs  Int
  pagesVues  Int
  topPages   String    // JSON
  topSources String    // JSON
  tendance   Float?
  resumeIA   String
  pdfUrl     String?
  dateEnvoi  DateTime?
  createdAt  DateTime  @default(now())

  client Client @relation(fields: [clientId], references: [id], onDelete: Cascade)

  @@unique([clientId, mois])
}
```

- [ ] **Step 3: Creer le client Prisma singleton**

Fichier `src/lib/db.ts` :

```typescript
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
```

- [ ] **Step 4: Generer le client et appliquer la migration**

```bash
npx prisma migrate dev --name init
```

Expected: Migration creee dans `prisma/migrations/`, client genere, fichier `prisma/dev.db` cree.

- [ ] **Step 5: Commit**

```bash
git add prisma/ src/lib/db.ts
git commit -m "feat: Prisma schema complet (10 modeles) + migration init"
```

---

### Task 5: Auth — JWT + bcrypt + API routes

**Files:**
- Create: `src/lib/auth.ts`, `src/app/api/auth/login/route.ts`, `src/app/api/auth/logout/route.ts`

- [ ] **Step 1: Creer lib/auth.ts**

```typescript
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

const SESSION_SECRET = process.env.CRM_SESSION_SECRET!
const COOKIE_NAME = "crm_session"

interface TokenPayload {
  user: "admin"
  iat: number
  exp: number
}

export function signToken(): string {
  return jwt.sign({ user: "admin" }, SESSION_SECRET, { expiresIn: "7d" })
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, SESSION_SECRET) as TokenPayload
  } catch {
    return null
  }
}

export async function verifyPassword(password: string): Promise<boolean> {
  const hash = process.env.CRM_PASSWORD_HASH
  if (!hash) return false
  return bcrypt.compare(password, hash)
}

export async function requireAuth(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token || !verifyToken(token)) {
    throw new Error("Unauthorized")
  }
}

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 jours
    path: "/",
  })
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  })
}

export function getSessionToken(): string | undefined {
  // Pour usage dans middleware (sync)
  // Note: cette fonction est pour le middleware, pas pour les API routes
  return undefined // Le middleware lit directement le cookie
}
```

- [ ] **Step 2: Creer la route POST /api/auth/login**

Fichier `src/app/api/auth/login/route.ts` :

```typescript
import { NextRequest, NextResponse } from "next/server"
import { verifyPassword, signToken, setSessionCookie } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password } = body

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Mot de passe requis" },
        { status: 400 }
      )
    }

    if (password.length > 200) {
      return NextResponse.json(
        { error: "Mot de passe invalide" },
        { status: 400 }
      )
    }

    const valid = await verifyPassword(password)
    if (!valid) {
      return NextResponse.json(
        { error: "Mot de passe incorrect" },
        { status: 401 }
      )
    }

    const token = signToken()
    const response = NextResponse.json({ data: { success: true } })
    setSessionCookie(response, token)
    return response
  } catch {
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 3: Creer la route POST /api/auth/logout**

Fichier `src/app/api/auth/logout/route.ts` :

```typescript
import { NextResponse } from "next/server"
import { clearSessionCookie } from "@/lib/auth"

export async function POST() {
  const response = NextResponse.json({ data: { success: true } })
  clearSessionCookie(response)
  return response
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth.ts src/app/api/auth/
git commit -m "feat: auth JWT + bcrypt - login/logout API routes"
```

---

### Task 6: Middleware — redirect vers /login si pas authentifie

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Creer le middleware**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Laisser passer les fichiers statiques et les routes publiques
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next()
  }

  const token = request.cookies.get("crm_session")?.value

  if (!token || !verifyToken(token)) {
    const loginUrl = new URL("/login", request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match toutes les routes sauf :
     * - _next/static (fichiers statiques)
     * - _next/image (optimisation images)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
```

Note : le middleware Next.js tourne en Edge runtime et ne peut pas importer de modules Node.js lourds. `jsonwebtoken` utilise des modules Node.js. Il faut utiliser `jose` a la place pour le middleware.

- [ ] **Step 2: Installer jose pour le middleware Edge**

```bash
npm install jose
```

- [ ] **Step 3: Adapter le middleware pour utiliser jose**

Remplacer `src/middleware.ts` :

```typescript
import { NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next()
  }

  const token = request.cookies.get("crm_session")?.value

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  try {
    const secret = new TextEncoder().encode(process.env.CRM_SESSION_SECRET!)
    await jwtVerify(token, secret)
    return NextResponse.next()
  } catch {
    return NextResponse.redirect(new URL("/login", request.url))
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
```

- [ ] **Step 4: Commit**

```bash
git add src/middleware.ts package.json package-lock.json
git commit -m "feat: middleware auth - redirect to /login if not authenticated"
```

---

### Task 7: Page Login

**Files:**
- Create: `src/app/login/page.tsx`

- [ ] **Step 1: Creer la page login**

```tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import { fadeInUp } from "@/lib/animations"

export default function LoginPage() {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Erreur de connexion")
        return
      }

      router.push("/")
      router.refresh()
    } catch {
      setError("Erreur de connexion")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
      <motion.div
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        className="w-full max-w-sm px-6"
      >
        <h1 className="text-xl font-bold text-[var(--color-foreground)] mb-8 text-center">
          Flandre Web Agency
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
              autoFocus
              className="w-full h-10 px-3 rounded-[var(--radius)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-1 focus:ring-white"
            />
          </div>

          {error && (
            <p className="text-sm text-[var(--color-destructive)]">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full h-9 rounded-[var(--radius)] bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
```

- [ ] **Step 2: Modifier le root layout**

Fichier `src/app/layout.tsx` :

```tsx
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "CRM — Flandre Web Agency",
  description: "CRM interne Flandre Web Agency",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/login/ src/app/layout.tsx
git commit -m "feat: page login - fond noir, input password, bouton blanc"
```

---

### Task 8: Sidebar navigation

**Files:**
- Create: `src/components/sidebar.tsx`

- [ ] **Step 1: Creer le composant Sidebar**

```tsx
"use client"

import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { motion } from "motion/react"
import {
  LayoutDashboard,
  Search,
  Users,
  Kanban,
  Mail,
  Settings,
  UserCheck,
  Menu,
  X,
  LogOut,
} from "lucide-react"

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/recherche", label: "Recherche", icon: Search },
  { href: "/prospects", label: "Prospects", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/emails", label: "Emails", icon: Mail },
  { href: "/clients", label: "Clients", icon: UserCheck },
  { href: "/parametres", label: "Parametres", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
    router.refresh()
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  const navContent = (
    <>
      {/* Logo */}
      <div className="p-3 mb-2">
        <div className="w-7 h-7 rounded-[var(--radius)] bg-[var(--color-accent)] text-[var(--color-accent-foreground)] flex items-center justify-center font-extrabold text-sm">
          F
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href)
          const Icon = item.icon
          return (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => {
                e.preventDefault()
                router.push(item.href)
                setMobileOpen(false)
              }}
              className={`flex items-center gap-3 px-2 h-9 rounded-[var(--radius)] text-sm transition-colors ${
                active
                  ? "bg-[var(--color-sidebar-active)] text-[var(--color-sidebar-active-text)]"
                  : "text-[var(--color-sidebar-text)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-hover)]"
              }`}
            >
              <Icon size={18} className="shrink-0" />
              {(expanded || mobileOpen) && <span>{item.label}</span>}
            </a>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-2 pb-3">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-2 h-9 w-full rounded-[var(--radius)] text-sm text-[var(--color-sidebar-text)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-hover)] transition-colors"
        >
          <LogOut size={18} className="shrink-0" />
          {(expanded || mobileOpen) && <span>Deconnexion</span>}
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-50 md:hidden p-2 rounded-[var(--radius)] bg-[var(--color-surface)] border border-[var(--color-border)]"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <motion.aside
        initial={{ x: -200 }}
        animate={{ x: mobileOpen ? 0 : -200 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="fixed top-0 left-0 z-50 h-screen w-[200px] bg-[var(--color-sidebar-bg)] border-r border-[var(--color-sidebar-border)] flex flex-col md:hidden"
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-3 right-3 p-1 text-[var(--color-sidebar-text)]"
        >
          <X size={18} />
        </button>
        {navContent}
      </motion.aside>

      {/* Desktop sidebar */}
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={`hidden md:flex fixed top-0 left-0 h-screen bg-[var(--color-sidebar-bg)] border-r border-[var(--color-sidebar-border)] flex-col transition-all duration-200 z-30 ${
          expanded ? "w-[200px]" : "w-[52px]"
        }`}
      >
        {navContent}
      </aside>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/sidebar.tsx
git commit -m "feat: sidebar navigation - desktop (collapse/expand) + mobile (hamburger)"
```

---

### Task 9: Dashboard layout + pages placeholder

**Files:**
- Create: `src/app/(dashboard)/layout.tsx`, `src/app/(dashboard)/page.tsx`, et 6 pages placeholder

- [ ] **Step 1: Creer le layout dashboard**

Fichier `src/app/(dashboard)/layout.tsx` :

```tsx
import { Sidebar } from "@/components/sidebar"
import { Toaster } from "sonner"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <Sidebar />
      <main className="md:ml-[52px] p-6 pt-14 md:pt-6">
        {children}
      </main>
      <Toaster
        theme="dark"
        toastOptions={{
          style: {
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            color: "var(--color-foreground)",
          },
        }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Creer la page Dashboard**

Fichier `src/app/(dashboard)/page.tsx` :

```tsx
import { motion } from "motion/react"

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--color-foreground)] mb-2">
        Dashboard
      </h1>
      <p className="text-sm text-[var(--color-muted)]">
        Statistiques a venir
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Creer les 6 pages placeholder**

Chaque page suit le meme pattern. Creer les fichiers suivants :

`src/app/(dashboard)/recherche/page.tsx` :
```tsx
export default function RecherchePage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--color-foreground)] mb-2">Recherche</h1>
      <p className="text-sm text-[var(--color-muted)]">Recherche de prospects a venir</p>
    </div>
  )
}
```

`src/app/(dashboard)/prospects/page.tsx` :
```tsx
export default function ProspectsPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--color-foreground)] mb-2">Prospects</h1>
      <p className="text-sm text-[var(--color-muted)]">Liste des prospects a venir</p>
    </div>
  )
}
```

`src/app/(dashboard)/pipeline/page.tsx` :
```tsx
export default function PipelinePage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--color-foreground)] mb-2">Pipeline</h1>
      <p className="text-sm text-[var(--color-muted)]">Kanban a venir</p>
    </div>
  )
}
```

`src/app/(dashboard)/emails/page.tsx` :
```tsx
export default function EmailsPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--color-foreground)] mb-2">Emails</h1>
      <p className="text-sm text-[var(--color-muted)]">Prospection email a venir</p>
    </div>
  )
}
```

`src/app/(dashboard)/clients/page.tsx` :
```tsx
export default function ClientsPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--color-foreground)] mb-2">Clients</h1>
      <p className="text-sm text-[var(--color-muted)]">Suivi clients a venir</p>
    </div>
  )
}
```

`src/app/(dashboard)/parametres/page.tsx` :
```tsx
export default function ParametresPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--color-foreground)] mb-2">Parametres</h1>
      <p className="text-sm text-[var(--color-muted)]">Configuration a venir</p>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/
git commit -m "feat: dashboard layout with sidebar + 7 placeholder pages"
```

---

### Task 10: Build final + verification

**Files:**
- Aucun nouveau fichier

- [ ] **Step 1: Verifier le build**

```bash
npm run build
```

Expected: Build success. Pas d'erreur TypeScript. Toutes les pages detectees.

- [ ] **Step 2: Lancer le dev server et verifier manuellement**

```bash
npm run dev
```

Verifier :
1. `http://localhost:3000` redirige vers `/login`
2. Entrer "admin" → redirige vers le dashboard
3. La sidebar est visible, les 7 liens fonctionnent
4. Clic sur "Deconnexion" → retour au login
5. Sur mobile (resize < 768px) : hamburger visible, sidebar en overlay

- [ ] **Step 3: Commit final si ajustements**

```bash
git add -A
git commit -m "fix: session 1 adjustments after build verification"
```

---

### Task 11: Mettre a jour CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Mettre a jour CLAUDE.md avec la structure v2**

Mettre a jour le CLAUDE.md pour refleter la nouvelle structure du projet (sans sous-dossier crm/). Remplacer les references `crm/` par les chemins directs. S'assurer que la section structure, les commandes, et les regles de dev sont a jour.

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for v2 project structure"
```
