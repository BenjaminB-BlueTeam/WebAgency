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

### Session 4 — Recherche Google Places
- **Page recherche** (`/recherche`) : formulaire activite + ville + rayon
- Client Google Places API (New) avec parsing des resultats
- Detection des doublons par placeId avant enregistrement
- Cartes resultats avec note Google, badges "A un site" / "Pas de site" / "Deja enregistre"
- Expand par carte : adresse, telephone, lien site web
- Selection par checkbox + enregistrement en batch des prospects selectionnes
- Score "Potentiel web" : 10/10 si pas de site (potentiel max), 3/10 si site existant
- Historique des recherches en base (modele Recherche)
- 5 tests unitaires (parsing Google Places, appels API, erreurs)

### Session 5 — Scoring multi-axes + analyse IA
- Scoring 5 axes : Potentiel web (PageSpeed), SEO (PageSpeed), Design/UX (Firecrawl + Claude), Financier (noteGoogle + avis), Urgence (Claude)
- Score global = moyenne ponderee (poids 3/2/2/1/3)
- Client Anthropic SDK (Claude Sonnet) + client Firecrawl (scraping HTML)
- Bouton "Scorer ce prospect" / "Rescorer" sur la fiche prospect
- API POST /api/prospects/[id]/score
- 12 tests unitaires (calcul pondere, formule financier, parsing JSON Claude)

### Session 6 — Pipeline Kanban
- **Page Pipeline** (`/pipeline`) : kanban drag & drop avec 7 colonnes
- @dnd-kit : support souris desktop + tactile mobile
- Drop met a jour le statut via PATCH API + creation automatique d'activite
- Modale "Raison de perte" quand drop dans colonne "Perdu"
- Cartes : nom, activite, ville, score pastille, date relative
- Clic carte → navigation vers fiche prospect
- Responsive : scroll horizontal avec snap sur mobile

### Session 7 — Generation de maquettes (Google Stitch + Netlify)
- **Onglet Maquette** sur la fiche prospect : 3 etats (vide / generation en cours / maquette disponible)
- `lib/stitch/buildPrompt.ts` : Claude Sonnet genere un prompt de design UI adapte au metier du prospect
- `lib/stitch.ts` : wrapper `@google/stitch-sdk` — genere 4 pages HTML (accueil, services, contact, a-propos)
- `lib/netlify-deploy.ts` : deploiement multi-pages via Netlify File Digest API (SHA1, sans zip)
- `POST /api/maquettes/generate` : orchestration complete avec cap a 3 maquettes par prospect
- `GET /api/maquettes/[id]` : detail maquette ; `GET /api/maquettes/[id]/preview` : redirect 302 vers demoUrl
- Reutilisation du `netlifySiteId` pour v2/v3 (mise a jour du meme site Netlify)
- Timeout client 5 min avec message d'erreur, toast de confirmation sur copie URL
- Variables d'environnement : `STITCH_API_KEY`, `NETLIFY_TOKEN`

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
GOOGLE_PLACES_KEY=<cle API Google Places (New)>
ANTHROPIC_API_KEY=<cle API Anthropic>
FIRECRAWL_API_KEY=<cle API Firecrawl>
STITCH_API_KEY=<cle API Google Stitch>
NETLIFY_TOKEN=<personal access token Netlify>
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
│   │   ├── recherche/      # Recherche Google Places
│   │   ├── pipeline/       # Kanban drag & drop
│   │   └── ...             # Autres pages (placeholder)
│   ├── api/                # API routes (prospects, prospection)
│   └── login/              # Page login
├── components/
│   ├── ui/                 # Composants shadcn/ui
│   ├── prospects/          # Composants prospects (12 fichiers)
│   ├── recherche/          # Composants recherche (3 fichiers)
│   └── pipeline/           # Composants kanban (4 fichiers)
├── types/                  # Types TypeScript
└── lib/
    ├── animations.ts       # Variants Framer Motion
    ├── auth.ts             # JWT + bcrypt
    ├── db.ts               # Client Prisma
    ├── date.ts             # Utilitaires dates
    ├── places.ts           # Client Google Places API
    ├── anthropic.ts        # Client Anthropic (Claude)
    ├── scrape.ts           # Client Firecrawl
    ├── scoring.ts          # Scoring multi-axes
    ├── validation.ts       # Validation + allowlists
    ├── stitch/             # Google Stitch SDK (buildPrompt + generateMaquette)
    └── netlify-deploy.ts   # Deploiement multi-pages Netlify
```
