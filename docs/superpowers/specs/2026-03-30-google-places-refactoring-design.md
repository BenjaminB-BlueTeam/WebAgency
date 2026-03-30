# Design — Refactoring Google Places API + Firecrawl

**Date :** 2026-03-30
**Projet :** web-agency-tool
**Objectif :** Remplacer les appels `web_search` dans Claude par Google Places API + Firecrawl pour éliminer les erreurs 429 (rate limit 30k tokens/min) et améliorer la qualité des analyses de sites.

---

## Problème

Le pipeline actuel fait 3 appels Claude avec le tool `web_search` en boucle multi-tour :

| Fonction | web_search uses | Tokens estimés |
|---|---|---|
| `rechercherProspects()` | 10 | ~15k |
| `analyserConcurrents()` | 6 | ~10k |
| `analyserSiteExistant()` | 5 | ~8k |
| **Total** | **21** | **~33k** |

33k tokens sur une seule exécution → dépasse systématiquement la limite de 30k tokens/minute → erreur 429 fatale malgré les retries.

---

## Solution choisie : Google Places + Firecrawl + Claude (analyse seule)

### Principe

- **Google Places API** remplace les web_search pour trouver les entreprises et les concurrents
- **Firecrawl** remplace les web_search pour lire le contenu des sites existants — retourne du markdown propre au lieu de HTML brut (4-5x moins de tokens, gère JS + anti-bot)
- **fetch() natif** sert de fallback si Firecrawl échoue (quota ou erreur)
- **Claude** ne fait plus que de l'analyse et de la génération — zéro tool use dans les 3 fonctions concernées

### Nouveau flux

```
rechercherProspects(query)
├─ 1. Places Text Search → liste brute (nom, adresse, place_id, website, rating)
├─ 2. Places Details (par place_id) → formatted_phone_number + website + opening_hours
├─ 3. Pour chaque résultat avec site → scrapeUrl()
│     → markdown propre du site (HTTPS, structure, contenu détectable)
└─ 4. 1 appel Claude sans tool → classif (statut, priorité) + argument_commercial + top3

analyserConcurrents(query, prospects)
├─ 1. Places Text Search même secteur dans villes voisines
│     (Hazebrouck, Cassel, Bailleul, Wormhout, Bergues)
├─ 2. Exclure les prospects déjà identifiés
├─ 3. Garder uniquement ceux avec un site web (max 3)
├─ 4. scrapeUrl() de chaque concurrent
└─ 5. 1 appel Claude sans tool → points_forts, points_faibles, benchmark

analyserSiteExistant(url)
├─ 1. scrapeUrl(url)
└─ 2. 1 appel Claude sans tool → note, sections_manquantes, signaux_conversion_absents,
       stack_technique, argument_commercial
```

### Fonctions inchangées

- `getDesignDirection()` — aucune modification
- `genererMaquetteHTML()` — aucune modification
- `genererMaquetteAstro()` — aucune modification
- `genererPagePresentation()` — aucune modification
- `deployerNetlify()` — aucune modification
- `traiterProspect()` — aucune modification
- `genererRapport()` — aucune modification
- `main()` — aucune modification
- CRM (chargerCRM, ajouterAuCRM) — aucune modification

---

## Nouveaux composants

### `scrapeUrl(url)`

Firecrawl en primaire, fetch() natif en fallback.

```js
async function scrapeUrl(url) {
  // 1. Essayer Firecrawl → retourne markdown propre
  //    - Gère JS rendering, Cloudflare, redirects
  //    - Output : { markdown: string, metadata: { title, description, statusCode } }
  // 2. Si Firecrawl échoue (quota, erreur réseau) → fetch() natif
  //    - timeout 8s, User-Agent navigateur réel
  //    - Tronque à 30kb sur balise fermante
  // 3. Si les deux échouent → retourne null (silencieux)
  // Retourne : { content: string | null, source: "firecrawl"|"fetch"|null }
}
```

### `placesTextSearch(query)`

```js
async function placesTextSearch(query) {
  // GET https://maps.googleapis.com/maps/api/place/textsearch/json
  // ?query=...&language=fr&region=fr&key=GOOGLE_PLACES_KEY
  // Retourne tableau de places brutes
}
```

### `placesDetails(placeId)`

```js
async function placesDetails(placeId) {
  // GET https://maps.googleapis.com/maps/api/place/details/json
  // ?place_id=...&fields=name,formatted_phone_number,website,opening_hours&key=KEY
  // Retourne objet details ou null
}
```

---

## Gestion d'erreurs

| Situation | Comportement |
|---|---|
| Places API — 0 résultat | Message clair + `process.exit(1)` |
| Places Details — échec | Prospect conservé sans tél |
| Places API — quota dépassé | Message explicite + lien Cloud Console |
| Firecrawl — quota free épuisé | Bascule automatique sur fetch() fallback |
| Firecrawl — erreur réseau | Bascule automatique sur fetch() fallback |
| fetch() fallback — timeout (8s) | `content: null` → Claude estime depuis données Places |
| fetch() fallback — HTTP 4xx/5xx | Même fallback |
| scrapeUrl() — les deux échouent | Claude analyse sur données Places uniquement |

Le pipeline ne crashe jamais sur une erreur réseau — il dégrade gracieusement.

---

## Configuration

### .env — ajouts requis

```
GOOGLE_PLACES_KEY=AIza...
FIRECRAWL_KEY=fc-...
```

### Google Cloud Console — setup (5 min)

1. Aller sur console.cloud.google.com
2. Créer un projet (ou utiliser un existant)
3. Activer l'API "Places API"
4. Créer une clé API → la restreindre à l'IP de la machine
5. Copier la clé dans `.env`
6. Le crédit gratuit mensuel ($200) couvre largement l'usage : ~100 recherches/mois ≈ $3

### Firecrawl — setup (2 min)

1. Créer un compte sur firecrawl.dev
2. Copier la clé API dans `.env`
3. `npm install @mendable/firecrawl-js`
4. Free tier : 500 pages/mois (largement suffisant pour l'usage)

---

## Impact sur les tokens

| Fonction | Avant | Après (Firecrawl) |
|---|---|---|
| `rechercherProspects()` | ~15k tokens | ~4k tokens |
| `analyserConcurrents()` | ~10k tokens | ~3k tokens |
| `analyserSiteExistant()` | ~8k tokens | ~2k tokens |
| **Total pipeline** | **~33k** | **~9k** |

- Firecrawl retourne du markdown propre (~1-2k tokens/site vs ~6-8k tokens pour HTML brut)
- Le rate limit de 30k tokens/minute ne sera plus jamais atteint
- Bonus : meilleure qualité d'analyse (markdown structuré vs HTML verbeux)

---

## Fichiers modifiés

- `prospect.js` — refactoring des 3 fonctions + ajout des 3 helpers (`scrapeUrl`, `placesTextSearch`, `placesDetails`)
- `.env` — ajout de `GOOGLE_PLACES_KEY` et `FIRECRAWL_KEY`
- `package.json` — ajout de `@mendable/firecrawl-js`
