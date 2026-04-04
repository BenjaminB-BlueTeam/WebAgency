# Page Prospects (UI liste + fiche) — Design Spec

**Date:** 2026-04-04
**Status:** Approved

## Overview

Interface complète pour voir et gérer les prospects : page liste avec tableau filtrable/triable/expandable + fiche prospect dédiée avec onglets. Respecte strictement le design system "Noir Absolu" et les animations définies dans `lib/animations.ts`.

## Architecture des composants

```
src/app/(dashboard)/prospects/
├── page.tsx                    # Server component wrapper (fetch SSR)
└── [id]/
    └── page.tsx                # Server component wrapper (fetch SSR)

src/components/prospects/
├── prospect-list.tsx           # Client: tableau + filtres + expand + état vide
├── prospect-row.tsx            # Ligne du tableau desktop
├── prospect-card-mobile.tsx    # Carte mobile
├── prospect-expand.tsx         # Panneau expand sous une ligne/carte
├── prospect-filters.tsx        # Barre de recherche + dropdown statut + slider score
├── prospect-detail.tsx         # Client: fiche complète avec onglets
├── prospect-info-tab.tsx       # Onglet Informations
├── prospect-activity-tab.tsx   # Onglet Activité (timeline)
├── prospect-notes.tsx          # Section notes (liste + formulaire ajout)
├── score-bar.tsx               # Barre de scoring réutilisable
├── status-badge.tsx            # Badge statut pipeline (couleur par statut)
└── empty-state.tsx             # Bloc onboarding quand aucun prospect
```

## Composants shadcn à installer

- `Select` — dropdown statut pipeline (filtres + fiche)
- `Slider` — filtre score minimum
- `Skeleton` — loading states pendant le fetch

## Data Flow

### Page Liste (`/prospects`)

1. `page.tsx` (server component) : fetch `/api/prospects` côté serveur avec cookies forwarded
2. Passe les données à `prospect-list.tsx` (client component)
3. `prospect-list.tsx` gère les filtres côté client : re-fetch API à chaque changement de filtre (debounce 300ms sur la recherche)
4. Les query params sont construits à partir des filtres et passés à l'API : `?search=&statut=&scoreMin=&sort=&order=`

### Fiche Prospect (`/prospects/[id]`)

1. `page.tsx` (server component) : fetch `/api/prospects/[id]` côté serveur
2. Passe les données à `prospect-detail.tsx` (client component)
3. Mutations gérées côté client : PATCH statut, POST note, DELETE note
4. Toast (sonner) sur succès/erreur

## Page Liste — Spécifications détaillées

### Filtres (`prospect-filters.tsx`)

- **Recherche** : `Input` avec icône `Search` (lucide-react), placeholder "Rechercher un prospect...", debounce 300ms
- **Statut** : `Select` shadcn avec options : Tous (défaut), A_DEMARCHER, CONTACTE, RDV_PLANIFIE, MAQUETTE_ENVOYEE, RELANCE, SIGNE, PERDU. Labels affichés en français : "A démarcher", "Contacté", "RDV planifié", "Maquette envoyée", "Relance", "Signé", "Perdu"
- **Score minimum** : `Slider` shadcn, range 0-10, pas de 1, label "Score min: X"
- Layout : flex row sur desktop, stack sur mobile, gap 12px, fond transparent

### Tableau desktop (md+) (`prospect-list.tsx` + `prospect-row.tsx`)

**Colonnes :**

| Colonne | Contenu | Triable | Largeur |
|---------|---------|---------|---------|
| Nom | Texte | Oui (sort=nom) | flex-1 |
| Activité | Texte | Non | auto |
| Ville | Texte | Non | auto |
| Score | Pastille colorée 24px + chiffre | Oui (sort=scoreGlobal) | 80px |
| Note Google | Etoile + chiffre (ex: "4.2") | Non | 80px |
| Site | "Oui" (vert) / "Non" (gris) | Non | 60px |
| Statut | Badge pilule coloré | Non | auto |
| Date ajout | Format relatif ("il y a 3j") | Oui (sort=createdAt) | auto |

**Tri :** clic sur en-tête triable → toggle asc/desc. Flèche ▲/▼ affichée à côté du header actif. Défaut : createdAt desc.

**Ligne :** fond transparent, hover `#0a0a0a`, cursor pointer. Clic → expand sous la ligne.

**Animation montage :** `staggerContainer` sur le `<tbody>`, `staggerItem` sur chaque `<tr>`.

### Cartes mobile (<md) (`prospect-card-mobile.tsx`)

- Carte : fond `#0a0a0a`, bordure `#1a1a1a` 1px, border-radius 6px, padding 12px
- Layout : Nom (titre, `#fafafa`) + Activité (sous-titre, `#737373`) en haut, puis ligne Ville + Badge statut + Pastille score
- Carte cliquable → expand sous la carte
- Stack vertical gap 8px
- Animation : `staggerContainer` + `staggerItem`
- Hover : `hoverLift` (translateY -1px)

### Expand (`prospect-expand.tsx`)

- Animation : `expandCollapse` avec `motion.div` layout
- Fond `#0a0a0a`, bordure top `#1a1a1a`, padding 16px
- Contenu organisé en grille :
  - **Infos contact** : téléphone, email (lien mailto:), adresse
  - **Google** : note Google (étoile + chiffre) + nombre d'avis
  - **Site web** : lien cliquable si `siteUrl` existe, sinon "Aucun site" en gris
  - **Scoring détaillé** : 5 mini-barres (`score-bar.tsx`), une par axe :
    - Présence Web (`scorePresenceWeb`)
    - SEO (`scoreSEO`)
    - Design (`scoreDesign`)
    - Financier (`scoreFinancier`)
    - Potentiel (`scorePotentiel`)
  - **3 boutons action** :
    - "Voir fiche" → lien `/prospects/[id]` (actif)
    - "Analyser concurrence" → placeholder (disabled, opacity 0.5)
    - "Démarcher" → placeholder (disabled, opacity 0.5)

### Barre de scoring (`score-bar.tsx`)

- Hauteur 4px, fond `#1a1a1a`, remplissage blanc, border-radius 2px
- Label à gauche (nom de l'axe), valeur à droite ("/10")
- Animation `progressBar(value * 10)` au montage (valeur sur 10, barre sur 100%)
- Si valeur null : barre vide, afficher "—"

### Badge statut (`status-badge.tsx`)

Fond `#1a1a1a`, border-radius 9999px (pilule), padding 4px 10px, font-size 12px.

| Statut | Texte affiché | Couleur texte |
|--------|---------------|---------------|
| A_DEMARCHER | A démarcher | `#737373` |
| CONTACTE | Contacté | `#fafafa` |
| RDV_PLANIFIE | RDV planifié | `#fbbf24` |
| MAQUETTE_ENVOYEE | Maquette envoyée | `#fbbf24` |
| RELANCE | Relance | `#fafafa` |
| SIGNE | Signé | `#4ade80` |
| PERDU | Perdu | `#f87171` |

### Pastille score global

- Cercle 24px, centré, font-size 11px, font-weight bold
- Vert `#4ade80` si score >= 7
- Orange `#fbbf24` si score 4-6
- Rouge `#f87171` si score < 4
- Gris `#737373` si null/undefined, afficher "—"

### État vide (`empty-state.tsx`)

- Centré verticalement et horizontalement
- Icône `Users` (lucide-react), taille 48px, couleur `#555555`
- Titre : "Commencez par rechercher des prospects"
- Description : "Utilisez la recherche pour trouver des entreprises dans votre zone, évaluez leur potentiel et démarrez votre prospection."
- Bouton blanc → `/recherche` : "Lancer une recherche"
- Animation `fadeInUp` au montage

### Loading state

- `Skeleton` shadcn : 8 lignes squelettes dans le tableau
- Fond `#0a0a0a`, animation pulse native shadcn
- Affiché pendant le fetch initial et les changements de filtres

## Fiche Prospect — Spécifications détaillées

### Layout (`prospect-detail.tsx`)

- Header : bouton retour (← Prospects, lien /prospects) + Nom (h1) + Badge statut modifiable
- Sous le header : `Tabs` shadcn avec 4 onglets
- Animation `slideIn` + `AnimatePresence` sur le contenu des onglets

### Onglet Informations (`prospect-info-tab.tsx`)

**Section Contact (grille 2 colonnes desktop, 1 mobile) :**
- Activité, Ville, Adresse, Téléphone (lien tel:), Email (lien mailto:), Site web (lien externe)
- Chaque champ : label `#737373` + valeur `#fafafa`
- Si valeur absente : "—" en `#555555`

**Section Scoring :**
- Score global : pastille colorée grande (40px) avec le chiffre
- 5 barres de scoring détaillées (`score-bar.tsx`) avec animation `progressBar`
- Carte fond `#0a0a0a`, bordure `#1a1a1a`, padding 16px

**Section Statut Pipeline :**
- `Select` shadcn avec toutes les valeurs de statut
- Au changement → PATCH `/api/prospects/[id]` avec `{ statutPipeline: newValue }`
- Toast succès "Statut mis à jour" / erreur

**Section Notes (`prospect-notes.tsx`) :**
- Liste des notes : date (relative) + contenu, triées par date desc
- Bouton supprimer (icône Trash, rouge au hover) → DELETE `/api/notes/[id]`
- Formulaire ajout : `textarea` (placeholder "Ajouter une note...") + bouton "Ajouter"
- Au submit → POST `/api/prospects/[id]/notes` avec `{ contenu }`
- Toast succès / erreur
- Animation `staggerContainer` + `staggerItem` sur la liste

### Onglet Analyse (placeholder)

- Centré : icône `Search` (lucide-react), taille 48px, `#555555`
- Texte : "Aucune analyse concurrentielle"
- Bouton "Lancer l'analyse" — style outline, disabled (opacity 0.5, cursor not-allowed)

### Onglet Maquette (placeholder)

- Centré : icône `Palette` (lucide-react), taille 48px, `#555555`
- Texte : "Aucune maquette générée"
- Bouton "Générer une maquette" — style outline, disabled

### Onglet Activité (`prospect-activity-tab.tsx`)

- Timeline verticale : ligne 1px `#1a1a1a` à gauche, padding-left 24px
- Chaque événement :
  - Point sur la timeline (cercle 8px, fond `#1a1a1a`, bordure `#333`)
  - Icône par type :
    - `CHANGEMENT_STATUT` → `ArrowRightLeft`
    - `NOTE` → `StickyNote`
    - `EMAIL` → `Mail`
    - `RECHERCHE` → `Search`
    - Défaut → `Activity`
  - Description (texte `#fafafa`)
  - Date relative (`#737373`, "il y a 3 jours")
- Animation `staggerContainer` + `fadeInUp` sur chaque événement
- Si aucune activité : "Aucune activité enregistrée" centré

## Design System Strict

- **Fond page** : `#000000`
- **Cartes/surfaces** : `#0a0a0a`
- **Bordures** : `#1a1a1a`, 1px
- **Border-radius** : 6px partout, 9999px pour badges pilule
- **Texte principal** : `#fafafa`
- **Texte secondaire** : `#737373`
- **Texte discret** : `#555555`
- **Boutons principaux** : fond blanc, texte noir
- **AUCUN** gradient, AUCUNE ombre portée, AUCUN blur/glassmorphism
- **Espacement** : padding 12-16px cartes, gap 8-12px éléments
- **Font** : system font stack

## Animations utilisées

| Composant | Animation | Source |
|-----------|-----------|--------|
| Liste prospects (montage) | `staggerContainer` + `staggerItem` | `lib/animations.ts` |
| Cartes mobile (montage) | `staggerContainer` + `staggerItem` | `lib/animations.ts` |
| Cartes mobile (hover) | `hoverLift` | `lib/animations.ts` |
| Expand ligne/carte | `expandCollapse` | `lib/animations.ts` |
| Barres scoring | `progressBar(value)` | `lib/animations.ts` |
| Changement d'onglet | `slideIn` + `AnimatePresence` | `lib/animations.ts` |
| Timeline activité | `staggerContainer` + `fadeInUp` | `lib/animations.ts` |
| État vide | `fadeInUp` | `lib/animations.ts` |

## Ce qui N'est PAS inclus

- Appels aux APIs externes (Google Places, Firecrawl, etc.)
- Logique de scoring (remplissage automatique des scores)
- Génération de maquettes
- Analyse concurrentielle
- Envoi d'emails

Tout est basé sur les données déjà en base via les API routes de la Session 2.
