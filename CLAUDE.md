# CRM Flandre Web Agency v2

## Référence

Le CDC complet est dans ./CDC.md — lis-le pour comprendre le projet global mais ne développe que ce qui est demandé dans la tâche en cours.

## Stack

- Next.js App Router + TypeScript strict
- Prisma ORM — SQLite (dev) / Turso (prod)
- Tailwind CSS + shadcn/ui (thème neutral, mode dark)
- Framer Motion (package "motion") pour les animations
- JWT + bcrypt — authentification mono-utilisateur
- Vitest pour les tests
- Vercel pour le déploiement

## Design System — "Noir Absolu"

Respecte STRICTEMENT ces règles sur CHAQUE composant :

- **Fond** : #000000 (noir pur). Cartes/surfaces : #0a0a0a. Bordures : #1a1a1a (1px, fines).
- **Texte** : #fafafa (principal), #737373 (secondaire), #555555 (très discret).
- **Accent** : blanc (#ffffff) pour les boutons principaux, texte noir dessus.
- **Couleurs sémantiques** : #4ade80 (succès), #fbbf24 (warning), #f87171 (erreur).
- **Border-radius** : 6px partout. Badges pilule : 9999px.
- **Aucun** gradient, aucune ombre portée, aucun blur/glassmorphism.
- **Espacement** : généreux. padding 12-16px sur les cartes. gap 8-12px entre éléments.
- **Font** : system font stack (-apple-system, sans-serif). Pas de font custom.

## Animations (lib/animations.ts)

Utilise les variants Framer Motion définies dans lib/animations.ts :
- **fadeInUp** : montage des cartes et panneaux (300ms, easeOut)
- **staggerContainer + staggerItem** : listes en cascade (50ms entre chaque)
- **expandCollapse** : expand de lignes, ouverture de panneaux
- **hoverLift** : cartes au survol (translateY -1px)
- **progressBar** : barres de scoring (600ms, easeOut)
- **countUp** : compteurs du dashboard (400ms)
- **slideIn** : transitions entre onglets avec AnimatePresence

Durée max 300ms pour les micro-interactions, 400ms pour les entrées de page. Easing "easeOut" par défaut. Jamais de bounce exagéré.

## Règles de développement

1. **TypeScript strict** — pas de `any` sauf exception documentée
2. **requireAuth()** sur CHAQUE API route sans exception
3. **Validation des inputs** côté serveur sur CHAQUE route (type, longueur, format)
4. **Allowlist** des champs modifiables (jamais de mass assignment)
5. **Ne touche jamais .env.local** — propose les variables à ajouter, je les ajoute moi-même
6. **Prisma migrations** — propose la migration avant de l'appliquer, jamais sans validation
7. **Réponses JSON cohérentes** : `{ data: ... }` en succès, `{ error: "message" }` en erreur
8. **Pas de console.log** en production — utilise des logs structurés pour les erreurs
9. **Composants réutilisables** — si un pattern apparaît 2+ fois, extrais un composant
10. **Mobile-first** — chaque composant doit être responsive dès sa création

## Commandes

```bash
npm run dev          # Serveur de développement
npm run build        # Build de production
npm run test         # Tests Vitest
npm run lint         # Linting ESLint
npx prisma studio    # Visualiser la base de données
npx prisma migrate dev --name nom_migration  # Créer une migration
```

## Structure du projet

```
src/
├── app/
│   ├── (dashboard)/        # Pages protégées avec layout sidebar
│   │   ├── page.tsx        # Dashboard
│   │   ├── recherche/      # Recherche de prospects
│   │   ├── prospects/      # Liste + fiche prospect [id]
│   │   ├── pipeline/       # Kanban drag & drop
│   │   ├── emails/         # Prospection email
│   │   ├── clients/        # Suivi post-livraison
│   │   └── parametres/     # Configuration
│   ├── api/                # API routes
│   └── login/              # Page login (hors layout)
├── components/
│   ├── ui/                 # Composants shadcn/ui
│   └── [feature]/          # Composants par feature
└── lib/
    ├── animations.ts       # Variants Framer Motion
    ├── auth.ts             # JWT + bcrypt
    ├── db.ts               # Client Prisma
    ├── validation.ts       # Validation inputs serveur
    ├── anthropic.ts        # Client Anthropic
    ├── scoring.ts          # Scoring multi-axes
    ├── places.ts           # Google Places API
    ├── scrape.ts           # Firecrawl
    ├── maquette/           # Generation de maquettes (buildPrompt, generateSite, pexels, pappers)
    ├── email.ts            # Resend + templates
    └── netlify-deploy.ts   # Déploiement Netlify
```
