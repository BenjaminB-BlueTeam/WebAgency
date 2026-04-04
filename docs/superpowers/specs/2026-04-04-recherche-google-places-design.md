# Recherche Google Places — Design Spec

**Date:** 2026-04-04
**Status:** Approved

## Overview

Page de recherche de prospects via Google Places API. L'utilisateur saisit une activite et une ville, les resultats sont affiches en cartes avec detection de doublons, selection par checkbox et enregistrement en base.

## Architecture

```
src/lib/places.ts                          # Client Google Places API
src/types/places.ts                        # Types PlaceResult
src/app/api/prospection/search/route.ts    # POST recherche
src/app/api/prospection/save/route.ts      # POST enregistrement
src/components/recherche/search-form.tsx    # Formulaire
src/components/recherche/search-results.tsx # Liste resultats + bouton save
src/components/recherche/result-card.tsx    # Carte resultat + expand
src/app/(dashboard)/recherche/page.tsx     # Page client component
```

## Lib Google Places (lib/places.ts)

Fonction `searchPlaces(query: string, ville: string): Promise<PlaceResult[]>`

- POST `https://places.googleapis.com/v1/places:searchText`
- Headers: `X-Goog-Api-Key` (env `GOOGLE_PLACES_KEY`), `X-Goog-FieldMask`
- Body: `{ textQuery: "${query} ${ville}" }`
- FieldMask: `places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.types`
- Parse la reponse en PlaceResult[]
- Erreurs: cle invalide (403), quota (429), reseau → message descriptif

## Types (types/places.ts)

```typescript
interface PlaceResult {
  placeId: string
  nom: string
  adresse: string
  telephone: string | null
  siteUrl: string | null
  noteGoogle: number | null
  nbAvisGoogle: number | null
  types: string[]
}

interface SearchResult extends PlaceResult {
  dejaEnBase: boolean
}
```

## API Routes

### POST /api/prospection/search

- Body: `{ query: string, ville: string, rayon: number }`
- Validation: query 1-100 chars requis, ville 1-100 chars requis, rayon enum [5000, 10000, 20000, 30000]
- Appelle searchPlaces(query, ville)
- Verifie doublons par placeId en base
- Cree entree Recherche (query, ville, resultatsCount, prospectsAjoutes: 0)
- Retourne `{ data: { rechercheId: string, resultats: SearchResult[] } }`

### POST /api/prospection/save

- Body: `{ rechercheId: string, prospects: PlaceResult[] }`
- Pour chaque prospect: prisma.prospect.create avec:
  - nom, activite (premier type ou "Entreprise"), ville (extraite de l'adresse formatee), adresse, telephone, siteUrl, placeId, noteGoogle, nbAvisGoogle
  - statutPipeline: "A_DEMARCHER"
  - scorePresenceWeb: siteUrl ? 3 : 10
- Skip doublons silencieusement (placeId existant)
- Met a jour Recherche.prospectsAjoutes
- Cree Activite par prospect (type: "RECHERCHE")
- Retourne `{ data: { saved: number, skipped: number } }`

## Page UI

### Formulaire (search-form.tsx)

- Input "Activite" placeholder "Ex: boulangerie, coiffeur..."
- Input "Ville" placeholder "Ex: Lille, Roubaix..."
- Select "Rayon": 5 km, 10 km, 20 km, 30 km (defaut 10 km)
- Bouton "Rechercher" avec loader
- Flex row desktop, stack mobile

### Resultats (search-results.tsx + result-card.tsx)

- Grille 2 colonnes desktop, 1 colonne mobile, gap 8px
- Carte: fond #0a0a0a, bordure #1a1a1a, radius 6px, padding 12px
  - Checkbox coin superieur droit (disabled si dejaEnBase)
  - Nom (titre #fafafa), adresse (sous-titre #737373)
  - Note Google: etoile jaune + chiffre + "(X avis)"
  - Badge "A un site" vert (#4ade80) ou "Pas de site" orange (#fbbf24)
  - Badge "Deja enregistre" gris (#737373) si doublon
- Clic carte (hors checkbox) → expand avec expandCollapse:
  - Adresse complete
  - Telephone
  - Lien site web
  - Barre score presence web (ScoreBar: 3/10 ou 10/10)
- Bouton "Enregistrer les selectionnes (X)" en bas, disabled si 0
- Apres enregistrement: toast succes, badges mis a jour, checkboxes reset
- Animation staggerContainer + staggerItem sur les cartes

### Etats

- Loading: skeleton cards pendant la recherche
- Vide: "Aucun resultat trouve" si 0 resultat
- Erreur: toast erreur avec message

## Test

Un test unitaire qui mock fetch et verifie que searchPlaces() parse la reponse Google Places en PlaceResult[].

## Ce qui N'est PAS inclus

- Pappers API, PageSpeed Insights, Firecrawl+Claude (sessions futures)
- Autocomplete sur le champ ville
- Utilisation reelle du rayon (stocke pour reference, Google gere via textQuery)
