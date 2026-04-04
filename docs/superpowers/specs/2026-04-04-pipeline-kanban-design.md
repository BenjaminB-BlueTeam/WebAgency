# Pipeline Kanban — Design Spec

**Date:** 2026-04-04
**Status:** Approved

## Overview

Page Pipeline avec kanban drag & drop. 7 colonnes correspondant aux statuts pipeline existants. Drag desktop + tactile mobile via @dnd-kit. Drop met a jour le statut via PATCH API. Drop dans "Perdu" affiche une modale demandant la raison.

## Colonnes

| Ordre | Label | Valeur Prisma |
|-------|-------|---------------|
| 1 | A demarcher | A_DEMARCHER |
| 2 | Contacte | CONTACTE |
| 3 | RDV planifie | RDV_PLANIFIE |
| 4 | Maquette envoyee | MAQUETTE_ENVOYEE |
| 5 | Relance | RELANCE |
| 6 | Signe | SIGNE |
| 7 | Perdu | PERDU |

## Architecture

```
src/components/pipeline/
├── kanban-board.tsx       # Client component principal (DndContext)
├── kanban-column.tsx      # Colonne droppable
├── kanban-card.tsx        # Carte draggable
└── lost-reason-modal.tsx  # Modale raison de perte
src/app/(dashboard)/pipeline/page.tsx  # Page server component
```

## Dependances

- `@dnd-kit/core` — DndContext, useDroppable, useDraggable, DragOverlay
- `@dnd-kit/sortable` — pas necessaire (on ne trie pas dans une colonne, on deplace entre colonnes)
- `@dnd-kit/utilities` — CSS transform helper

## Kanban Board (kanban-board.tsx)

- "use client"
- Fetch GET /api/prospects au montage
- Grouper les prospects par statutPipeline dans un Map/Record
- DndContext avec MouseSensor + TouchSensor (activationConstraint distance 5px pour eviter conflit scroll)
- DragOverlay pour afficher la carte en cours de drag
- onDragEnd: identifier la colonne cible, si "PERDU" → ouvrir modale, sinon → PATCH direct
- Apres PATCH: mettre a jour l'etat local (deplacer la carte dans la bonne colonne)
- Toast succes/erreur

## Kanban Column (kanban-column.tsx)

- useDroppable avec id = statut pipeline
- Header: label + compteur "(X)"
- Zone scrollable verticalement (max-h-[calc(100vh-200px)] overflow-y-auto)
- Style quand isOver: bordure plus claire (#333)
- Fond #000, bordure #1a1a1a, radius 6px
- Largeur: min-w-[220px] flex-shrink-0

## Kanban Card (kanban-card.tsx)

- useDraggable avec id = prospect.id
- Contenu: nom (bold), activite + ville (gris), ScorePastille, date relative "depuis Xj"
- Clic → navigation /prospects/[id] (sauf si en cours de drag)
- Fond #0a0a0a, bordure #1a1a1a, radius 6px, padding 12px
- Hover: hoverLift (via motion)
- Pendant le drag: opacity 0.5 sur la carte source, DragOverlay montre la carte

## Lost Reason Modal (lost-reason-modal.tsx)

- Overlay noir/60, modale centree fond #0a0a0a bordure #1a1a1a
- Titre "Raison de perte"
- Textarea pour la raison
- Boutons "Annuler" (outline) + "Confirmer" (default)
- Au confirmer: PATCH avec { statutPipeline: "PERDU", raisonPerte: raison }
- Si annuler: la carte revient a sa position d'origine

## Page Pipeline (page.tsx)

- Server component, fetch direct Prisma (comme /prospects)
- Passe les prospects a KanbanBoard
- h1 "Pipeline"

## Responsive

- Desktop: flex row, scroll horizontal avec overflow-x-auto
- Mobile: scroll horizontal avec snap (scroll-snap-type: x mandatory, scroll-snap-align: start)
- Colonnes min-w-[220px] pour forcer le scroll horizontal sur mobile
- Touch sensor avec activation delay 150ms pour ne pas conflit avec le scroll

## Loading

- Skeleton: 7 colonnes avec 3 placeholder cards chacune
- Fond #0a0a0a, animation pulse

## Design

- Fond page #000
- Colonnes: fond transparent, bordure #1a1a1a
- Cartes: fond #0a0a0a, bordure #1a1a1a, radius 6px
- Header colonne: texte #737373, compteur #555555
- Drop zone active: bordure #333

## Ce qui N'est PAS inclus

- Logique email, generation maquette, relances
- Reordonnement dans une colonne (les cartes sont simplement listees)
- Filtres ou recherche sur le kanban
