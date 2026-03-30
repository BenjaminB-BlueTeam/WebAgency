# CRM Redesign — Design System Glassmorphism Violet

**Date :** 2026-03-30
**Auteur :** Benjamin Bourger
**Statut :** Approuvé

---

## Contexte

Le CRM actuel (Next.js 16 + Tailwind + Prisma SQLite) présente une UI plate : fonds uniformes zinc, accent amber générique, aucune profondeur visuelle. L'objectif est d'élever le rendu au niveau "haut de gamme" sans toucher à la structure des pages.

---

## Décisions de design

| Dimension | Choix |
|---|---|
| Style général | Glassmorphism |
| Couleur d'accent | Violet profond (`#7c3aed` / `#a78bfa`) |
| Périmètre | Design system uniquement (globals.css + composants partagés) |
| Approche | Option 2 : CSS Variables + réécriture des composants partagés |

---

## Scope : fichiers modifiés

### 1. `globals.css`
Mise à jour des CSS custom properties dark mode :

- `--background` : `oklch(0.06 0.02 260)` — quasi-noir teinté bleu (remplace zinc pur)
- `--primary` : `oklch(0.55 0.25 280)` — violet `#7c3aed`
- `--primary-foreground` : blanc
- `--card` : `oklch(0.10 0.01 260)`
- `--sidebar` : `oklch(0.07 0.02 265)` — légèrement plus sombre que bg
- `--sidebar-primary` : violet (même que `--primary`)
- `--ring` : violet (focus ring)
- Nouvelle variable : `--glow-primary: rgba(124, 58, 237, 0.3)`
- Nouvelle variable : `--glow-danger: rgba(239, 68, 68, 0.2)`
- Classe utilitaire `.glass` : `background: rgba(255,255,255,0.04); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06);`
- Classe `.glass-violet` : variante avec teinte violet (cards CA potentiel, items actifs)
- Classe `.glass-danger` : variante rouge (card À relancer avec urgences)
- Classe `.glow-line` : `height: 1px; background: linear-gradient(90deg, transparent, rgba(167,139,250,0.3), transparent)` — reflet haut de card

### 2. `src/components/layout/sidebar.tsx`
- Background sidebar : `rgba(255,255,255,0.03)` + `backdrop-filter: blur(16px)`
- Border droite : `rgba(124,58,237,0.12)`
- Logo "W" : gradient violet `#7c3aed → #a78bfa` + `box-shadow: 0 0 16px rgba(124,58,237,0.5)`
- Item actif : `.glass-violet` + border `rgba(124,58,237,0.25)` + texte `#a78bfa`
- Item hover : `rgba(255,255,255,0.04)` background
- Avatar utilisateur : gradient violet → remplace texte "N" zinc
- Séparateur nav : `rgba(255,255,255,0.06)`

### 3. `src/components/dashboard/stat-card.tsx`
- Base : classe `.glass` + `border-radius: 12px`
- Ligne de reflet en haut : `.glow-line` (pseudo-élément ou div)
- Card CA Potentiel : `.glass-violet` (mise en valeur)
- Card À relancer : `.glass-danger` si `value > 0`, sinon `.glass` standard
- Valeur : `font-size: clamp(1.8rem, 3vw, 2rem)`, `font-weight: 700`, `letter-spacing: -0.03em`
- Label : `font-size: 9px`, `text-transform: uppercase`, `letter-spacing: 0.12em`, `opacity: 0.4`

### 4. `src/components/dashboard/pipeline-bar.tsx`
- Container : `.glass` + `border-radius: 12px`
- Segments : gradient `from → to` par couleur + `box-shadow` glow coloré
- Légende : dots colorés ronds avec glow (`box-shadow: 0 0 4px <couleur>`)
- Label chaque segment : `font-size: 9px`, uppercase

### 5. `src/components/dashboard/recent-activity.tsx`
- Container : `.glass` + `border-radius: 12px`
- Dots timeline : colorés par type + glow léger
- Texte activité : `rgba(255,255,255,0.7)`
- Date : `rgba(255,255,255,0.25)`, alignée à droite

### 6. `src/components/dashboard/alerts-relance.tsx`
- Container : `.glass` (ou `.glass-danger` si urgences présentes)
- Badge priorité HAUTE : `background: rgba(239,68,68,0.15)`, `border: 1px solid rgba(239,68,68,0.3)`, texte `#f87171`
- Jours depuis contact : texte rouge si > 14j, jaune si 7-14j

### 7. Layout background (`(dashboard)/layout.tsx`)
- Ajout d'un fond gradient sur le wrapper principal : `background: linear-gradient(135deg, #0a0814 0%, #090b18 50%, #080d14 100%)`
- Deux blobs d'ambiance (divs positionnés absolus, `pointer-events: none`) :
  - Violet en haut à droite : `radial-gradient(circle, rgba(124,58,237,0.08), transparent 70%)`
  - Bleu en bas à gauche : `radial-gradient(circle, rgba(59,130,246,0.05), transparent 70%)`

---

## Ce qui ne change PAS

- Structure des pages (routes, data fetching, logique)
- Composants UI de base (`button.tsx`, `input.tsx`, `dialog.tsx`, etc.) — ils héritent des nouvelles CSS vars automatiquement
- Schéma Prisma, API routes
- Composants prospects/maquettes/devis/factures — ils héritent du nouveau design system

---

## Résultat attendu

Toutes les pages du CRM adoptent automatiquement le nouveau rendu via l'héritage CSS. Seul le dashboard bénéficie en plus des composants retravaillés (stat-cards, pipeline, activité, relances). L'upgrade visuel est immédiat et cohérent sur l'ensemble de l'application.
