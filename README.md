# WebAgency Tool — Pipeline de prospection automatisé

Outil de prospection commerciale pour Benjamin Bourger, développeur web indépendant basé à **Steenvoorde (Nord, 59114)**.

En une commande, le pipeline trouve des TPE et artisans locaux sans site ou avec un site obsolète, génère une maquette web "wow" personnalisée, la déploie sur Netlify, et produit une page de proposition commerciale prête à envoyer.

---

## Fonctionnement en bref

```
node prospect.js "plombier Cassel"
        │
        ├─ 1. Google Places API → trouve les entreprises du secteur (nom, tél, site, rating)
        ├─ 2. Firecrawl → scrape le contenu des sites existants en markdown propre
        ├─ 3. Claude (analyse seule) → classifie les prospects + arguments commerciaux
        ├─ 4. Analyse concurrentielle → 2-3 concurrents avec site dans la région
        ├─ 5. Audit site existant → note /10, sections manquantes, signaux conversion
        ├─ 6. Génération maquette HTML "wow" (ou Astro) → corrige explicitement les faiblesses
        ├─ 7. Déploiement Netlify → URL de démo instantanée
        ├─ 8. Page de proposition commerciale → à envoyer directement au client
        ├─ 9. Mise à jour CRM → crm.json
        └─ 10. Rapport complet → scripts de contact + analyse concurrentielle
```

---

## Prérequis

- **Node.js 18+** (fetch natif requis)
- Compte **Anthropic** avec clé API → [console.anthropic.com](https://console.anthropic.com)
- Compte **Netlify** avec Personal Access Token → [app.netlify.com](https://app.netlify.com/user/applications#personal-access-tokens)
- Compte **Google Cloud** avec Places API activée → [console.cloud.google.com](https://console.cloud.google.com)
- Compte **Firecrawl** (optionnel, fallback fetch() si absent) → [firecrawl.dev](https://www.firecrawl.dev)

---

## Installation

```bash
git clone https://github.com/BenjaminB-BlueTeam/WebAgency.git
cd WebAgency
npm install
```

Créer le fichier `.env` à la racine :

```env
# Clé API Anthropic — https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-api03-...

# Token Netlify — https://app.netlify.com/user/applications#personal-access-tokens
NETLIFY_TOKEN=nfp_...

# Google Places API — https://console.cloud.google.com → Places API → Clé API
GOOGLE_PLACES_KEY=AIzaSy...

# Firecrawl — https://www.firecrawl.dev → Dashboard → API Keys
# Optionnel : sans cette clé, le fallback fetch() est activé automatiquement
FIRECRAWL_KEY=fc-...
```

### Setup Google Places API (5 min)

1. Aller sur [console.cloud.google.com](https://console.cloud.google.com)
2. Créer un projet ou sélectionner un existant
3. **APIs & Services → Bibliothèque → chercher "Places API" → Activer**
4. **APIs & Services → Identifiants → Créer des identifiants → Clé API**
5. Restreindre la clé à l'IP de votre machine (sécurité)
6. Copier la clé dans `.env`

> **Coût :** Google offre 200$/mois de crédit gratuit. ~100 recherches/mois ≈ 3$ → **gratuit en pratique.**

### Setup Firecrawl (2 min)

1. Créer un compte sur [firecrawl.dev](https://www.firecrawl.dev)
2. Dashboard → API Keys → New Key
3. Copier la clé dans `.env`

> **Free tier :** 500 pages/mois. Largement suffisant pour l'usage.

---

## Commandes

```bash
# Recherche + maquette HTML pour le top prospect
node prospect.js "plombier Steenvoorde"

# Maquette en Astro (projet multi-fichiers)
node prospect.js "coiffeur Cassel" --astro

# Traiter TOUS les prospects HAUTE priorité
node prospect.js "restauration Bailleul" --tous

# Rapport seul, sans génération de maquette
node prospect.js "artisans Hazebrouck" --index

# Via npm
npm run prospect -- "électricien Wormhout"
```

### Options disponibles

| Option | Description |
|---|---|
| *(aucune)* | Mode HTML par défaut — maquette one-file |
| `--astro` | Génère un projet Astro complet (multi-fichiers) |
| `--tous` | Génère une maquette pour **tous** les prospects HAUTE priorité |
| `--index` | Rapport uniquement, sans maquette ni déploiement |

---

## Sorties générées

```
output/
├── rapport-[timestamp].md          ← Rapport complet avec scripts de contact
├── [slug-client]/
│   ├── index.html                  ← Maquette HTML du site vitrine
│   └── PROPOSITION.html            ← Page de présentation à envoyer au client
└── [slug-client]-proposition/
    └── index.html                  ← Copie déployée de la proposition
```

### Rapport Markdown

Contient pour chaque prospect :
- Statut web, priorité, argument commercial
- URL de la démo Netlify
- URL de la proposition à envoyer
- Script d'appel téléphonique prêt à l'emploi
- SMS avec lien démo
- Analyse concurrentielle complète
- Planning de relances J+0 / J+2 / J+5 / J+10 / J+21

---

## CRM Web — Dashboard Next.js

En plus du pipeline CLI, le projet inclut un **CRM complet** accessible via navigateur à `http://localhost:3000`.

### Lancer le CRM

```bash
cd crm
npm install
npx prisma migrate deploy   # initialise la base SQLite
npm run dev                  # démarre sur http://localhost:3000
```

### Synchroniser le pipeline CLI → CRM

Après avoir lancé `node prospect.js "..."`, importer les résultats dans le CRM :

```bash
npm run sync-crm   # depuis la racine
# ou : cd crm && npm run sync-crm
```

Le script lit `crm.json`, crée ou met à jour chaque prospect dans Prisma, et préserve le statut pipeline s'il a déjà progressé.

### Configuration CRM (crm/.env.local)

```env
DATABASE_URL="file:./prisma/dev.db"
CRM_SESSION_SECRET="une-chaine-aleatoire-de-32-chars"
CRM_PASSWORD_HASH=""   # vide = mot de passe "admin" en dev. En prod, générer avec bcryptjs
NODE_ENV=development
```

### Pages disponibles

| Page | Statut | Description |
|---|---|---|
| `/` | ✅ Complet | Dashboard : stats, pipeline, activités récentes, alertes relances |
| `/prospection` | ✅ Complet | Lancement pipeline en temps réel (SSE), résultats, historique |
| `/prospects` | ✅ Complet | Liste avec recherche, filtres, vue Kanban par pipeline |
| `/prospects/[id]` | ✅ Complet | Fiche détail : maquettes liées, timeline activités, actions |
| `/clients` | ✅ Complet | Prospects SIGNÉ/LIVRÉ uniquement |
| `/maquettes` | ✅ Complet | Galerie toutes maquettes, avec URLs démo |
| `/parametres` | ✅ Complet | Profil Benjamin + tarifs |
| `/devis` | ✅ Complet | CRUD, stats pipeline (montant en attente / accepté / taux conversion), transitions statut |
| `/factures` | ✅ Complet | CRUD, lien vers devis, CA encaissé, alertes retard |
| `/analytics` | ✅ Complet | KPIs, funnel pipeline, répartition statut web, maquettes, tableaux devis/factures, historique prospection |
| `/print/devis/[id]` | ✅ Complet | Page A4 dédiée : profil, client, prestation, totaux HT/TVA/TTC, signature — s'imprime automatiquement (auth requise) |
| `/print/factures/[id]` | ✅ Complet | Page A4 dédiée : idem + gestion acompte, reste à payer, statut coloré (auth requise) |

### Statuts pipeline

```
PROSPECT → CONTACTÉ → RDV → DEVIS → SIGNÉ → LIVRÉ
```

### Statuts web des prospects

| Statut | Signification | Priorité commerciale |
|---|---|---|
| `SANS_SITE` | Aucun site web | HAUTE |
| `SITE_OBSOLETE` | HTTP / design pré-2018 / non mobile | HAUTE |
| `SITE_BASIQUE` | Site présent mais incomplet | MOYENNE |
| `SITE_CORRECT` | Site de qualité acceptable | FAIBLE / exclu |

---

## Qualité des maquettes générées

Chaque maquette suit des standards stricts non négociables :

### Standards CSS
- Toutes les couleurs via **CSS custom properties** dans `:root`
- Police display choisie selon le secteur (jamais Arial/Roboto/Inter générique)
- **Mobile-first** — breakpoints 480px, 768px, 1024px
- `clamp()` pour **toutes** les tailles de texte — zéro `px` fixe
- `backdrop-filter: blur()` sur la navigation sticky
- Hero toujours avec élément CSS fort : `clip-path`, gradient en couches, pattern CSS

### Standards JavaScript (vanilla uniquement)
- Intersection Observer pour toutes les animations au scroll
- Compteurs animés pour les stats (`requestAnimationFrame` + `easeOutQuart`)
- Hamburger menu complet : animation 3 barres → X, slide-down, overlay, fermeture clic extérieur
- Smooth scroll natif
- Formulaire : preventDefault, validation temps réel, async simulation, état succès
- Ripple effect sur tous les CTAs principaux

### Standards contenu
- **Zéro Lorem ipsum** — tout le contenu est réaliste et adapté au métier
- Témoignages fictifs avec prénoms nordistes (Jean-Marie, Martine, Kevin, Sandrine...)
- Ville toujours mentionnée dans le hero et le footer
- Mention "Site réalisé par Benjamin Bourger — Steenvoorde" dans le footer

---

## Directions artistiques par secteur

Le pipeline sélectionne automatiquement une direction artistique adaptée au secteur :

| Secteur | Style | Palette | Typographie |
|---|---|---|---|
| Plombier / Chauffage | Industriel premium | Marine profond + cuivré | Barlow Condensed |
| Électricien | Tech bold | Noir + jaune électrique | Rajdhani |
| Coiffeur / Salon | Luxe éditorial | Chocolat + crème | Playfair Display |
| Restaurant / Brasserie | Chaleureux gourmet | Terre cuite + ivoire | Cormorant Garamond |
| Boulangerie / Pâtisserie | Artisanal chaleureux | Blé doré + chocolat | Abril Fatface |
| Menuiserie / Charpente | Artisan bois | Brun foncé + sable | Libre Baskerville |
| Peintre / Ravalement | Créatif moderne | Blanc + rouge accent | Oswald |
| Autres | Professionnel moderne | Bleu marine + vert forêt | DM Serif Display |

---

## Tarification de référence

| Offre | Prix | Contenu |
|---|---|---|
| Offre de base | **690 €** | Jusqu'à 5 pages, design premium, SEO local, domaine .fr + hébergement 1 an, livraison 7j |
| Maintenance | **49 €/mois** | Mises à jour, surveillance 24/7, renouvellements, rapport mensuel |
| Page supplémentaire | +80 € | |
| Galerie | +120 € | |
| Formulaire devis | +180 € | |
| RDV Calendly | +150 € | |
| Blog CMS client | +400 € | |
| Multilingue FR/NL | +400 € | |

> **Règle de négociation :** prix plancher 620 € (-10% max). Toujours offrir le 1er mois de maintenance.

---

## Architecture technique

```
web-agency-tool/
├── prospect.js          ← Pipeline complet (ESModules, Node 18+)
├── package.json         ← Root (npm run prospect / npm run sync-crm)
├── .env                 ← Clés API pipeline (non versionné)
├── .env.example         ← Template des variables requises
├── setup.sh             ← Script d'onboarding automatique
├── crm.json             ← Base prospects legacy (généré par pipeline, non versionné)
├── docs/
│   └── superpowers/
│       ├── specs/       ← Specs de design
│       └── plans/       ← Plans d'implémentation
├── output/              ← Maquettes générées (non versionné)
└── crm/                 ← Dashboard CRM Next.js 16
    ├── scripts/
    │   └── sync-crm.ts  ← Sync crm.json → Prisma SQLite (npm run sync-crm)
    ├── src/
    │   ├── proxy.ts            ← Middleware Next.js 16 : auth toutes routes + 401 JSON sur API
    │   ├── app/
    │   │   ├── (dashboard)/    ← 10 pages dashboard
    │   │   ├── print/          ← Pages A4 impression PDF (devis + factures)
    │   │   ├── api/            ← 13 routes API (auth, prospects, devis, factures, maquettes, prospection)
    │   │   └── login/
    │   ├── lib/                ← db, auth, prospection-jobs, utils
    │   └── components/         ← 35+ composants (layout, prospects, maquettes, prospection)
    └── prisma/
        ├── schema.prisma       ← 7 modèles : Prospect, Maquette, Devis, Facture, Activite, Recherche, Parametre
        └── migrations/         ← Migrations SQLite (dont indexes statutPipeline/statut/priorite)
```

### Fonctions principales de `prospect.js`

| Fonction | Rôle |
|---|---|
| `placesTextSearch(query)` | Recherche d'entreprises via Google Places Text Search |
| `placesDetails(placeId)` | Récupère tél + site + horaires via Google Places Details |
| `scrapeUrl(url)` | Scrape le contenu d'un site (Firecrawl → fetch() fallback) |
| `rechercherProspects(query)` | Orchestre la recherche + enrichissement + classification Claude |
| `analyserConcurrents(query, prospects)` | Trouve 2-3 concurrents avec site + analyse qualité |
| `analyserSiteExistant(url)` | Audit du site actuel du prospect (note /10, manques, stack) |
| `getDesignDirection(activite)` | Sélectionne palette + typo + contenu selon le secteur |
| `genererMaquetteHTML(prospect, analyse, concurrents)` | Génère le HTML complet one-file |
| `genererMaquetteAstro(prospect, outputDir)` | Génère un projet Astro multi-fichiers |
| `genererPagePresentation(prospect, demoUrl)` | Page de proposition commerciale |
| `traiterProspect(prospect, mode, concurrents)` | Orchestre analyse + génération + déploiement |
| `deployerNetlify(dossier)` | Déploie sur Netlify via CLI |
| `genererRapport(prospectsData, resultats)` | Rapport Markdown complet avec scripts de contact |

### Flux de données

```
Google Places API
      │
      ├─ Text Search → liste de places (name, place_id, rating)
      └─ Details → phone, website, opening_hours
              │
              ▼
         Firecrawl / fetch()
              │
              └─ Markdown propre du site (ou HTML tronqué 30kb)
                      │
                      ▼
                Claude Sonnet
                      │
                      ├─ Classification prospects (SANS_SITE / SITE_OBSOLETE / ...)
                      ├─ Analyse concurrentielle (points forts / faibles / benchmark)
                      ├─ Audit site existant (note, sections manquantes, stack)
                      └─ Génération maquette HTML/Astro complète
                              │
                              ▼
                         Netlify CLI
                              │
                              └─ URL de démo + URL de proposition
```

---

## Tokens API Anthropic

| Étape | Tokens (estimés) |
|---|---|
| Classification prospects | ~4k |
| Analyse concurrentielle | ~3k |
| Audit site existant | ~2k |
| Génération maquette HTML | ~20k |
| **Total par exécution** | **~29k** |

Le rate limit Anthropic (30k tokens/minute) n'est plus atteint grâce au découplage entre la récupération de données (Google Places + Firecrawl) et l'analyse Claude.

---

## Auteur

**Benjamin Bourger** — Développeur web indépendant
Steenvoorde (59114) — Nord, France
[benjamin.bourger92@gmail.com](mailto:benjamin.bourger92@gmail.com) · 06.63.78.57.62
