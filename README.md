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
- Scoring 5 axes : Potentiel web (PageSpeed), SEO (PageSpeed), Design/UX (Firecrawl + Claude), Financier (Claude — secteur + localisation + avis), Urgence (Claude)
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

### Session 8 — Prospection email (IA + Resend)
- **Bouton "Demarcher"** sur chaque fiche prospect : ouvre une modale de composition d'email
- Generation IA du sujet + corps via Claude (contexte : metier, ville, lien demo maquette)
- Preview HTML de l'email dans un `<iframe>` avec rendu fidele
- Sujet et corps editables avant envoi
- Envoi via Resend SDK (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`)
- A l'envoi : activite `EMAIL` creee, pipeline A_DEMARCHER → MAQUETTE_EMAIL_ENVOYES automatiquement
- Idempotence : un brouillon ne peut etre envoye qu'une seule fois (statut BROUILLON → ENVOYE)
- 2 nouvelles API routes : `POST /api/prospects/[id]/email/generate` et `POST /api/prospects/[id]/email/send`
- 26 tests unitaires (lib/email, route generate, route send)

### Session 7 — Generation de maquettes (Netlify + Claude)
- **Onglet Maquette** sur la fiche prospect : generation, preview iframe, gestion versions
- `lib/netlify-deploy.ts` : deploiement multi-fichiers via Netlify File Digest API (SHA1, sans zip)
- `POST /api/maquettes/generate` : orchestration complete avec cap a 3 maquettes par prospect
- `GET /api/maquettes/[id]` : detail maquette ; `GET /api/maquettes/[id]/preview` : redirect 302 vers demoUrl
- Reutilisation du `netlifySiteId` pour v2/v3 (mise a jour du meme site Netlify)
- Timeout client 5 min, toast sur copie URL
- Variables d'environnement : `NETLIFY_TOKEN`

### Session 9 — Tests + nettoyage Phase 1
- **Tests unitaires libs** : ajouts ciblés sur `scoring.ts` (parseClaudeJSON fences nues, null score), `build-prompt.ts` (assertion explicite sur l'activité), `anthropic.ts` (parsing edge cases) — pas de réécriture des tests existants
- **Tests d'intégration API** : PATCH /api/prospects/[id] vérifie explicitement que l'`Activite` PIPELINE est créée lors d'un changement de statut
- **Audit responsive code-only** : 12 composants critiques audités (sidebar, prospect-list, kanban, search-form, emails, parametres, modales) — rapport `docs/superpowers/audits/2026-04-07-responsive-audit.md` — 4 fixes appliqués (textarea modal `min(70vh, calc(100vh-240px))`, kanban-card `w-[min(200px,90vw)]`)
- **Build clean** : `npm run build` zéro warning, `npm run lint` clean, **302 tests** verts (vs 295 avant)
- **CLAUDE.md** : ajout `validation.ts` à la structure du projet
- ⚠ Warning Next.js 16 (`middleware` → `proxy`) noté hors scope, à traiter dans une migration dédiée

### Session 14 — Investigation profonde + generation de sites vitrines (refonte complete)
- **Pipeline d'investigation** en 4 sources parallelisees (`Promise.allSettled`) :
  - `lib/maquette/scrape-identity.ts` : scraping Firecrawl + Claude → 16 champs (couleurs, polices, logo, services, tarifs, horaires, equipe, certifications…)
  - `lib/maquette/pappers.ts` : matching Pappers cascade 5 niveaux (nom+CP → NAF+geo → adresse → departement → Claude) avec `matchConfidence: high/medium/low`
  - `lib/maquette/pexels.ts` : images paysage + video 5-30s MP4 via API Pexels
  - `lib/maquette/investigate.ts` : orchestration + analyse perception client (avis Google + analyse concurrentielle)
- `lib/maquette/build-prompt.ts` : Claude assemble toutes les donnees en prompt structure (## CONTENU / ## DESIGN / ## SEO)
- `lib/maquette/generate-site.ts` : Claude genere site HTML/CSS/JS complet avec GSAP ScrollTrigger, effets scroll, responsive mobile-first (max_tokens 32000)
- `lib/netlify-deploy.ts` adapte : accepte paths avec sous-dossiers (`css/style.css`, `js/main.js`), sans injection de nav
- **Nouveau flow UI 5 etats** sur l'onglet Maquette :
  1. Vide → bouton "Generer une maquette"
  2. Investigation (POST `/api/maquettes/generate/prompt`) → spinner "Investigation en cours..."
  3. Modale d'edition → textarea 70vh pre-remplie avec le prompt, entierement editable
  4. Generation (POST `/api/maquettes/generate`) → spinner jusqu'a 5 min
  5. Resultat → selecteur version, badge statut, iframe preview, plein ecran / copier URL / regenerer
- Variables d'environnement ajoutees : `PEXELS_API_KEY`, `PAPPERS_API_KEY`

### Session 10 — Dashboard
- **Page Dashboard** (`/`) : vue d'ensemble du pipeline commercial
- 5 stat cards animees : total prospects, a demarcher, maquettes envoyees, clients signes, taux de conversion
- Barre pipeline : repartition visuelle des 7 statuts avec pourcentages
- Widget relances : prospects dont la prochaine relance est depassee (badge rouge)
- Timeline activites : 10 dernieres activites avec icones par type et liens vers les fiches
- `lib/dashboard.ts` : 3 fonctions (`getDashboardStats`, `getDashboardRelances`, `getDashboardActivites`)
- 3 API routes : `GET /api/dashboard/stats|relances|activites`
- Page Server Component avec chargement parallele (`Promise.all`)
- 16 tests unitaires

### Session 12 — Ameliorations UX + corrections production
- **Bug fixes production** : `deleteMany` LibSQL silencieuse → boucle de `delete()` individuels ; `DriverAdapterError` UNIQUE constraint → helper `isUniqueConstraintError` ; pages Server Component statiquement cachees → `export const dynamic = "force-dynamic"` sur toutes les pages de donnees
- **Page Parametres** : section "Outils & APIs" avec statut de configuration de chaque cle API (10 services, lien dashboard, variable d'env manquante affichee)
- **Page Prospects** : filtres dropdown Activite + Ville (valeurs distinctes depuis la base, `GET /api/prospects/filters`)
- **Page Recherche** : historique des 10 dernieres recherches (cliquables pour re-lancer, × pour supprimer), modele `Recherche` enrichi avec champ `rayon`, `GET/DELETE /api/recherches`

### Session 11 — Analyse concurrentielle
- **Onglet Analyse** sur la fiche prospect : recherche jusqu'a 5 concurrents locaux avec site web
- Scraping de leurs sites via Firecrawl, analyse IA via Claude (forces, faiblesses, positionnement)
- Synthese du marche + recommandations pour se demarquer
- Upsert en base (1 analyse par prospect) — alimente ensuite le prompt de maquette
- `lib/analyse.ts` : `findCompetitorCandidates`, `scrapeCompetitors`, `buildAnalyseResult`
- `POST /api/prospects/[id]/analyse` : orchestration complete
- Bouton "Analyser concurrence" dans le panneau expand de la liste des prospects
- `analyzeWithClaude` : parametre optionnel `maxTokens` (defaut 1024, 4096 pour l'analyse)
- 15 tests unitaires (lib + route)

### Session 13 — Systeme de relances
- **Calcul automatique** de la prochaine relance via `computeProchainRelance` (4 regles prioritaires : MAQUETTE / RDV / DEVIS / NEGOCIATION)
- **Persistance evenementielle** : `refreshProchainRelance` declenche sur envoi d'email et PATCH du prospect (dateMaquetteEnvoi, statutPipeline)
- **Prompts Claude contextuels** par `relanceType` : MAQUETTE / RDV / DEVIS — validation par allowlist dans la route generate
- **UI** : `RelanceDot` (badge sur kanban-card), `RelanceBadge` (page emails), affichage du type de relance dans `DemarcherSheet`
- `src/lib/relance.ts` : `computeProchainRelance` — `MS_PER_DAY` hoiste au scope module
- `src/lib/relance-writer.ts` : `refreshProchainRelance` — query NEGOCIATION ciblee
- `GET /api/emails` etendu avec `relanceType` calcule par `computeProchainRelance`
- Type `RelanceType` + champ `relanceType` sur `EmailProspectItem`

### Session 15 — Ameliorations pipeline prospect + fix mineurs
- **Fix tauxConversion** : denominateur = prospects ayant recu au moins un email (statuts EMAIL_ENVOYE+), pas le total — calcul plus representatif
- **Fix computeProchainRelance** : comparaison directe `statutPipeline === "NEGOCIATION"` au lieu de `description.includes("NEGOCIATION")` — plus robuste
- **Fix page Emails** : modale au lieu du split view
- **Ajout manuel de prospect** : bouton "Ajouter un prospect" sur la page Prospects → modale formulaire (nom obligatoire, activite/ville/telephone/email/site optionnels) → POST /api/prospects → refresh liste
- `src/components/prospects/add-prospect-modal.tsx` : nouveau composant

### Session 16 — Recherche avancee + scoring automatique
- **Scoring automatique** : apres sauvegarde de prospects depuis la recherche Google Places, scoring en arriere-plan sur tous les resultats → scores affiches une fois termines, tri par score decroissant
- `POST /api/prospection/score-batch` : scoring par lot (sequentiel, gestion des echecs individuels)
- **Recherche par lot / region** : activite optionnelle, selecteur de zone (ville unique / departement Nord / Hauts-de-France), recherche multi-villes avec deduplication par placeId
- `src/lib/zones.ts` : constantes `VILLES_NORD` (12 villes) et `VILLES_HAUTS_DE_FRANCE` (~25 villes)
- **Filtres resultats** : dropdown ville, score minimum, sous-chaine activite, note Google minimum, checkbox "Pas de site"
- **Ajustement maquette** : bouton "Ajuster" sur l'onglet Maquette → textarea instructions → Claude modifie le code existant sans tout regenerer → redploiement Netlify
- `src/lib/maquette/adjust-site.ts` : `adjustSiteCode(currentFiles, instructions)` — max_tokens 32000, fallback = code inchange
- `POST /api/maquettes/[id]/adjust` : orchestration ajustement + mise a jour DB + activite

### Session 17 — Veille prospects + page Parametres complete
- **Widget Veille** sur le dashboard : entreprises creees dans les dernieres 24h (departement 59) via Pappers → bouton "Ajouter" cree le prospect + scoring automatique
- Vercel Cron quotidien a 8h (`/api/cron/veille-prospects`) — upsert par SIREN, evite les doublons
- Modele `NouveauProspect` : SIREN unique, nom, activite, NAF, ville, dateCreation, ajouteComme
- **Page Parametres complete** : 6 sections editables en temps reel via API PATCH /api/parametres
  - Profil agence (nom, contact, email, telephone, adresse, logo)
  - Coefficients de scoring (5 sliders 0–5)
  - Regles de relance (delais en jours)
  - Zone de prospection (villes + rayon)
  - Offres commerciales (Vitrine / Visibilite)
  - Templates email Claude (system prompts modifiables)
- `src/lib/params.ts` : `getParam(cle, default)` / `setParam(cle, valeur)` — jamais throws, fallback sur default
- Table `Parametre` : `{cle (unique), valeur (JSON string), updatedAt}`
- **Paramètres dynamiques** — Les poids de scoring, délais de relance et templates email sont maintenant modifiables à chaud via la page Paramètres, sans redéploiement. Les modifications sont prises en compte immédiatement (cache 60s).

### Session 18 — Audit cybersecurite OWASP Top 10
- **7 corrections** sur les 10 categories OWASP 2025 analysees
- **(A05) Headers HTTP** : CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy dans `next.config.ts`
- **(A10 SSRF)** : URL de preview maquette validee — whitelist `*.netlify.app` / `*.netlify.com` HTTPS uniquement
- **(A07) Brute-force login** : 5 tentatives / 15 min par IP (Map en memoire) → HTTP 429
- **(A04) Timing-safe cron** : `crypto.timingSafeEqual` + SHA-256 pour la validation du `CRON_SECRET`
- **(A02) Secret JWT** : validation a l'initialisation (`throw` si < 32 chars) — fail-fast au demarrage
- **(A03)** Cle API Pappers en query param — risque documente, accepte (API ne supporte pas Authorization header)
- **(A09)** Suppression de tous les `console.error(raw_err)` dans les routes API et libs
- 2 nouveaux fichiers de tests securite : `src/__tests__/security/`
- Rapport complet : `docs/security-audit.md`
- **Total tests : 303/303 passing**

### Sessions A-D — Maintenance & finalisation Phase 1
- **Session A — Export PDF audit concurrentiel** : composant React-PDF (`src/lib/pdf/audit-pdf.tsx`) page de garde + infos prospect + bloc par concurrent + synthese/recommandations, route `GET /api/prospects/[id]/analyse/pdf` protegee par `requireAuth()` (404 si analyse absente, `Content-Disposition: attachment`), bouton "Exporter en PDF" dans l'onglet Analyse. Lib `@react-pdf/renderer` (server-side, pas de chromium). +5 tests.
- **Session B — Page Clients** : routes CRUD `/api/clients` + `/api/clients/[id]` (allowlist stricte, 404, 409 si deja client), modale au drop colonne "Client" du kanban (annulation = rollback visuel), page `/clients` avec filtres offreType/maintenance + toggle maintenance optimiste + lien fiche prospect, animations fadeInUp/stagger. +21 tests. Modele `Client` Prisma deja present (legacy Stripe ignore via allowlist).
- **Session C — Tests E2E Playwright** : `@playwright/test` + chromium, `playwright.config.ts` (webServer reuseExistingServer, retries 1), `e2e/auth.spec.ts` complet et passing (4 tests : mauvais mdp, bon mdp, logout, redirect sans auth), 9 specs scaffoldees `test.skip` avec TODO precis (prospects, recherche, kanban, maquette), job CI `e2e` (hash bcrypt a la volee, upload artifact si echec).
- **Session D — Nettoyage final** : migration warning Next.js 16 `middleware` -> `proxy` (rename `src/middleware.ts` -> `src/proxy.ts`, fonction `middleware()` -> `proxy()`), `npm audit fix` (vulnerabilite high `vite` path traversal resolue), nettoyage CI (`STITCH_API_KEY` retire). Build + 332 tests verts.

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
PEXELS_API_KEY=<cle API Pexels>
PAPPERS_API_KEY=<cle API Pappers>
NETLIFY_TOKEN=<personal access token Netlify>
RESEND_API_KEY=<cle API Resend>
RESEND_FROM_EMAIL=<adresse email verifee dans Resend>
```

## Commandes

```bash
npm run dev          # Serveur de developpement
npm run build        # Build de production
npm run test         # Tests Vitest
npm run e2e          # Tests E2E Playwright
npm run lint         # Linting ESLint
npx prisma studio    # Visualiser la base de donnees
```

## Tests E2E

Les tests E2E utilisent Playwright (chromium uniquement) et tournent en parallele
de Vitest. Ils sont situes dans `e2e/` et lancent un vrai serveur Next.js via le
champ `webServer` de `playwright.config.ts` (avec `reuseExistingServer: true`).

```bash
# Premier setup (une seule fois)
npx playwright install chromium

# Lancer les tests
npm run e2e

# Mode UI interactif
npx playwright test --ui

# Lister les tests sans les executer
npx playwright test --list
```

Variables d'environnement :

- `E2E_PASSWORD` (defaut `test1234`) — mot de passe en clair correspondant
  au `CRM_PASSWORD_HASH` du `.env.local`. L'auth n'est PAS mockee, on teste
  le vrai flux JWT + bcrypt.
- `E2E_BASE_URL` (defaut `http://localhost:3000`).

Etat actuel des specs : `auth.spec.ts` est complet et passe en local.
Les autres specs (`prospects`, `recherche`, `kanban`, `maquette`) sont
scaffoldees avec `test.skip` + TODO precis sur les selecteurs a confirmer
avant activation.

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
    ├── maquette/           # investigate, build-prompt, generate-site, scrape-identity, pappers, pexels
    ├── netlify-deploy.ts   # Deploiement multi-fichiers Netlify (path/content, SHA1)
    ├── email.ts            # generateProspectionEmail, buildEmailHtml, sendEmail
    ├── dashboard.ts        # getDashboardStats, getDashboardRelances, getDashboardActivites
    └── analyse.ts          # findCompetitorCandidates, scrapeCompetitors, buildAnalyseResult
```
