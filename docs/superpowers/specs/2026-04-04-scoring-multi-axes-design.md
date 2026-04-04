# Scoring Multi-Axes + Analyse IA — Design Spec

**Date:** 2026-04-04
**Status:** Approved

## Overview

Scoring intelligent des prospects sur 5 axes (0-10 chacun) via PageSpeed API, Firecrawl et Claude. Score global = moyenne ponderee. Declenchement manuel via bouton sur la fiche prospect.

## Architecture

```
src/lib/anthropic.ts                        # Client Anthropic SDK
src/lib/scrape.ts                           # Client Firecrawl
src/lib/scoring.ts                          # Orchestrateur scoring 5 axes
src/app/api/prospects/[id]/score/route.ts   # POST scoring
src/components/prospects/prospect-info-tab.tsx  # Modifier: ajouter bouton Scorer
```

## Lib Anthropic (lib/anthropic.ts)

- Dependance: `@anthropic-ai/sdk`
- `analyzeWithClaude(systemPrompt: string, userPrompt: string): Promise<string>` — appel Claude Sonnet (claude-sonnet-4-20250514), retourne le texte
- `parseClaudeJSON<T>(response: string): T` — extrait JSON de la reponse:
  1. Tente JSON.parse direct
  2. Si echec, cherche ```json...``` fences et parse le contenu
  3. Si echec, cherche {...} dans le texte et parse
  4. Si echec → throw Error("Impossible de parser la reponse IA")

## Lib Firecrawl (lib/scrape.ts)

- Pas de SDK — appel fetch direct a l'API REST
- `scrapeUrl(url: string): Promise<string>` — POST `https://api.firecrawl.dev/v1/scrape`
  - Headers: `Authorization: Bearer ${FIRECRAWL_API_KEY}`
  - Body: `{ url, formats: ["html"] }`
  - Timeout: 30s (AbortController)
  - Retourne le HTML nettoye (`data.html`)
- Erreurs: cle invalide (401), timeout, URL inaccessible → messages descriptifs

## Lib Scoring (lib/scoring.ts)

### Fonction principale: scoreProspect(prospect)

Recoit un prospect avec ses donnees, retourne les 6 scores.

### Axe 1 — Potentiel web (poids x3)

- Pas de siteUrl → 10
- siteUrl sans HTTPS (http://) → 8
- siteUrl HTTPS → appel PageSpeed API mobile:
  - `GET https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url={url}&key={GOOGLE_PLACES_KEY}&category=performance&strategy=mobile`
  - perfScore = response.lighthouseResult.categories.performance.score * 100
  - Si perfScore < 50 → 6
  - Si perfScore 50-80 → 3
  - Si perfScore > 80 → 1
- En cas d'erreur PageSpeed → fallback 5 (score moyen)

### Axe 2 — SEO (poids x2)

- Pas de siteUrl → null
- PageSpeed avec category=seo:
  - seoScore = response.lighthouseResult.categories.seo.score * 100
  - Score inverse: `10 - Math.round(seoScore / 10)`
  - Clamp entre 0 et 10
- En cas d'erreur → null

### Axe 3 — Design/UX (poids x2)

- Pas de siteUrl → null
- scrapeUrl(siteUrl) via Firecrawl
- Tronquer le HTML a 4000 caracteres pour le prompt Claude
- analyzeWithClaude avec:
  - System: "Tu es un expert en design web. Reponds uniquement en JSON valide."
  - User: "Analyse ce site web d'un {activite} a {ville}. Note de 0 a 10 la qualite du design (modernite, responsive, CTA, lisibilite). Reponds avec: {\"score\": number, \"raisons\": string[]}"
- parseClaudeJSON → extraire score
- Score inverse: `10 - score`
- Clamp entre 0 et 10
- En cas d'erreur Firecrawl ou Claude → null

### Axe 4 — Potentiel financier (poids x1)

- Si noteGoogle ET nbAvisGoogle presents:
  - `Math.min(10, Math.round((noteGoogle / 5) * 5 + Math.min(nbAvisGoogle / 50, 5)))`
- Sinon → null

### Axe 5 — Urgence/Potentiel d'achat (poids x3)

- analyzeWithClaude avec:
  - System: "Tu es un expert en prospection commerciale pour les agences web. Reponds uniquement en JSON valide."
  - User: "Base sur ces donnees d'un {activite} a {ville}: noteGoogle={noteGoogle}, nbAvis={nbAvisGoogle}, siteUrl={siteUrl}, scorePresenceWeb={scorePresenceWeb}, scoreSEO={scoreSEO}, scoreDesign={scoreDesign}. Score de 0 a 10 sa probabilite d'acheter un site web. 10 = besoin urgent et evident. Reponds avec: {\"score\": number, \"justification\": string}"
- parseClaudeJSON → extraire score
- En cas d'erreur Claude → null

### Score global

```
const axes = [
  { score: scorePresenceWeb, poids: 3 },
  { score: scoreSEO, poids: 2 },
  { score: scoreDesign, poids: 2 },
  { score: scoreFinancier, poids: 1 },
  { score: scorePotentiel, poids: 3 },
]
const valid = axes.filter(a => a.score !== null)
if (valid.length === 0) return null
const sum = valid.reduce((acc, a) => acc + a.score * a.poids, 0)
const poidsTotal = valid.reduce((acc, a) => acc + a.poids, 0)
return Math.round(sum / poidsTotal)
```

Fonction exportee: `calculateGlobalScore(scores)` pour testabilite.

## API Route

### POST /api/prospects/[id]/score

- requireAuth()
- Verifie prospect existe (findUnique)
- Appelle scoreProspect(prospect)
- prisma.prospect.update avec les 6 scores
- prisma.activite.create: type "SCORING", description "Scoring effectue — Score global : X/10"
- Retourne { data: { scorePresenceWeb, scoreSEO, scoreDesign, scoreFinancier, scorePotentiel, scoreGlobal } }
- Erreur catch: 401, 404, 500

## UI — Bouton Scorer

Dans prospect-info-tab.tsx, section Scoring:
- Bouton "Scorer ce prospect" (icone Zap) a cote du titre Scoring
- Au clic: POST /api/prospects/[id]/score
- Loading: bouton disabled, spinner, texte "Analyse en cours..."
- Succes: toast, mise a jour des ScoreBar + ScorePastille avec les nouvelles valeurs
- Erreur: toast erreur
- Si scoreGlobal deja rempli: bouton "Rescorer" au lieu de "Scorer"

## Tests

- calculateGlobalScore: tous axes, certains null, tous null
- parseClaudeJSON: JSON brut, fences markdown ```json```, JSON dans texte, invalide
- scoreFinancier: differentes combinaisons noteGoogle/nbAvisGoogle

## Dependances a installer

- `@anthropic-ai/sdk` (npm)
- Pas de SDK Firecrawl — fetch direct

## Variables d'environnement requises

- `ANTHROPIC_API_KEY` (deja dans .env.local)
- `FIRECRAWL_API_KEY` (a ajouter dans .env.local)
- `GOOGLE_PLACES_KEY` (deja en place, reutilise pour PageSpeed)
