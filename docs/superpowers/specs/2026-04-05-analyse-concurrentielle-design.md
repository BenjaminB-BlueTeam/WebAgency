# Analyse Concurrentielle — Design Spec

**Date :** 2026-04-05
**Session :** 11
**Fonctionnalité :** Onglet Analyse de la fiche prospect (CDC section 3.3 — Onglet 2)

---

## Objectif

Permettre de lancer une analyse concurrentielle sur un prospect : rechercher jusqu'à 5 concurrents locaux ayant un site web, scraper leurs sites, faire analyser par Claude (forces, faiblesses, positionnement, recommandations), sauvegarder le résultat et l'afficher dans l'onglet Analyse de la fiche prospect.

---

## Architecture

### Fichiers créés / modifiés

| Statut | Fichier | Rôle |
|--------|---------|------|
| Modifier | `prisma/schema.prisma` | Ajouter `@unique` sur `Analyse.prospectId` |
| Modifier | `src/lib/anthropic.ts` | Ajouter paramètre optionnel `maxTokens?: number` à `analyzeWithClaude` |
| Créer | `src/lib/analyse.ts` | 3 fonctions : findCompetitorCandidates, scrapeCompetitors, buildAnalyseResult |
| Créer | `src/app/api/prospects/[id]/analyse/route.ts` | POST — orchestration + upsert |
| Modifier | `src/app/api/prospects/[id]/route.ts` | Inclure `analyses` (latest 1) dans le GET |
| Créer | `src/components/prospects/prospect-analyse-tab.tsx` | UI : vide / chargement / résultats |
| Créer | `src/__tests__/lib/analyse.test.ts` | 9 tests unitaires lib |
| Créer | `src/__tests__/api/analyse.test.ts` | 6 tests API route |

---

## Migration Prisma

Ajouter `@unique` sur `Analyse.prospectId` pour activer le `upsert` natif Prisma (1 analyse par prospect) :

```prisma
model Analyse {
  id              String   @id @default(cuid())
  prospectId      String   @unique   // ← ajouté
  concurrents     String   // JSON: Concurrent[]
  recommandations String   // JSON: { synthese: string, points: string[] }
  promptUsed      String?
  createdAt       DateTime @default(now())

  prospect Prospect @relation(fields: [prospectId], references: [id], onDelete: Cascade)
}
```

Migration : `npx prisma migrate dev --name add_analyse_unique_prospectid`

---

## lib/anthropic.ts — modification

Ajouter un 3e paramètre optionnel à `analyzeWithClaude` :

```typescript
export async function analyzeWithClaude(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 1024
): Promise<string> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  })
  // ... reste inchangé
}
```

Rétrocompatible — tous les appels existants continuent de fonctionner avec 1024 tokens.

---

## lib/analyse.ts

### Types exportés

```typescript
export interface Concurrent {
  nom: string
  siteUrl: string
  forces: string[]
  faiblesses: string[]
  positionnement: string
}

export interface AnalyseResult {
  concurrents: Concurrent[]
  synthese: string
  recommandations: string[]
}
```

### findCompetitorCandidates

```typescript
export async function findCompetitorCandidates(
  activite: string,
  ville: string,
  ownPlaceId?: string | null
): Promise<PlaceResult[]>
```

- Appelle `searchPlaces(activite, ville)` (retourne jusqu'à 10 résultats)
- Filtre : `siteUrl !== null` et `placeId !== ownPlaceId`
- Retourne les 5 premiers correspondants
- Retourne `[]` si Places ne trouve rien

### scrapeCompetitors

```typescript
export async function scrapeCompetitors(
  candidates: PlaceResult[]
): Promise<{ nom: string; siteUrl: string; html: string }[]>
```

- `Promise.allSettled` sur tous les `scrapeUrl(c.siteUrl!)`
- Ignore les échecs (timeout, 4xx, etc.)
- Retourne uniquement les succès avec leur HTML

### buildAnalyseResult

```typescript
export async function buildAnalyseResult(
  prospect: { nom: string; activite: string; ville: string },
  scrapedCompetitors: { nom: string; siteUrl: string; html: string }[]
): Promise<AnalyseResult>
```

- Construit un prompt incluant le contexte prospect + HTML tronqué de chaque concurrent (max 3000 chars par site pour tenir dans le contexte)
- Appelle `analyzeWithClaude(SYSTEM_PROMPT, userPrompt, 4096)`
- `parseClaudeJSON<AnalyseResult>(response)` — lève une erreur si le JSON est invalide
- Le JSON Claude attendu :
```json
{
  "concurrents": [
    {
      "nom": "Garage Dupont",
      "siteUrl": "https://...",
      "forces": ["Site moderne", "Photos professionnelles"],
      "faiblesses": ["Pas de formulaire", "Pas de tarifs"],
      "positionnement": "Généraliste, clientèle locale"
    }
  ],
  "synthese": "Le marché local est...",
  "recommandations": ["Mettre en avant les délais rapides", "Créer une page avis"]
}
```

---

## POST /api/prospects/[id]/analyse

**Séquence :**

1. `requireAuth()`
2. `prisma.prospect.findUnique({ where: { id } })` — 404 si absent
3. `findCompetitorCandidates(prospect.activite, prospect.ville, prospect.placeId)`
4. `scrapeCompetitors(candidats)`
5. `buildAnalyseResult(prospect, scrapedCompetitors)`
6. Formater pour DB :
   - `concurrents = JSON.stringify(result.concurrents)`
   - `recommandations = JSON.stringify({ synthese: result.synthese, points: result.recommandations })`
7. `prisma.analyse.upsert({ where: { prospectId: id }, create: { prospectId: id, concurrents, recommandations }, update: { concurrents, recommandations, createdAt: new Date() } })`
8. `prisma.activite.create({ type: "ANALYSE", description: \`Analyse concurrentielle effectuée (${result.concurrents.length} concurrents)\`, prospectId: id })`
9. Retourner `{ data: { id: analyse.id, concurrents: result.concurrents, recommandations: result.recommandations, synthese: result.synthese, createdAt: analyse.createdAt } }`

**Codes erreur :**
- 401 — non authentifié
- 404 — prospect introuvable
- 500 — erreur Places/Firecrawl/Claude (message générique, pas de stacktrace)

---

## GET /api/prospects/[id] — modification

Inclure la dernière analyse dans le `findUnique` existant :

```typescript
prisma.prospect.findUnique({
  where: { id },
  include: {
    maquettes: { orderBy: { createdAt: "desc" }, take: 1 },
    analyses: { orderBy: { createdAt: "desc" }, take: 1 },  // ← ajouté
    // ...
  }
})
```

---

## prospect-analyse-tab.tsx

**Props :** `{ prospect: ProspectWithAnalyse }` où `analyse` est la dernière analyse (ou `null`).

**État vide** (pas d'analyse) :
- Texte "Aucune analyse effectuée"
- Bouton blanc "Analyser la concurrence"

**État chargement** :
- Spinner Framer Motion + texte "Analyse en cours... (30–60 secondes)"
- Bouton désactivé

**État résultat** :
- En-tête : date de l'analyse (formatDate) + bouton "Relancer l'analyse"
- **Grille concurrents** (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`) : cartes `#0a0a0a`, chaque carte :
  - Nom + lien site (icône ExternalLink)
  - Forces : liste avec pastilles `#4ade80`
  - Faiblesses : liste avec pastilles `#f87171`
  - Positionnement : texte `#737373`
- **Section synthèse** : texte de synthèse + liste à puces des recommandations

**Comportement bouton** :
- `POST /api/prospects/[id]/analyse` (fetch)
- Met à jour l'état local avec la réponse (pas de refresh page)
- Toast de succès / erreur

**Animations** : `staggerContainer` + `staggerItem` sur les cartes concurrents, `fadeInUp` sur synthèse.

---

## Tests

### src/__tests__/lib/analyse.test.ts (9 tests)

**findCompetitorCandidates** :
- Retourne max 5 candidats avec siteUrl
- Exclut le placeId du prospect
- Retourne [] si Places retourne []

**scrapeCompetitors** :
- Scrape en parallèle, retourne les succès
- Ignore les échecs (Promise.allSettled)
- Retourne [] si tout échoue

**buildAnalyseResult** :
- Appelle analyzeWithClaude avec max_tokens=4096
- Parse le JSON Claude et retourne AnalyseResult structuré
- Lève une erreur si Claude retourne du JSON invalide

### src/__tests__/api/analyse.test.ts (6 tests)

- 401 non authentifié
- 404 prospect introuvable
- 200 happy path : upsert créé, activite ANALYSE créée, réponse `{ data: { ... } }`
- Upsert : appel sur prospect déjà analysé → met à jour l'existant (pas de doublon)
- Activite ANALYSE créée à chaque appel
- Nombre de concurrents correct dans la description de l'activité

---

## Intégration buildStitchPrompt

`buildStitchPrompt` (lib/stitch/buildPrompt.ts) reçoit déjà `analyse?: { recommandations: string }`. La recommandations JSON stockée `{ synthese, points }` sera parsée par le `JSON.parse` existant et sérialisée dans le prompt. Aucune modification nécessaire.

---

## Contraintes

- HTML tronqué à 3000 chars/site pour éviter de dépasser le contexte Claude
- Timeout Firecrawl : 30s/site (existant dans scrape.ts)
- Pas de timeout côté API route — le client affiche un spinner (cohérent avec la génération de maquette)
- Si `findCompetitorCandidates` retourne 0 résultats : `buildAnalyseResult` est quand même appelé avec `[]`, le prompt Claude précise "aucun concurrent trouvé avec site web" et retourne une analyse de marché générale (forces/faiblesses supposées selon le secteur)
