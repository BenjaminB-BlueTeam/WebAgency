# Google Places + Firecrawl Refactoring — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer les 21 appels `web_search` dans Claude par Google Places API + Firecrawl pour éliminer les erreurs 429 et réduire les tokens de ~33k à ~9k par exécution.

**Architecture:** Google Places fournit les données structurées des entreprises (nom, tél, site, rating). Firecrawl scrape le contenu des sites en markdown propre. Claude ne fait plus que de l'analyse pure — zéro tool use, zéro boucle multi-tour dans les 3 fonctions concernées.

**Tech Stack:** Node.js 18+ (fetch natif), `@anthropic-ai/sdk`, `@mendable/firecrawl-js`, Google Places API (Text Search + Place Details), Firecrawl API

---

## Fichiers modifiés

| Fichier | Changement |
|---|---|
| `prospect.js` | Ajouter 3 helpers, refactorer 3 fonctions, supprimer les pauses inutiles |
| `.env` | Ajouter `GOOGLE_PLACES_KEY` et `FIRECRAWL_KEY` |
| `package.json` | Ajouter `@mendable/firecrawl-js` |

---

## Task 1 : Setup — dépendances et variables d'environnement

**Files:**
- Modify: `package.json`
- Modify: `.env`

- [ ] **Étape 1 : Installer Firecrawl**

```bash
npm install @mendable/firecrawl-js
```

Vérifier que `package.json` contient bien `"@mendable/firecrawl-js"` dans les dépendances.

- [ ] **Étape 2 : Créer les clés API**

**Google Places :**
1. Aller sur https://console.cloud.google.com
2. Créer un projet ou sélectionner un existant
3. Menu → APIs & Services → Activer "Places API"
4. Créer des identifiants → Clé API
5. Copier la clé

**Firecrawl :**
1. Aller sur https://www.firecrawl.dev
2. Créer un compte → Dashboard → API Keys → New Key
3. Copier la clé

- [ ] **Étape 3 : Ajouter les clés dans `.env`**

Ouvrir `.env` et ajouter ces deux lignes à la suite des lignes existantes :

```
GOOGLE_PLACES_KEY=AIzaSy...
FIRECRAWL_KEY=fc-...
```

- [ ] **Étape 4 : Commit**

```bash
git add package.json package-lock.json .env
git commit -m "setup: add firecrawl dep and Google Places + Firecrawl API keys"
```

---

## Task 2 : Helper `placesTextSearch(query)`

**Files:**
- Modify: `prospect.js` — ajouter après la fonction `wait` (ligne ~18)

- [ ] **Étape 1 : Ajouter les constantes de config manquantes**

Dans `prospect.js`, trouver le bloc Config (autour de la ligne 36) :

```js
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const NETLIFY_TOKEN = process.env.NETLIFY_TOKEN;
```

Le remplacer par :

```js
const ANTHROPIC_KEY     = process.env.ANTHROPIC_API_KEY;
const NETLIFY_TOKEN     = process.env.NETLIFY_TOKEN;
const GOOGLE_PLACES_KEY = process.env.GOOGLE_PLACES_KEY;
const FIRECRAWL_KEY     = process.env.FIRECRAWL_KEY;
```

- [ ] **Étape 2 : Mettre à jour le check de variables manquantes**

Trouver :

```js
if (!ANTHROPIC_KEY || !NETLIFY_TOKEN) {
  console.error("❌  Variables manquantes dans .env (ANTHROPIC_API_KEY, NETLIFY_TOKEN)");
  process.exit(1);
}
```

Remplacer par :

```js
if (!ANTHROPIC_KEY || !NETLIFY_TOKEN || !GOOGLE_PLACES_KEY) {
  console.error("❌  Variables manquantes dans .env (ANTHROPIC_API_KEY, NETLIFY_TOKEN, GOOGLE_PLACES_KEY)");
  process.exit(1);
}
if (!FIRECRAWL_KEY) {
  console.warn("⚠️  FIRECRAWL_KEY absent — fallback fetch() activé (sites JS et anti-bot non garantis)");
}
```

- [ ] **Étape 3 : Ajouter l'import Firecrawl et l'initialisation**

Ajouter en haut du fichier, après les imports existants (`import Anthropic from "@anthropic-ai/sdk"` etc.) :

```js
import FirecrawlApp from "@mendable/firecrawl-js";
```

Puis, après la ligne `const client = new Anthropic({ apiKey: ANTHROPIC_KEY });`, ajouter :

```js
const firecrawl = FIRECRAWL_KEY ? new FirecrawlApp({ apiKey: FIRECRAWL_KEY }) : null;
```

- [ ] **Étape 4 : Ajouter `placesTextSearch()`**

Ajouter cette fonction juste avant `// ─── Analyse du site existant` (avant la fonction `analyserSiteExistant`) :

```js
// ─── Google Places helpers ────────────────────────────────────────────────────

async function placesTextSearch(query) {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&language=fr&region=fr&key=${GOOGLE_PLACES_KEY}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === "ZERO_RESULTS") return [];
    if (data.status !== "OK") {
      console.error(`❌  Google Places erreur : ${data.status}`);
      if (data.status === "REQUEST_DENIED") {
        console.error("   → Vérifiez GOOGLE_PLACES_KEY dans .env et que l'API Places est activée");
      }
      return [];
    }
    return data.results || [];
  } catch (err) {
    console.error("❌  Places Text Search échoué :", err.message);
    return [];
  }
}
```

- [ ] **Étape 5 : Vérifier que la fonction retourne des résultats**

Ajouter temporairement à la toute fin de `prospect.js`, avant `main().catch(...)` :

```js
// TEST TEMPORAIRE — supprimer après vérification
const _test = await placesTextSearch("plombier Cassel");
console.log("TEST Places:", _test[0]?.name, _test[0]?.formatted_address);
```

Lancer :
```bash
node prospect.js "test"
```

Résultat attendu dans le terminal (avant toute autre sortie) :
```
TEST Places: [Nom d'un plombier] [Adresse à Cassel ou proche]
```

- [ ] **Étape 6 : Supprimer le test temporaire**

Retirer les 3 lignes du test ajoutées à l'étape précédente.

- [ ] **Étape 7 : Commit**

```bash
git add prospect.js
git commit -m "feat: add placesTextSearch helper (Google Places Text Search)"
```

---

## Task 3 : Helper `placesDetails(placeId)`

**Files:**
- Modify: `prospect.js` — ajouter après `placesTextSearch`

- [ ] **Étape 1 : Ajouter `placesDetails()`**

Ajouter cette fonction juste après `placesTextSearch` :

```js
async function placesDetails(placeId) {
  const fields = "name,formatted_phone_number,website,opening_hours,rating";
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&language=fr&key=${GOOGLE_PLACES_KEY}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== "OK") return null;
    return data.result || null;
  } catch {
    return null;
  }
}
```

- [ ] **Étape 2 : Vérifier avec un place_id réel**

Ajouter temporairement avant `main().catch(...)` :

```js
// TEST TEMPORAIRE — supprimer après vérification
const _places = await placesTextSearch("plombier Cassel");
if (_places[0]) {
  const _details = await placesDetails(_places[0].place_id);
  console.log("TEST Details:", _details?.formatted_phone_number, _details?.website);
}
```

Lancer :
```bash
node prospect.js "test"
```

Résultat attendu :
```
TEST Details: 03 XX XX XX XX https://...
```
(Le tél ou le site peuvent être null si le commerce n'en a pas — c'est normal.)

- [ ] **Étape 3 : Supprimer le test temporaire**

Retirer les 5 lignes du test.

- [ ] **Étape 4 : Commit**

```bash
git add prospect.js
git commit -m "feat: add placesDetails helper (Google Places Details)"
```

---

## Task 4 : Helper `scrapeUrl(url)`

**Files:**
- Modify: `prospect.js` — ajouter après `placesDetails`

- [ ] **Étape 1 : Ajouter `scrapeUrl()`**

Ajouter cette fonction juste après `placesDetails` :

```js
async function scrapeUrl(url) {
  // Primaire : Firecrawl (gère JS, Cloudflare, redirects → retourne markdown propre)
  if (firecrawl) {
    try {
      const result = await firecrawl.scrapeUrl(url, { formats: ["markdown"] });
      if (result.success && result.markdown) {
        return { content: result.markdown, source: "firecrawl" };
      }
    } catch { /* quota épuisé ou erreur réseau → fallback */ }
  }

  // Fallback : fetch() natif (HTML brut tronqué à 30kb)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
    });
    clearTimeout(timeout);
    if (!res.ok) return { content: null, source: null };
    const html = await res.text();
    const maxBytes = 30000;
    const truncated = html.length > maxBytes
      ? html.slice(0, maxBytes).replace(/<[^>]*$/, "")
      : html;
    return { content: truncated, source: "fetch" };
  } catch {
    return { content: null, source: null };
  }
}
```

- [ ] **Étape 2 : Vérifier sur un site connu**

Ajouter temporairement avant `main().catch(...)` :

```js
// TEST TEMPORAIRE — supprimer après vérification
const _scraped = await scrapeUrl("https://www.boulangerie-example.fr");
console.log("TEST scrapeUrl source:", _scraped.source, "| contenu:", _scraped.content?.slice(0, 100));
```

Remplacer `https://www.boulangerie-example.fr` par une URL réelle d'un commerce local que tu connais.

Lancer :
```bash
node prospect.js "test"
```

Résultat attendu :
```
TEST scrapeUrl source: firecrawl | contenu: # Boulangerie ...
```
ou si Firecrawl échoue :
```
TEST scrapeUrl source: fetch | contenu: <!DOCTYPE html>...
```

- [ ] **Étape 3 : Supprimer le test temporaire**

- [ ] **Étape 4 : Commit**

```bash
git add prospect.js
git commit -m "feat: add scrapeUrl helper (Firecrawl primary + fetch fallback)"
```

---

## Task 5 : Refactorer `analyserSiteExistant(url)`

**Files:**
- Modify: `prospect.js` — remplacer la fonction entière (~lignes 214-278)

- [ ] **Étape 1 : Remplacer `analyserSiteExistant()`**

Supprimer la fonction `analyserSiteExistant` existante en entier (du commentaire `// ─── Analyse du site existant` jusqu'à `return result;\n}` inclus) et la remplacer par :

```js
// ─── Analyse du site existant d'un prospect ──────────────────────────────────

async function analyserSiteExistant(url) {
  if (!url) return null;
  console.log(`   🔬  Analyse site existant : ${url}`);

  const scraped = await scrapeUrl(url);
  const contenu = scraped?.content || null;

  const response = await apiCall({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: `Expert en audit de sites web pour artisans et TPE locaux français. Tu analyses avec un regard critique et commercial — tu identifies précisément ce qui coûte des clients au propriétaire.
Réponds UNIQUEMENT en JSON valide, sans markdown ni backtick.`,
    messages: [{
      role: "user",
      content: `Analyse ce site web d'un artisan/commerçant local : ${url}

${contenu
  ? `CONTENU DU SITE :\n${contenu.slice(0, 8000)}`
  : "⚠️ Contenu inaccessible — base ton analyse sur l'URL et les patterns connus pour ce type de commerce."}

Identifie précisément :
1. Sections manquantes (galerie photos réalisations, témoignages clients, stats/chiffres-clés, CTA fort, formulaire contact, FAQ...)
2. Signaux de conversion absents (numéro de tél caché ou absent du hero, pas de CTA above the fold, horaires introuvables, pas de bouton devis rapide, pas de badge garantie/certification...)
3. Qualité du contenu (textes trop génériques sans personnalité, absence de vraies photos du travail, pas de prix indicatifs, descriptions vides...)
4. Stack technique détectée (WordPress vieillissant, HTTP non sécurisé, non mobile-friendly, pas de meta description, design pré-2015...)
5. Points précis que la maquette de remplacement doit corriger et surpasser

Réponds UNIQUEMENT en JSON valide :
{
  "url_analysee": "${url}",
  "note_globale": 3,
  "sections_manquantes": ["Galerie photos réalisations", "Témoignages clients"],
  "signaux_conversion_absents": ["Téléphone absent du hero", "Aucun CTA above the fold"],
  "qualite_contenu": ["Textes trop génériques", "Pas de photos du travail réel"],
  "stack_technique": ["HTTP non sécurisé", "Non mobile-friendly", "WordPress 4.x daté"],
  "points_a_surpasser": ["Galerie photos avec vraies réalisations", "CTA téléphone dès le hero"],
  "resume_analyse": "Site daté de 2014, non mobile, sans accroche commerciale ni galerie.",
  "argument_commercial": "Votre site actuel perd des clients chaque jour : non mobile, non sécurisé, et invisible sur Google."
}`,
    }],
  });

  const text = response.content.find((b) => b.type === "text")?.text || "";
  try {
    return JSON.parse(text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) { try { return JSON.parse(match[0]); } catch {} }
    console.warn("   ⚠️  Analyse site : JSON invalide");
    return null;
  }
}
```

- [ ] **Étape 2 : Vérifier sur le site de la Boulangerie Caron**

```bash
node -e "
import('./prospect.js').then(() => {}).catch(e => console.error(e.message));
"
```

En réalité, tester manuellement en lançant :
```bash
node prospect.js "boulangerie Steenvoorde"
```

Dans le terminal, vérifier que la ligne suivante apparaît (et non une erreur 429) :
```
   🔬  Analyse site existant : https://www.panoviews.net/...
   📊  Site actuel : X/10 — ...
```

- [ ] **Étape 3 : Commit**

```bash
git add prospect.js
git commit -m "refactor: analyserSiteExistant uses scrapeUrl+Claude instead of web_search loop"
```

---

## Task 6 : Refactorer `analyserConcurrents(query, prospects)`

**Files:**
- Modify: `prospect.js` — remplacer la fonction entière (~lignes 280-345)

- [ ] **Étape 1 : Remplacer `analyserConcurrents()`**

Supprimer la fonction `analyserConcurrents` existante en entier et la remplacer par :

```js
// ─── Analyse concurrentielle ──────────────────────────────────────────────────

async function analyserConcurrents(query, prospects) {
  const secteur = prospects[0]?.activite || query.split(" ")[0];
  const villes = ["Hazebrouck", "Cassel", "Bailleul", "Wormhout", "Bergues"];
  console.log("📡  Étape 1b — Analyse concurrentielle...");

  // Trouver des concurrents avec site via Google Places
  const nomsProspe = new Set(prospects.map((p) => p.nom.toLowerCase().trim()));
  const concurrentsRaw = [];

  for (const ville of villes) {
    if (concurrentsRaw.length >= 3) break;
    const places = await placesTextSearch(`${secteur} ${ville}`);
    for (const place of places) {
      if (concurrentsRaw.length >= 3) break;
      if (nomsProspe.has(place.name.toLowerCase().trim())) continue;
      const details = await placesDetails(place.place_id);
      if (!details?.website) continue;
      concurrentsRaw.push({
        nom: place.name,
        url: details.website,
        rating: place.rating || details.rating || null,
      });
    }
  }

  if (!concurrentsRaw.length) {
    console.log("   ℹ️  Aucun concurrent avec site trouvé dans la région");
    return { concurrents: [], benchmark_resume: "Aucun concurrent local avec site web identifié — avantage concurrentiel immédiat." };
  }

  // Scraper leurs sites
  const concurrentsAvecContenu = await Promise.all(
    concurrentsRaw.map(async (c) => {
      const scraped = await scrapeUrl(c.url);
      return { ...c, content: scraped?.content || null };
    })
  );

  // Analyse Claude (1 appel, sans tool)
  const response = await apiCall({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: `Analyste commercial spécialisé dans la vente web aux TPE/artisans locaux français. Tu identifies les opportunités concurrentielles avec précision.
Réponds UNIQUEMENT en JSON valide, sans markdown ni backtick.`,
    messages: [{
      role: "user",
      content: `Analyse ces concurrents directs (${secteur}) dans la région Steenvoorde/Hazebrouck.

${concurrentsAvecContenu.map((c) => `
### ${c.nom} — ${c.url} (note Google : ${c.rating ?? "?"}/5)
${c.content ? c.content.slice(0, 3000) : "Contenu inaccessible — analyse basée sur l'URL."}
`).join("\n")}

Pour chaque concurrent : ce qu'ils font bien visuellement et commercialement, ce qu'ils font mal, l'argument différenciant.

Réponds UNIQUEMENT en JSON valide :
{
  "concurrents": [
    {
      "nom": "Dupont Plomberie Hazebrouck",
      "url": "https://exemple.fr",
      "points_forts": ["Design propre", "Formulaire de contact", "Galerie photos"],
      "points_faibles": ["Pas de témoignages", "Non HTTPS", "Mobile approximatif"],
      "argument_comparatif": "Dupont a un site correct mais sans témoignages ni prise de RDV en ligne : vous aurez les deux."
    }
  ],
  "benchmark_resume": "Dans ce secteur local, les meilleurs sites ont une galerie propre mais manquent tous de témoignages vérifiés et de conversion mobile."
}`,
    }],
  });

  const text = response.content.find((b) => b.type === "text")?.text || "";
  try {
    return JSON.parse(text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) { try { return JSON.parse(match[0]); } catch {} }
    console.warn("   ⚠️  Analyse concurrents : JSON invalide");
    return { concurrents: [], benchmark_resume: "" };
  }
}
```

- [ ] **Étape 2 : Commit**

```bash
git add prospect.js
git commit -m "refactor: analyserConcurrents uses Places+scrapeUrl+Claude instead of web_search loop"
```

---

## Task 7 : Refactorer `rechercherProspects(query)`

**Files:**
- Modify: `prospect.js` — remplacer la fonction entière (~lignes 347-417)

- [ ] **Étape 1 : Remplacer `rechercherProspects()`**

Supprimer la fonction `rechercherProspects` existante en entier (du commentaire `// ─── Recherche & analyse prospects` jusqu'à `return result;\n}` inclus) et la remplacer par :

```js
// ─── Recherche & analyse prospects ───────────────────────────────────────────

async function rechercherProspects(query) {
  console.log("📡  Étape 1 — Recherche de prospects via Google Places...");

  // 1. Récupérer les entreprises
  const places = await placesTextSearch(query);
  if (!places.length) {
    console.error("❌  Aucun résultat Google Places. Vérifiez la requête ou la clé API.");
    process.exit(1);
  }

  console.log(`   📍  ${places.length} résultats trouvés — enrichissement en cours...`);

  // 2. Enrichir avec Details + contenu du site
  const enrichis = await Promise.all(
    places.slice(0, 10).map(async (place) => {
      const details = await placesDetails(place.place_id);
      const website = details?.website || null;
      let siteContent = null;
      if (website) {
        process.stdout.write(`   🔗  Scrape : ${website.slice(0, 60)}...\n`);
        const scraped = await scrapeUrl(website);
        siteContent = scraped?.content ? scraped.content.slice(0, 3000) : null;
      }
      return {
        nom: place.name,
        adresse: place.formatted_address,
        rating: place.rating || null,
        types: place.types || [],
        telephone: details?.formatted_phone_number || null,
        website,
        siteContent,
      };
    })
  );

  // 3. Claude classifie (1 appel, sans tool)
  const response = await apiCall({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    system: `Expert commercial en vente de sites web aux TPE/artisans locaux France, secteur Steenvoorde (Nord).
Statuts : SANS_SITE (aucune URL propre), SITE_OBSOLETE (HTTP / design pré-2018 / non-mobile détectable dans le contenu), SITE_BASIQUE (site présent mais incomplet), SITE_CORRECT (ne pas inclure — pas de valeur commerciale).
Réponds UNIQUEMENT en JSON valide, sans markdown.`,
    messages: [{
      role: "user",
      content: `Voici les entreprises trouvées via Google Places pour la requête "${query}" dans la région Steenvoorde/Nord.
Pour chaque entreprise, détermine son statut web, sa priorité commerciale et génère un argument d'accroche personnalisé.

DONNÉES BRUTES :
${JSON.stringify(enrichis, null, 2)}

Réponds UNIQUEMENT en JSON valide :
{
  "query": "${query}",
  "date": "${new Date().toISOString().split("T")[0]}",
  "resume": "analyse du marché local en 2-3 phrases",
  "prospects": [{
    "nom": "...",
    "activite": "type d'activité précis",
    "ville": "...",
    "telephone": "0X XX XX XX XX ou null",
    "email": "... ou null",
    "site_url": "URL ou null",
    "statut": "SANS_SITE|SITE_OBSOLETE|SITE_BASIQUE|SITE_CORRECT",
    "priorite": "HAUTE|MOYENNE|FAIBLE",
    "raison": "explication courte du statut",
    "argument_commercial": "phrase d'accroche personnalisée pour ce prospect"
  }],
  "top3": ["Nom1", "Nom2", "Nom3"]
}`,
    }],
  });

  const text = response.content.find((b) => b.type === "text")?.text || "";
  let result = null;
  try {
    result = JSON.parse(text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) { try { result = JSON.parse(match[0]); } catch {} }
    if (!result) console.error("⚠️  JSON invalide:", text.slice(0, 200));
  }

  if (result?.prospects?.length) {
    result.concurrents = await analyserConcurrents(query, result.prospects);
  }
  return result;
}
```

- [ ] **Étape 2 : Commit**

```bash
git add prospect.js
git commit -m "refactor: rechercherProspects uses Places+scrapeUrl+Claude instead of web_search loop"
```

---

## Task 8 : Supprimer les pauses rate-limit devenues inutiles

**Files:**
- Modify: `prospect.js` — `main()` et l'ancien délai dans `rechercherProspects`

- [ ] **Étape 1 : Supprimer la pause 60s dans `main()`**

Dans `main()`, trouver et supprimer ces 2 lignes :

```js
console.log("\n⏳  Pause 60s (rate limit API)...\n");
await wait(60000);
```

- [ ] **Étape 2 : Vérifier qu'il n'y a plus de pause 30s**

La pause `await wait(30000)` avant `analyserConcurrents` était dans l'ancienne `rechercherProspects` — elle a disparu avec le refactoring du Task 7. Vérifier en cherchant dans le fichier :

```bash
grep -n "wait(30000)" prospect.js
```

Résultat attendu : aucune ligne retournée.

- [ ] **Étape 3 : Commit**

```bash
git add prospect.js
git commit -m "chore: remove obsolete rate-limit delays (no more web_search tool calls)"
```

---

## Task 9 : Test d'intégration final

**Files:** aucun

- [ ] **Étape 1 : Lancer le pipeline complet**

```bash
node prospect.js "Cassel"
```

- [ ] **Étape 2 : Vérifier la sortie attendue**

Le terminal doit afficher dans l'ordre, sans erreur 429 :

```
🔍  Requête : "Cassel"  |  Mode : HTML

📡  Étape 1 — Recherche de prospects via Google Places...
   📍  X résultats trouvés — enrichissement en cours...
   🔗  Scrape : https://...

✅  X prospects

┌─────────────────────────────────────────────────────────────────────────┐
│  Entreprise                    Statut          Priorité    Téléphone    │
├─────────────────────────────────────────────────────────────────────────┤
│  ...                           SANS_SITE       HAUTE       03 XX XX XX  │
└─────────────────────────────────────────────────────────────────────────┘

📡  Étape 1b — Analyse concurrentielle...

─────────────────────────────────────────
🎨  Traitement : "[Nom]" — [Activité]
─────────────────────────────────────────
   🔬  Analyse site existant : ...   (si le prospect a un site)
   📊  Site actuel : X/10 — ...
🚀  Déploiement maquette...
   🌐  Démo : https://...
```

**Aucun** `⏳ Rate limit — attente 60s` ne doit apparaître.

- [ ] **Étape 3 : Vérifier le CRM**

```bash
node -e "const c = JSON.parse(require('fs').readFileSync('crm.json','utf8')); console.log(c.prospects.slice(-3).map(p => p.nom + ' | ' + p.statut).join('\n'));"
```

Les nouveaux prospects de Cassel doivent apparaître avec leur statut.

- [ ] **Étape 4 : Commit final**

```bash
git add crm.json output/
git commit -m "test: integration run Cassel - Google Places + Firecrawl pipeline working"
```
