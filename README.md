# CRM Flandre Web Agency

CRM interne pour la prospection de clients web dans la region des Flandres. Recherche d'entreprises, evaluation de leur potentiel, generation de maquettes et suivi du pipeline commercial.

## Stack technique

- **Framework** : Next.js 16 (App Router) + TypeScript strict
- **Base de donnees** : SQLite (dev) / Turso (prod) via Prisma ORM
- **Styles** : Tailwind CSS v4 + shadcn/ui (theme "Noir Absolu")
- **Animations** : Framer Motion (package `motion`)
- **Auth** : JWT + bcrypt (mono-utilisateur)
- **Tests** : Vitest
- **Deploy** : Vercel

## Fonctionnalites implementees

### Session 1 — Auth + Layout
- Page login (fond noir, input password, bouton blanc)
- Authentification JWT + bcrypt avec middleware de protection
- Layout dashboard avec sidebar (desktop toujours ouverte 200px + mobile hamburger)
- 7 pages placeholder (dashboard, recherche, prospects, pipeline, emails, clients, parametres)

### Session 2 — CRUD Prospects + API
- 9 API routes protegees par `requireAuth()` :
  - `GET/POST /api/prospects` (liste avec filtres + creation)
  - `GET/PATCH/DELETE /api/prospects/[id]` (detail, modification, suppression)
  - `GET/POST /api/prospects/[id]/activites` (timeline)
  - `POST /api/prospects/[id]/notes` (ajout note)
  - `DELETE /api/notes/[id]` (suppression note)
- Validation serveur avec allowlists (pas de mass assignment)
- Changement de statut pipeline → creation automatique d'une activite
- 11 tests unitaires (validation POST, allowlist, filtres search)

### Session 3 — Page Prospects UI
- **Page liste** (`/prospects`) : tableau filtrable/triable avec recherche textuelle, dropdown statut, slider score minimum
- **Expand inline** : panneau sous chaque ligne avec infos contact, scoring detaille (5 barres animees), boutons d'action
- **Vue mobile** : cartes empilees responsive
- **Fiche prospect** (`/prospects/[id]`) : 4 onglets (Informations, Analyse, Maquette, Activite)
- Modification du statut pipeline en temps reel
- Gestion des notes (ajout/suppression avec toasts)
- Timeline d'activites avec icones par type
- Animations Framer Motion sur toutes les interactions
- Etat vide avec onboarding vers la recherche
- Design system "Noir Absolu" strict : fond #000, cartes #0a0a0a, bordures #1a1a1a

## Demarrage

```bash
npm install
npx prisma migrate dev
npm run dev
```

Variables d'environnement requises dans `.env.local` :

```
CRM_SESSION_SECRET=<secret JWT 256 bits minimum>
CRM_PASSWORD_HASH=<hash bcrypt, echapper les $ avec \$ pour Next.js>
```

## Commandes

```bash
npm run dev          # Serveur de developpement
npm run build        # Build de production
npm run test         # Tests Vitest
npm run lint         # Linting ESLint
npx prisma studio    # Visualiser la base de donnees
```

## Structure

```
src/
├── app/
│   ├── (dashboard)/        # Pages protegees avec layout sidebar
│   │   ├── prospects/      # Liste + fiche prospect [id]
│   │   └── ...             # Autres pages (placeholder)
│   ├── api/                # API routes
│   └── login/              # Page login
├── components/
│   ├── ui/                 # Composants shadcn/ui
│   └── prospects/          # Composants prospects (12 fichiers)
├── types/                  # Types TypeScript
└── lib/
    ├── animations.ts       # Variants Framer Motion
    ├── auth.ts             # JWT + bcrypt
    ├── db.ts               # Client Prisma
    ├── date.ts             # Utilitaires dates
    └── validation.ts       # Validation + allowlists
```
