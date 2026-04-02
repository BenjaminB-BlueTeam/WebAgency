# Spec — Agency Pipeline Phase 1 + Phase 2

**Date :** 2026-04-02
**Statut :** Approuvé
**Scope :** Phase 1 (Prospection redesign) + Phase 2 (Expand panel + Analyse concurrentielle)

---

## Contexte

Le CRM est opérationnel en production (Vercel + Turso). Le pipeline de prospection existe (`/prospection` avec SSE streaming, Google Places → Claude scoring). L'expand prospect existe (`ProspectRowExpand`) avec email gen et regen maquette.

Ce spec couvre les deux premières phases d'un pipeline d'agence complet en 5 phases :

| Phase | Périmètre |
|---|---|
| **1 (ce spec)** | Prospection redesign — tableau, checkbox, bulk add |
| **2 (ce spec)** | Expand panel — analyse site + concurrents, rapport marketing, argumentaire |
| 3 | Maquette pipeline — GitHub repo, max 3 versions, validation alert |
| 4 | Email workflow — Himalaya send, lecture réponses, adaptation prompt |
| 5 | Pipeline automation — statuts auto, résumé échanges |

---

## Phase 1 — Prospection page redesign

### Objectif

Permettre de sélectionner plusieurs prospects dans les résultats de recherche et les ajouter en bulk au CRM en un clic.

### Changements UI : `/prospection`

Le flux SSE et le moteur Google Places restent inchangés.

**Affichage des résultats :** remplacement des cards actuelles par un tableau compact.

Colonnes du tableau :
```
☐ | Nom · Ville | Score | Statut web | Note Google | Téléphone | Site actuel
```

- Score coloré : vert (≥60), jaune (30-59), gris (<30)
- Statut web : badge coloré (SANS_SITE violet, OBSOLÈTE amber, BASIQUE bleu)
- Résultats triés par score décroissant

**Sélection :**
- Checkbox individuelle par ligne
- Bouton `Tout sélectionner HAUTE priorité` au-dessus du tableau (filtre score ≥ 60)
- Compteur dynamique en bas de tableau : `N sélectionnés · CA potentiel ~X €` (N × 690 €)
- Bouton `Ajouter au CRM (N)` désactivé si aucune sélection

**Comportement bulk add :**
- Appels `POST /api/prospects` séquentiels, max 3 en parallèle
- Doublons (même nom + ville déjà en DB) → skip silencieux
- Toast de confirmation : `"N prospects ajoutés · X déjà existants ignorés"`
- Pas de redirection forcée — l'utilisateur reste sur la page de résultats

### Pas de changement

- Moteur SSE (`/api/prospection/search`)
- Logique Google Places + scoring
- Historique des recherches

---

## Phase 2 — Expand panel + Analyse concurrentielle

### Objectif

Refondre le panneau expand pour afficher une analyse marketing experte (site + concurrents) et un argumentaire de vente, avec un bouton maquette conditionnel.

### Composant `ProspectRowExpand` — layout 2 colonnes

#### Colonne gauche (220px fixe)

**Bloc contact :**
- Téléphone
- Email
- Note Google + nombre d'avis
- Lien vers site actuel (ou badge "Aucun site")
- Lien maquette existante si `demoUrl` présent

**Bloc actions :**
```
[🔍 Analyser site + concurrents]      ← toujours actif
[🎨 Générer maquette]                 ← grisé si notes.analyse == null
[✉ Générer email ciblé]               ← toujours actif
```

Tooltip sur le bouton maquette grisé : `"Lancez d'abord l'analyse concurrentielle"`

Si analyse déjà présente en DB : bouton `🔄 Relancer l'analyse` visible sous les actions.

#### Colonne droite (flexible)

**État initial (pas d'analyse) :**
```
Lance l'analyse pour voir le rapport concurrentiel et l'argumentaire de vente…
```

**Pendant l'analyse (streaming SSE) :**
Progression textuelle en temps réel :
- `⏳ Scraping du site prospect…`
- `⏳ Recherche des concurrents…`
- `⏳ Scraping des sites concurrents…`
- `⏳ Analyse marketing en cours…`
- `✅ Rapport généré`

**Après analyse :**
Rapport structuré en 4 sections dépliables :

1. **Audit site prospect** *(si siteUrl présent)*
   - Note globale /10 avec justification
   - Stack technique détectée
   - Sections manquantes (galerie, témoignages, CTA above the fold…)
   - Signaux de conversion absents

2. **Benchmark concurrents** *(2-3 concurrents)*
   - Pour chacun : note /10, points forts, points faibles
   - Ce que tous ont → standard du secteur
   - Ce qu'aucun n'a → opportunité de différenciation

3. **Analyse SEO locale**
   - Présence et qualité Google Business
   - Cohérence NAP (nom, adresse, téléphone)
   - Mots-clés évidents non couverts
   - Comparaison avis Google : volume, note, réponses aux avis

4. **Argumentaire de vente**
   - 3 arguments chocs adaptés au prospect et au secteur
   - Réponses aux 3 objections les plus probables
   - Prix recommandé à annoncer (selon complexité estimée)

Le rapport est **persisté** dans `prospect.notes.analyse` (JSON). À la réouverture de l'expand, il s'affiche immédiatement sans nouveau fetch.

### Nouvelle route API

**`GET /api/prospects/[id]/analyse-stream`** — Server-Sent Events

Pipeline d'exécution :
1. Fetch prospect depuis DB (vérif auth)
2. Si `siteUrl` présent → Firecrawl scrape du site
3. Google Places Text Search sur `"{activite} {ville}"` → 2-3 premiers résultats avec site
4. Firecrawl scrape de chaque site concurrent
5. Claude génère le rapport complet en 4 sections (prompt système : expert marketing 20 ans d'expérience, méthodes actuelles, données chiffrées)
6. Stream des étapes de progression via SSE (`data: {"step": "...", "done": false}`)
7. Stream du résultat final (`data: {"rapport": {...}, "done": true}`)
8. PATCH `prospect.notes.analyse` en DB avec le rapport + timestamp

**Format SSE :**
```
data: {"step": "Scraping site prospect…", "done": false}
data: {"step": "Recherche concurrents…", "done": false}
data: {"step": "Scraping concurrents…", "done": false}
data: {"step": "Analyse marketing…", "done": false}
data: {"rapport": { ... }, "done": true}
```

**Gestion d'erreur :**
- Firecrawl timeout (>15s) → skip du scraping, analyse sur données Places seules
- Aucun concurrent trouvé → section benchmark réduite avec note explicative
- Erreur Claude → stream `{"error": "...", "done": true}`, toast d'erreur côté client

### Prompt Claude — analyse marketing

Le prompt système positionne Claude comme un expert marketing digital avec 20 ans d'expérience, spécialisé dans les TPE/artisans locaux. Il doit :
- Comparer les avis Google en volume, note moyenne, qualité des réponses du propriétaire
- Analyser le design (moderne vs daté, animations, mobile-first)
- Évaluer le SEO local (balises title/meta, structured data, cohérence NAP)
- Identifier les opportunités de différenciation concrètes et chiffrables
- Produire un argumentaire de vente direct, avec des phrases prêtes à l'emploi

Le prompt utilisateur inclut : données Places du prospect, markdown scraped du site, données Places + markdown des concurrents.

### Gating du bouton maquette

```typescript
const hasAnalyse = Boolean(prospect.notes?.analyse)
// Bouton disabled + tooltip si !hasAnalyse
// Bouton actif + ouvre RegenMaquetteModal si hasAnalyse
```

Le prompt de génération maquette (`/api/prospects/[id]/prompt`) sera mis à jour pour injecter le rapport d'analyse dans le contexte, afin que la maquette corrige explicitement les faiblesses identifiées.

---

## Architecture — fichiers touchés

### Phase 1

| Fichier | Modification |
|---|---|
| `crm/src/app/(dashboard)/prospection/page.tsx` (ou client component) | Remplacer affichage cards → tableau avec checkboxes |
| `crm/src/components/prospection/results-table.tsx` | Nouveau composant tableau de résultats |
| `crm/src/app/api/prospects/route.ts` | Vérification doublon nom+ville sur POST (déjà partiellement présent via unique index) |

### Phase 2

| Fichier | Modification |
|---|---|
| `crm/src/components/prospects/prospect-row-expand.tsx` | Refonte layout 2 colonnes |
| `crm/src/components/prospects/analyse-panel.tsx` | Nouveau composant colonne droite (SSE stream + rapport) |
| `crm/src/app/api/prospects/[id]/analyse-stream/route.ts` | Nouvelle route SSE |
| `crm/src/app/api/prospects/[id]/prompt/route.ts` | Injection rapport dans le prompt maquette |
| `crm/src/lib/prompts/analyse.ts` | Nouveau fichier prompt analyse marketing |

---

## Scoring — rappel (inchangé)

| Critère | Points |
|---|---|
| SANS_SITE | +40 |
| HTTP (pas HTTPS) | +30 |
| SITE_OBSOLETE | +20 |
| SITE_BASIQUE | +10 |
| Note Google < 3.5 | +10 |
| Note Google ≥ 4.5 | +15 |
| Nombre d'avis > 20 | +10 |
| Horaires renseignés | +5 |

Seuils : HAUTE ≥ 60, MOYENNE 30-59, FAIBLE < 30.

---

## Hors scope de ce spec (Phases 3-5)

- Création repo GitHub privé par prospect
- Max 3 maquettes par prospect
- Alerte validation maquette
- Envoi email Himalaya + lecture réponses
- Adaptation prompt depuis réponses prospect
- Pipeline statuts auto
- Résumé échanges auto-généré
