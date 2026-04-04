# CRUD Prospects + API Routes — Design Spec

**Date:** 2026-04-04
**Status:** Approved

## Overview

CRUD complet des prospects : API routes protégées pour créer, lire, modifier, supprimer des prospects, ainsi que gérer leurs activités et notes. Base de toute la logique métier du CRM.

## Routes

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/prospects` | Liste avec search, statut, scoreMin, sort, order |
| POST | `/api/prospects` | Création (nom, activite, ville requis + contact optionnel) |
| GET | `/api/prospects/[id]` | Détail avec toutes les relations |
| PATCH | `/api/prospects/[id]` | Modification partielle avec allowlist |
| DELETE | `/api/prospects/[id]` | Suppression cascade Prisma |
| GET | `/api/prospects/[id]/activites` | Liste activités (date desc) |
| POST | `/api/prospects/[id]/activites` | Ajout activité manuelle (type NOTE) |
| POST | `/api/prospects/[id]/notes` | Ajout note |
| DELETE | `/api/notes/[id]` | Suppression note |

## Allowlists

### POST /api/prospects (création)

Champs acceptés : `nom`, `activite`, `ville`, `adresse`, `telephone`, `email`, `siteUrl`

### PATCH /api/prospects/[id] (modification)

Champs acceptés : `nom`, `activite`, `ville`, `adresse`, `telephone`, `email`, `siteUrl`, `placeId`, `noteGoogle`, `nbAvisGoogle`, `statutPipeline`, `dateContact`, `dateRdv`, `dateMaquetteEnvoi`, `dateSignature`, `raisonPerte`, `derniereRelance`, `prochaineRelance`

Champs interdits (calculés/système) : `id`, `createdAt`, `updatedAt`, `scorePresenceWeb`, `scoreSEO`, `scoreDesign`, `scoreFinancier`, `scorePotentiel`, `scoreGlobal`

## Validation

| Champ | Règles |
|-------|--------|
| `nom` | string, 1-100 chars, requis (POST) |
| `activite` | string, 1-100 chars, requis (POST) |
| `ville` | string, 1-100 chars, requis (POST) |
| `adresse` | string, max 200 chars, optionnel |
| `telephone` | string, max 20 chars, optionnel |
| `email` | regex email basique, optionnel |
| `siteUrl` | string, max 500 chars, optionnel |
| `statutPipeline` | enum parmi : A_DEMARCHER, CONTACTE, RDV_PLANIFIE, MAQUETTE_ENVOYEE, RELANCE, SIGNE, PERDU |
| `noteGoogle` | number (float), optionnel |
| `nbAvisGoogle` | number (int), optionnel |
| Dates | format ISO 8601 string, optionnel |
| `raisonPerte` | string, max 500 chars, optionnel |

Doublon : catch de l'erreur Prisma unique constraint P2002 sur `(nom, ville)` → 409 Conflict.

## Filtres GET /api/prospects

| Param | Comportement |
|-------|-------------|
| `search` | Filtre OR sur `nom`, `activite`, `ville` — récupère tous les prospects puis filtre côté JS avec `toLowerCase().includes()` (SQLite ne supporte pas `mode: "insensitive"` dans Prisma) |
| `statut` | Filtre exact sur `statutPipeline` |
| `scoreMin` | `gte` sur `scoreGlobal` (parseFloat) |
| `sort` | Colonne de tri : `nom`, `scoreGlobal`, `createdAt` (défaut: `createdAt`) |
| `order` | Direction : `asc`, `desc` (défaut: `desc`) |

Note sur le search : pour les petits volumes de données attendus (centaines de prospects max), le filtrage côté JS après fetch est acceptable. Si le volume augmente, on passera à un filtre SQL raw.

## Comportement PATCH spécial

Si `statutPipeline` est modifié (valeur différente de l'actuelle) :
1. Mettre à jour le prospect
2. Créer automatiquement une `Activite` :
   - `type`: `"CHANGEMENT_STATUT"`
   - `description`: `"Statut changé de {ancien} vers {nouveau}"`
   - `prospectId`: id du prospect

Ceci est fait dans une transaction Prisma pour garantir l'atomicité.

## Réponses JSON

Succès :
```json
{ "data": { ... } }
```

Erreur :
```json
{ "error": "Message descriptif" }
```

Codes HTTP :
- 200 : succès GET/PATCH/DELETE
- 201 : succès POST (création)
- 400 : validation échouée
- 401 : non authentifié
- 404 : ressource non trouvée
- 409 : doublon (nom+ville)
- 500 : erreur serveur

## Structure fichiers

```
src/app/api/
├── prospects/
│   ├── route.ts              # GET (liste) + POST (création)
│   └── [id]/
│       ├── route.ts          # GET (détail) + PATCH + DELETE
│       ├── activites/
│       │   └── route.ts      # GET + POST
│       └── notes/
│           └── route.ts      # POST
├── notes/
│   └── [id]/
│       └── route.ts          # DELETE
```

## Tests (Vitest, mocks Prisma)

Approche : tests unitaires avec mocks de Prisma et `requireAuth()`. Pas de DB réelle.

### Tests à écrire

1. **POST /api/prospects — validation**
   - Cas valide : nom + activite + ville → 201
   - Champs manquants : nom absent → 400
   - Doublon : mock erreur P2002 → 409

2. **Allowlist**
   - POST avec `id`, `createdAt`, `scoreGlobal` dans le body → ces champs sont ignorés
   - PATCH avec `id`, `createdAt`, `scoreGlobal` dans le body → ces champs sont ignorés

3. **Filtre search**
   - Search "boulang" matche un prospect avec nom "Boulangerie Dupont"
   - Search "lille" matche un prospect avec ville "Lille"
   - Search "xyz" ne matche rien

### Setup Vitest

- Installer `vitest` en devDependency
- Ajouter script `"test": "vitest run"` dans package.json
- Config dans `vitest.config.ts` avec alias `@/` → `src/`
- Fichiers tests dans `src/__tests__/api/`

## Décisions prises

- **Pas de soft delete** : suppression directe, le cascade Prisma gère les relations
- **Search côté JS** : acceptable pour le volume attendu, évite la complexité de raw SQL
- **Scores exclus de l'allowlist** : seront calculés automatiquement par le module scoring (future session)
- **Transaction pour changement de statut** : garantit que l'Activite est toujours créée avec le changement
