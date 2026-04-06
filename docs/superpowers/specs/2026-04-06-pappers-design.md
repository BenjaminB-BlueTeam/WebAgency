# Spec — Enrichissement Pappers (Session 14)

**Date :** 2026-04-06
**CDC référence :** Session 14

---

## Objectif

Intégrer l'API Pappers dans le pipeline de scoring pour enrichir les données légales du prospect (SIRET, date de création, CA, effectifs) et améliorer la pertinence du `scoreFinancier`.

---

## Périmètre

- `lib/pappers.ts` : fonction pure `enrichWithPappers(nom, ville)`
- `scoreFinancier` étendu avec données Pappers
- Migration Prisma : 4 nouveaux champs sur `Prospect`
- Affichage dans `prospect-info-tab.tsx` (section "Données légales")
- Pas de bouton séparé — enrichissement déclenché lors du scoring

---

## Types

### `PappersData`

```ts
export type PappersData = {
  siret: string
  dateCreation: Date
  chiffreAffaires: number | null
  effectifs: string | null  // tranche Pappers ex: "10-19", "50-99"
}
```

---

## `src/lib/pappers.ts` — nouvelle fonction

```ts
export async function enrichWithPappers(
  nom: string,
  ville: string
): Promise<PappersData | null>
```

- `GET https://api.pappers.fr/v2/recherche?q={nom}&ville={ville}&api_token={PAPPERS_API_KEY}`
- Prend le premier résultat (`resultats[0]`)
- Champs mappés depuis la réponse Pappers :
  - `siret` → `resultats[0].siret`
  - `dateCreation` → `new Date(resultats[0].date_creation)`
  - `chiffreAffaires` → `resultats[0].chiffre_affaires ?? null`
  - `effectifs` → `resultats[0].tranche_effectif ?? null`
- Retourne `null` si : aucun résultat, clé API absente, erreur réseau
- Silencieux (log uniquement), ne bloque jamais le scoring

---

## `src/lib/scoring.ts` — modifications

### `scoreFinancier`

Ajoute un 5e paramètre optionnel :

```ts
export async function scoreFinancier(
  activite: string,
  ville: string,
  noteGoogle: number | null,
  nbAvisGoogle: number | null,
  pappersData?: PappersData | null
): Promise<number | null>
```

Quand `pappersData` est fourni, le prompt Claude inclut :
- Ancienneté calculée : `new Date().getFullYear() - pappersData.dateCreation.getFullYear()` ans
- CA : `pappersData.chiffreAffaires` euros
- Effectifs : `pappersData.effectifs`

### `scoreProspect`

Reçoit un 2e paramètre optionnel :

```ts
export async function scoreProspect(
  prospect: ProspectData,
  pappersData?: PappersData | null
): Promise<ScoringResult>
```

Passe `pappersData` à `scoreFinancier`.

---

## `POST /api/prospects/[id]/score` — modifications

Avant d'appeler `scoreProspect` :

```ts
const pappersData = await enrichWithPappers(prospect.nom, prospect.ville).catch(() => null)
const scores = await scoreProspect(prospect, pappersData)
```

`prisma.prospect.update` inclut les champs Pappers si enrichissement réussi :

```ts
data: {
  ...scores,
  ...(pappersData ? {
    siret: pappersData.siret,
    dateCreation: pappersData.dateCreation,
    chiffreAffaires: pappersData.chiffreAffaires,
    effectifs: pappersData.effectifs,
  } : {}),
}
```

---

## Prisma — migration

Champs ajoutés au modèle `Prospect` :

```prisma
siret           String?
dateCreation    DateTime?
chiffreAffaires Int?
effectifs       String?
```

Migration : `npx prisma migrate dev --name add_pappers_fields`

Ces champs ne sont **pas** ajoutés à `PROSPECT_UPDATE_FIELDS` — écrits uniquement par le scoring.

---

## Affichage — `src/components/prospects/prospect-info-tab.tsx`

Nouvelle section **"Données légales"** conditionnelle (affichée si au moins un champ Pappers est non-null), placée après le bloc Google et avant le scoring.

Affichage :
- **SIRET** : `prospect.siret` — copiable au clic (copie dans le presse-papier)
- **Création** : `prospect.dateCreation` formatée `DD/MM/YYYY` + "(N ans)" calculé depuis aujourd'hui
- **Chiffre d'affaires** : `prospect.chiffreAffaires` formaté `450 000 €`
- **Effectifs** : `prospect.effectifs` + " salariés"

---

## Tests

### `src/__tests__/lib/pappers.test.ts` (nouveau)

- Retourne `null` si `PAPPERS_API_KEY` absent
- Retourne `null` si aucun résultat (`resultats: []`)
- Mappe correctement les champs depuis `resultats[0]`
- Retourne `null` si fetch throw (silencieux)

### `src/__tests__/lib/scoring.test.ts` — additions

- `scoreFinancier` avec `pappersData` → prompt contient l'ancienneté, le CA, les effectifs
- `scoreFinancier` sans `pappersData` → prompt inchangé (compat ascendante)

### `src/__tests__/api/score.test.ts` — additions

- Vérifie que `enrichWithPappers` est appelé avec `nom` et `ville` du prospect
- Si `enrichWithPappers` retourne `null`, les champs Pappers ne sont pas dans l'update
- Si `enrichWithPappers` retourne des données, elles sont incluses dans l'update

---

## Variable d'environnement

```
PAPPERS_API_KEY=<clé Pappers>
```

À ajouter dans `.env.local`.

---

## Gestion d'erreurs

| Cas | Comportement |
|-----|-------------|
| `PAPPERS_API_KEY` absent | `enrichWithPappers` retourne `null`, scoring continue |
| Aucun résultat Pappers | `enrichWithPappers` retourne `null`, scoring continue |
| Erreur réseau Pappers | Catch silencieux, `null`, scoring continue |
| `chiffreAffaires` null | Champ non affiché dans l'UI |
| `effectifs` null | Champ non affiché dans l'UI |

---

## Hors périmètre

- Sélection manuelle parmi plusieurs résultats Pappers
- Enrichissement automatique à la création du prospect
- Mise à jour des données légales sans rescoring
- Historique des enrichissements
