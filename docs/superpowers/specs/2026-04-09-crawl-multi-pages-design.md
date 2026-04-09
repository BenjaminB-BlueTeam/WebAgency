# Crawl multi-pages pour analyse concurrentielle

## Contexte

L'analyse concurrentielle ne scrape actuellement que la homepage de chaque concurrent (endpoint Firecrawl `/v1/scrape`). Le HTML est tronqué à 3000 chars, ce qui limite la qualité de l'audit. On veut crawler jusqu'à 5 pages pertinentes par site pour un audit complet.

## Approche retenue : Map + Scrape sélectif

1. `/v1/map` pour récupérer toutes les URLs d'un site
2. Filtrage intelligent par mots-clés pour cibler les pages à forte valeur
3. `/v1/scrape` sur les 5 pages les plus pertinentes

Coût : 1 (map) + jusqu'à 5 (scrape) = 6 crédits Firecrawl max par concurrent.

## Modifications

### `src/lib/scrape.ts` — Nouvelles fonctions

**`mapSite(url: string): Promise<string[]>`**
- POST `https://api.firecrawl.dev/v1/map` avec `{ url }`
- Retourne la liste d'URLs trouvées sur le site
- Timeout 30s
- En cas d'échec : retourne `[url]` (fallback homepage seule)

**`selectRelevantPages(urls: string[], baseUrl: string, max: number = 5): string[]`**
- Inclut toujours la homepage (URL de base)
- Priorise par mots-clés dans le path :
  - Priorité 1 (services/tarifs) : `service`, `prestation`, `tarif`, `prix`, `offre`, `formule`
  - Priorité 2 (réalisations) : `realisation`, `projet`, `portfolio`, `reference`, `galerie`
  - Priorité 3 (identité) : `about`, `qui-sommes`, `equipe`, `contact`, `agence`, `entreprise`
- Exclut : `blog`, `article`, `actu`, `mentions-legales`, `cgv`, `cgu`, `politique`, `cookie`, `login`, `admin`, `wp-`
- Cap à `max` URLs
- Fonction pure, testable unitairement

**`crawlSite(url: string): Promise<{ pageUrl: string; content: string }[]>`**
- Orchestre : `mapSite` → `selectRelevantPages` → `scrapeUrl` en parallèle (Promise.allSettled)
- Format : `formats: ["markdown"]` au lieu de `["html"]` (plus compact pour LLM)
- Timeout 60s par page
- Retourne uniquement les pages scrapées avec succès

### `src/lib/scrape.ts` — Modification existante

- `scrapeUrl` : ajouter paramètre optionnel `format: "html" | "markdown" = "html"` pour supporter les deux formats
- Les appelants existants (scrape-identity, scoring) continuent en HTML, pas de changement pour eux

### `src/lib/analyse.ts` — Adaptations

**`scrapeCompetitors`** :
- Remplacer `scrapeUrl(c.siteUrl)` par `crawlSite(c.siteUrl)`
- Type de retour : `{ nom: string; siteUrl: string; pages: { pageUrl: string; content: string }[] }[]` au lieu de `{ nom: string; siteUrl: string; html: string }[]`

**`buildAnalyseResult`** :
- Paramètre `scrapedCompetitors` adapté au nouveau type multi-pages
- Agrégation : pour chaque concurrent, concaténer le contenu de toutes les pages avec un séparateur `--- Page: {url} ---`
- Troncature à 6000 chars par concurrent (vs 3000 avant)
- Adapter le prompt pour indiquer à Claude qu'il reçoit plusieurs pages

### `src/lib/run-analyse-job.ts` — Hooks de progression

- `onStart` : "Exploration du site de {nom}..."
- `onSuccess` : "{nom} — {N} pages analysées"
- Pas de changement structurel, juste les messages

### Tests

- `selectRelevantPages` : priorisation correcte, exclusion, cap à max, homepage toujours incluse
- `mapSite` : mock Firecrawl, fallback sur homepage en cas d'erreur
- `crawlSite` : orchestration map + scrape, gestion échecs partiels
- `buildAnalyseResult` : format multi-pages, troncature 6000 chars
- Mise à jour des tests existants `scrapeCompetitors` pour le nouveau type de retour

### Pas de changement

- UI (affiche forces/faiblesses/recommandations — indépendant de la source)
- `scrape-identity.ts`, `scoring.ts` (continuent avec `scrapeUrl` en HTML)
- Modèle Claude : reste Haiku 4.5 pour l'analyse
- Schéma Prisma : pas de changement
