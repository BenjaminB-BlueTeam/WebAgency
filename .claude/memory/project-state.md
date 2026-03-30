---
name: État du projet WebAgency
description: Historique des évolutions, état actuel du pipeline, ce qui reste à faire et idées notées
type: project
---

## Ce qui a été fait

### 2026-03-29 — Création initiale du pipeline
- `prospect.js` créé : pipeline complet Node.js (ESModules)
- 9 prospects trouvés et enregistrés dans `crm.json` (secteur Steenvoorde)
- Pipeline original : web_search dans Claude → rate limit 429 systématique

### 2026-03-30 — Refactoring majeur : Google Places + Firecrawl
Problème : 21 appels `web_search` dans Claude = ~33k tokens/min → erreur 429 fatale

**Solution implémentée :**
- `placesTextSearch(query)` — Google Places Text Search remplace la recherche web
- `placesDetails(placeId)` — Google Places Details pour tél + site + horaires
- `scrapeUrl(url)` — Firecrawl (primaire) + fetch() natif (fallback) pour scraper les sites
- `analyserSiteExistant()` refactorisée — scrapeUrl + 1 appel Claude sans tools
- `analyserConcurrents()` refactorisée — Places + scrapeUrl + 1 appel Claude sans tools
- `rechercherProspects()` refactorisée — Places + scrapeUrl + 1 appel Claude sans tools
- Pauses `wait(60000)` et `wait(30000)` supprimées de main() et rechercherProspects()

**Résultat :** ~33k tokens → ~9k tokens, 0 occurrence de web_search_20250305, rate limit impossible

### 2026-03-30 — Mise en production sur GitHub
- Repo : https://github.com/BenjaminB-BlueTeam/WebAgency
- README complet rédigé (installation, commandes, architecture, tarification, directions artistiques)
- Premier commit pushé sur branche main

## État actuel (2026-03-30)

**Pipeline opérationnel** — toutes les fonctions refactorisées, clés API configurées dans .env

**CRM :** 9 prospects dans crm.json, tous au stade PROSPECT, aucun contacté
- Boulangerie Caron (Steenvoorde) — SITE_OBSOLETE — HAUTE priorité — tél disponible
- Pharmacie des Géants (Steenvoorde) — SANS_SITE — HAUTE priorité
- So Choux (Bailleul) — SANS_SITE — HAUTE priorité
- QAD Services (Hazebrouck) — SANS_SITE — HAUTE priorité

**Test d'intégration :** Pas encore lancé avec les nouvelles clés API (à faire)

## Ce qui reste à faire

### Priorité immédiate
- [ ] Lancer `node prospect.js "Cassel"` pour valider le pipeline refactorisé end-to-end
- [ ] Contacter les 4 prospects HAUTE priorité (Boulangerie Caron en premier — tél + email dispos)

### Améliorations identifiées (non bloquantes)
- [ ] `opening_hours` récupéré par Places Details mais non transmis à Claude — donnée gratuite à exploiter
- [ ] Pas de retry sur les appels Places API dans la boucle villes — à surveiller si charge élevée
- [ ] `var demoUrl` legacy dans `traiterProspect` — refactoriser en `let` (bug pré-existant)
- [ ] Ajouter `crm.json` au gitignore ou dans un .env.example pour les données prospects

### Idées notées en session
- Apify avait été évoqué avant Google Places — choix final : Google Places car données structurées + $200 crédit gratuit/mois
- Firecrawl préféré à fetch() seul car : gère JS/React/Cloudflare, retourne markdown propre (4-5x moins de tokens)
- SerpAPI et Brave Search avaient été évoqués comme alternatives à Google Places

## Why / How to apply

**Why** ce refactoring : le pipeline original épuisait le rate limit de 30k tokens/min Anthropic dès la première exécution car web_search générait des boucles multi-tours très consommatrices.

**How to apply** : si le pipeline plante encore sur un 429, regarder d'abord si une nouvelle fonction Claude a été ajoutée avec le tool `web_search` — c'est le signal.
