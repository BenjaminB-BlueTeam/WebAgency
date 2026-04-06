# Cahier des Charges — CRM Flandre Web Agency v2

## 1. Introduction

### 1.1. Objectif

Cette application est le CRM interne de Flandre Web Agency. Elle centralise l'intégralité du cycle commercial : identification de prospects locaux, analyse de leur présence en ligne, génération de maquettes de sites vitrines, prospection par email, suivi de la pipeline commerciale jusqu'à la signature, et gestion post-livraison (rapports mensuels de performance, paiement récurrent).

### 1.2. Périmètre

- **Utilisateur unique** : Benjamin, développeur web freelance basé à Steenvoorde (Nord).
- **Zone géographique** : Flandre Intérieure (Hazebrouck, Cassel, Bailleul, Wormhout, Bergues et environs).
- **Cible client** : Artisans, commerçants et petites entreprises locales.
- **Pas de multi-utilisateur**, pas de système de permissions, pas de collaboration.

### 1.3. Offres Commerciales

| Offre | Prix | Inclus |
|---|---|---|
| Vitrine | ~1 200 € | Site 4-5 pages, design sur mesure, responsive, SEO de base, mise en ligne, maintenance 49€/mois |
| Visibilité | ~1 800 € | Tout Vitrine + audit concurrentiel livré en PDF, SEO local avancé + Google Business, fonctionnalité métier (réservation, formulaire devis, galerie...), maintenance 49€/mois |

L'audit concurrentiel est réalisé systématiquement en interne pour alimenter la génération de maquettes. Pour l'offre Visibilité, il est exporté en PDF professionnel brandé Flandre Web Agency et livré au client comme livrable à part entière.

#### Détail de la maintenance mensuelle (49€/mois)

- **Hébergement et maintenance technique** : uptime, sécurité, mises à jour
- **Modifications de contenu** : changement d'horaires, ajout d'un service, nouveau numéro...
- **Rapport mensuel de performance** : visiteurs, tendances, sources de trafic, recommandations (généré automatiquement via Plausible + Claude, envoyé en PDF brandé)
- **Support prioritaire** : réponse rapide par téléphone ou email
- **Paiement** : prélèvement mensuel automatique via Stripe

### 1.4. Ce qui est exclu

- Devis et facturation (gérés via Shine)
- Pipeline CLI (prospect.js) — tout est intégré dans le CRM
- Page maquettes séparée — intégrée dans la fiche prospect
- Page analytics séparée — intégrée dans le dashboard

---

## 2. Architecture Technique

### 2.1. Stack Technologique

| Catégorie | Technologie | Justification |
|---|---|---|
| Frontend | Next.js (App Router) + React | SSR, routing intégré, composants React |
| UI | Tailwind CSS + shadcn/ui | Design système cohérent, composants accessibles |
| Animations | Framer Motion (package "motion") | Micro-animations fluides, support mobile |
| Backend | Next.js API Routes | Monorepo, pas de serveur séparé |
| ORM | Prisma | Type-safe, migrations, support SQLite/Turso |
| BDD (dev) | SQLite | Léger, pas de serveur DB en local |
| BDD (prod) | Turso (LibSQL) | SQLite distribué, compatible Vercel edge |
| Hébergement | Vercel | Déploiement auto, serverless, preview branches |
| Auth | JWT + bcrypt | Mono-utilisateur, cookie de session (expiration 7j) |
| Tests | Vitest | Rapide, compatible ESM, intégration TypeScript |

### 2.2. APIs Externes

| API | Usage | Détail |
|---|---|---|
| Google Places API | Recherche d'entreprises locales | Nom, adresse, téléphone, avis, note, placeId |
| Pappers API | Enrichissement données légales | Ancienneté, CA, effectifs, SIRET (gratuit 100 req/mois) |
| Google PageSpeed Insights | Audit technique des sites | Score performance, accessibilité, SEO, bonnes pratiques |
| Firecrawl | Scraping de sites web | Contenu HTML pour analyse IA du design/UX |
| Anthropic (Claude Sonnet) | IA générative | Analyse concurrentielle, prompt builder maquettes, emails, scoring |
| Netlify API | Déploiement des démos | URL unique par prospect, free tier |
| Plausible Analytics API | Statistiques des sites clients | Auto-hébergé sur VPS Hostinger, RGPD-friendly, pas de bannière cookie |
| Stripe API | Paiement récurrent maintenance | Abonnements mensuels 49€, liens de paiement ou API |
| Resend | Envoi d'emails | 100 emails/mois gratuit, API simple |

### 2.3. Scoring Multi-Axes

Chaque prospect reçoit un scoring sur 5 axes, chacun noté de 0 à 10 :

- **Présence web (poids x3)** : a un site ? HTTPS ? mobile-friendly ? (Google Places + vérification technique)
- **Qualité SEO (poids x2)** : meta tags, vitesse, structured data (PageSpeed Insights API)
- **Qualité design/UX (poids x2)** : design daté, pas responsive, pas de CTA (Firecrawl + analyse Claude)
- **Potentiel financier (poids x1)** : ancienneté, CA, taille de l'entreprise (Pappers API)
- **Urgence / Potentiel d'achat (poids x3)** : pas de site = 10/10, site très daté = 8/10, site correct = 2/10 (synthèse Claude)

Le score global est une moyenne pondérée de ces 5 axes, stocké en base pour tri et filtrage.

---

## 3. Pages et Fonctionnalités

L'application comporte 8 pages principales, accessibles via une sidebar fixe à gauche (desktop) ou un menu hamburger (mobile). Le Dashboard est la page par défaut.

### 3.1. Dashboard

Page d'accueil affichant une vue d'ensemble de l'activité commerciale.

**Widgets statistiques (haut de page)** : nombre total de prospects, prospects à démarcher, maquettes envoyées (en attente de réponse), clients signés (total et ce mois-ci), taux de conversion global (maquette envoyée → signé).

**Alertes et relances** : liste des prospects nécessitant une relance, triés par urgence. Badge indiquant le nombre de relances en attente.

**Activité récente** : timeline des 10 dernières actions (recherche, analyse, maquette générée, email envoyé, changement pipeline...).

**Mini pipeline visuel** : barre horizontale montrant la répartition des prospects par étape du pipeline.

---

### 3.2. Recherche de Prospects

Interface de découverte de nouvelles entreprises à prospecter.

**Formulaire de recherche** : secteur d'activité (champ texte libre), ville ou zone (champ texte avec autocomplétion), rayon (sélecteur 5km, 10km, 20km, 30km).

**Pipeline de recherche** (au lancement) :
1. Google Places API — liste des entreprises correspondantes
2. Pappers API — enrichissement données légales (ancienneté, CA, effectifs)
3. PageSpeed Insights — audit technique (si site existant)
4. Firecrawl + Claude — analyse design/UX et scoring IA

**Affichage des résultats** : liste de cartes avec nom, activité, ville, note Google, présence ou absence de site web, score global.

**Expand d'un résultat** : scoring détaillé par axe (5 barres de progression), lien vers le site existant, données Pappers, téléphone et email.

**Actions** : checkbox de sélection, bouton "Enregistrer les sélectionnés" (bascule vers la page Prospects avec statut "À démarcher"), indicateur de doublon.

---

### 3.3. Prospects

Page centrale de gestion des prospects enregistrés.

#### 3.3.1. Vue Liste

Tableau avec colonnes : Nom, Activité, Ville, Score global, Note Google, Site existant, Statut pipeline, Date d'ajout. Tri par colonnes et recherche textuelle. Filtres par statut pipeline et par score minimum.

**Expand d'une ligne** (vue rapide, sans navigation) : informations de contact, note Google + avis, présence/absence de site, scoring détaillé par axe (5 mini-barres), boutons : Voir fiche, Analyser concurrence, Démarcher.

#### 3.3.2. Fiche Prospect (page dédiée)

Organisée en onglets :

**Onglet 1 — Informations** : données de contact complètes, données Google, données légales Pappers, scoring détaillé avec barres visuelles, statut pipeline modifiable, notes libres.

**Onglet 2 — Analyse Concurrentielle** : bouton "Analyser la concurrence" qui lance la recherche de concurrents (même secteur + même zone via Google Places), scrape leurs sites (Firecrawl), et fait analyser par Claude. Résultats : liste des concurrents avec forces/faiblesses, synthèse et recommandations. Stocké en base (modèle Analyse).

**Onglet 3 — Maquette** : bouton "Générer une maquette" qui :
1. Récupère les données prospect + analyse concurrentielle
2. Claude (Sonnet) construit dynamiquement le prompt Stitch (pas de templates métiers hardcodés)
3. Google Stitch SDK génère les écrans HTML (accueil, services, contact, à propos)
4. Déploiement automatique sur Netlify (URL de démo unique)
5. Sauvegarde en base (HTML + URL + version)

Après génération : preview iframe, boutons plein écran/régénérer (max 3)/copier URL. Pas de versioning GitHub.

**Onglet 4 — Activité** : timeline chronologique de toutes les actions liées au prospect, générée automatiquement.

---

### 3.4. Pipeline (Kanban)

Tableau kanban en drag & drop, fonctionnel sur desktop et mobile.

| Colonne | Description |
|---|---|
| À démarcher | Prospect identifié, scoré, analyse faite, prêt à contacter |
| Maquette + Email envoyés | Maquette générée, email de prospection envoyé avec lien démo + capture d'écran |
| Répondu | Le prospect a réagi (email, appel, SMS) |
| RDV planifié | Rendez-vous fixé pour discuter du projet |
| Négociation | Devis envoyé, discussion en cours |
| Client | Devis signé, prospect converti en client |
| Perdu | Prospect non intéressé (raison de perte enregistrée) |

**Carte prospect** : nom + activité + ville, score global (pastille colorée), indicateur de relance (badge rouge), date d'entrée dans la colonne. Clic → ouvre la fiche.

**Fonctionnalités** : drag & drop tactile et souris, mise à jour automatique en base, enregistrement dans la timeline, champ "raison" au drop dans "Perdu".

---

### 3.5. Prospection Email

Centre de gestion des emails de prospection. Page dédiée.

**Vue principale** : liste des prospects filtrés par statut, avec nom, activité, dernier email, indicateur de relance.

**Génération d'email** : Claude génère un email personnalisé basé sur les données prospect, l'analyse concurrentielle et la maquette.

**Format** : corps texte personnalisé, capture d'écran miniature de la maquette intégrée, lien vers la démo Netlify, signature HTML brandée Flandre Web Agency.

**Actions** : prévisualiser, modifier, envoyer. Historique visible dans la fiche prospect.

---

### 3.6. Système de Relances

Semi-automatique. Le CRM calcule et suggère, l'utilisateur décide.

| Situation | Délai | Action suggérée |
|---|---|---|
| Email envoyé, pas de réponse | 7 jours | Relance email (brouillon généré par Claude) |
| Maquette envoyée, pas de retour | 5 jours | Relance email ou appel suggéré |
| RDV passé, pas de suite | 3 jours | Relance pour devis / suite à donner |
| Devis envoyé, pas de réponse | 10 jours | Relance devis (brouillon généré par Claude) |

**Affichage** : widget dashboard avec badge compteur, badge rouge sur les cartes kanban, indicateur dans la page emails.

L'envoi reste manuel. Pas de spam automatique.

---

### 3.7. Paramètres

- Configuration des clés API
- Changement du mot de passe
- Durée d'expiration de la session (défaut 7 jours)
- Configuration de la signature email HTML
- Règles de relance (délais personnalisables)

---

### 3.8. Clients

Page de suivi des prospects convertis en clients.

**Vue principale** : liste des clients actifs avec nom, activité, offre souscrite, date de livraison, URL du site, statut maintenance (active/résiliée), statut paiement Stripe (actif/en retard/annulé), date du dernier rapport envoyé.

**Fiche client** : informations de contact (héritées du prospect), URL du site en production, lien vers le dashboard Plausible, historique des rapports mensuels, statut et historique paiements Stripe.

---

### 3.9. Rapport Mensuel de Performance

Chaque site client intègre un script Plausible Analytics (auto-hébergé sur VPS Hostinger, RGPD-friendly, pas de bannière cookie).

**Génération** :
1. Récupération des stats via l'API Plausible (visiteurs uniques, pages vues, sources de trafic, pages les plus visitées, appareils, tendance vs mois précédent)
2. Claude génère un résumé personnalisé en langage simple
3. Export en PDF brandé Flandre Web Agency
4. Envoi par email au client

**Déclenchement** : automatique (cron mensuel, 1er de chaque mois) ou manuel (bouton sur la fiche client).

---

### 3.10. Paiement Récurrent (Stripe)

**Phase 1** : pas d'intégration API. Lien de paiement créé manuellement depuis le dashboard Stripe.

**Phase 2** : intégration API Stripe — création d'abonnement automatique quand un prospect passe en "Client", webhook pour mise à jour du statut de paiement, alerte dashboard si paiement échoue.

---

## 4. Modèle de Données (Prisma)

### 4.1. Prospect

| Attribut | Type | Requis | Description |
|---|---|---|---|
| id | String (cuid) | Auto | Identifiant unique |
| nom | String | Oui | Nom de l'entreprise |
| activite | String | Oui | Secteur d'activité |
| ville | String | Oui | Ville |
| adresse | String | Non | Adresse complète |
| telephone | String | Non | Numéro de téléphone |
| email | String | Non | Adresse email |
| siteUrl | String | Non | URL du site existant |
| placeId | String | Non | Google Place ID (unique) |
| noteGoogle | Float | Non | Note Google (0-5) |
| nbAvisGoogle | Int | Non | Nombre d'avis Google |
| scorePresenceWeb | Int | Non | Score présence web (0-10) |
| scoreSEO | Int | Non | Score SEO (0-10) |
| scoreDesign | Int | Non | Score design/UX (0-10) |
| scoreFinancier | Int | Non | Score potentiel financier (0-10) |
| scorePotentiel | Int | Non | Score urgence/potentiel d'achat (0-10) |
| scoreGlobal | Int | Non | Moyenne pondérée des 5 axes |
| statutPipeline | String | Oui | Défaut : A_DEMARCHER |
| dateContact | DateTime | Non | Date du premier contact |
| dateRdv | DateTime | Non | Date du RDV |
| dateMaquetteEnvoi | DateTime | Non | Date d'envoi de la maquette |
| dateSignature | DateTime | Non | Date de signature |
| raisonPerte | String | Non | Raison si prospect perdu |
| derniereRelance | DateTime | Non | Date de la dernière relance |
| prochaineRelance | DateTime | Non | Date de la prochaine relance calculée |

Contrainte unique : @@unique([nom, ville]). Index : statutPipeline, scoreGlobal.
Relations : maquettes[], analyses[], emails[], activites[], notes[], client (optionnel, 1:1).

### 4.2. Analyse

| Attribut | Type | Requis | Description |
|---|---|---|---|
| id | String (cuid) | Auto | Identifiant unique |
| prospectId | String (FK) | Oui | Lien vers Prospect (cascade delete) |
| concurrents | String (JSON) | Oui | Liste des concurrents : nom, URL, forces, faiblesses, scoring |
| recommandations | String (JSON) | Oui | Points clés pour le site du prospect |
| promptUsed | String | Non | Prompt utilisé pour l'analyse |
| createdAt | DateTime | Auto | Date de création |

### 4.3. Maquette

| Attribut | Type | Requis | Description |
|---|---|---|---|
| id | String (cuid) | Auto | Identifiant unique |
| prospectId | String (FK) | Oui | Lien vers Prospect (cascade delete) |
| html | String | Oui | Contenu HTML complet |
| demoUrl | String | Non | URL Netlify de la démo |
| netlifySiteId | String | Non | ID du site Netlify |
| version | Int | Oui | Défaut : 1 (max 3 par prospect) |
| promptUsed | String | Non | Prompt envoyé à Stitch |
| statut | String | Oui | BROUILLON / ENVOYEE / VALIDEE / REJETEE |
| createdAt | DateTime | Auto | Date de création |

### 4.4. Email

| Attribut | Type | Requis | Description |
|---|---|---|---|
| id | String (cuid) | Auto | Identifiant unique |
| prospectId | String (FK) | Oui | Lien vers Prospect (cascade delete) |
| type | String | Oui | PROSPECTION / RELANCE / MAQUETTE / CUSTOM |
| sujet | String | Oui | Objet de l'email |
| contenu | String | Oui | Corps HTML de l'email |
| statut | String | Oui | BROUILLON / ENVOYE |
| dateEnvoi | DateTime | Non | Date d'envoi effectif |
| createdAt | DateTime | Auto | Date de création |

### 4.5. Note

| Attribut | Type | Requis | Description |
|---|---|---|---|
| id | String (cuid) | Auto | Identifiant unique |
| prospectId | String (FK) | Oui | Lien vers Prospect (cascade delete) |
| contenu | String | Oui | Texte libre |
| createdAt | DateTime | Auto | Date de création |

### 4.6. Activité

| Attribut | Type | Requis | Description |
|---|---|---|---|
| id | String (cuid) | Auto | Identifiant unique |
| prospectId | String (FK) | Non | Lien optionnel vers Prospect |
| type | String | Oui | RECHERCHE / ANALYSE / MAQUETTE / EMAIL / RELANCE / PIPELINE / NOTE |
| description | String | Oui | Description de l'action |
| createdAt | DateTime | Auto | Date de création |

### 4.7. Recherche

| Attribut | Type | Requis | Description |
|---|---|---|---|
| id | String (cuid) | Auto | Identifiant unique |
| query | String | Oui | Terme de recherche |
| ville | String | Non | Ville ou zone recherchée |
| resultatsCount | Int | Oui | Nombre de résultats trouvés |
| prospectsAjoutes | Int | Oui | Nombre de prospects enregistrés |
| createdAt | DateTime | Auto | Date de la recherche |

### 4.8. Paramètre

| Attribut | Type | Requis | Description |
|---|---|---|---|
| id | String (cuid) | Auto | Identifiant unique |
| cle | String (unique) | Oui | Clé du paramètre |
| valeur | String | Oui | Valeur du paramètre |

### 4.9. Client

| Attribut | Type | Requis | Description |
|---|---|---|---|
| id | String (cuid) | Auto | Identifiant unique |
| prospectId | String (FK, unique) | Oui | Lien 1:1 vers Prospect |
| siteUrl | String | Oui | URL du site livré en production |
| plausibleSiteId | String | Non | ID dans Plausible pour l'API stats |
| dateLivraison | DateTime | Oui | Date de livraison du site |
| offreType | String | Oui | VITRINE / VISIBILITE |
| maintenanceActive | Boolean | Oui | Défaut : true |
| stripeCustomerId | String | Non | ID client Stripe |
| stripeSubscriptionId | String | Non | ID abonnement Stripe |
| stripeStatus | String | Non | active / past_due / canceled |
| createdAt | DateTime | Auto | Date de création |

Relations : prospect (1:1), rapports[].

### 4.10. Rapport

| Attribut | Type | Requis | Description |
|---|---|---|---|
| id | String (cuid) | Auto | Identifiant unique |
| clientId | String (FK) | Oui | Lien vers Client (cascade delete) |
| mois | String | Oui | Période du rapport (ex: "2026-04") |
| visiteurs | Int | Oui | Visiteurs uniques du mois |
| pagesVues | Int | Oui | Nombre de pages vues |
| topPages | String (JSON) | Oui | Pages les plus visitées |
| topSources | String (JSON) | Oui | Sources de trafic |
| tendance | Float | Non | % évolution vs mois précédent |
| resumeIA | String | Oui | Résumé généré par Claude |
| pdfUrl | String | Non | Lien vers le PDF généré |
| dateEnvoi | DateTime | Non | Date d'envoi au client |
| createdAt | DateTime | Auto | Date de création |

Contrainte unique : @@unique([clientId, mois]).

---

## 5. Exigences Non Fonctionnelles

### 5.1. Performance

- Chargement initial : moins de 3 secondes
- Actions CRUD : moins de 1 seconde
- Génération de maquette : jusqu'à 5 minutes (feedback visuel de progression obligatoire)
- Recherche de prospects : jusqu'à 2 minutes (SSE ou polling pour feedback temps réel)

### 5.2. Responsive Design

100% responsive mobile. Pas de fonctionnalité dégradée. Kanban utilisable en drag & drop tactile. Sidebar → hamburger. Tableaux → cartes sur mobile.

### 5.3. UI/UX

- Design system : "Noir Absolu" — shadcn/ui + Tailwind CSS, thème dark, noir pur (#000), accents blancs, bordures fines #1a1a1a, border-radius 6px, aucun gradient/ombre/blur
- Animations : Framer Motion — fade-in staggeré sur les listes, hover lift sur les cartes, expand/collapse fluide, barres de scoring animées, compteurs animés sur le dashboard
- Navigation : sidebar fixe à gauche (desktop), hamburger (mobile)
- Feedback : toasts pour les actions, loaders pour les opérations longues
- Cohérence : composants réutilisables, palette uniforme

### 5.4. Sécurité (OWASP Top 10 — 2025)

| Risque OWASP | Mesures appliquées |
|---|---|
| A01 — Broken Access Control | middleware requireAuth() sur toutes les routes API |
| A02 — Cryptographic Failures | bcrypt (salt >= 10), JWT secret >= 256 bits, cookies httpOnly + secure + sameSite |
| A03 — Injection | requêtes Prisma paramétrées, validation et sanitization des inputs |
| A04 — Insecure Design | allowlists sur champs modifiables, rate limiting login (5 tentatives/min), limites de taille |
| A05 — Security Misconfiguration | .env.local non committé, headers de sécurité (CSP, X-Frame-Options) |
| A06 — Vulnerable Components | npm audit régulier, lockfile committé |
| A07 — Auth Failures | expiration JWT configurable (7j), invalidation au changement de mot de passe |
| A08 — Data Integrity Failures | validation côté serveur même si validé côté client |
| A09 — Logging & Monitoring | logs structurés, tentatives de login échouées loguées |
| A10 — SSRF | validation des URLs, whitelist des domaines autorisés |

### 5.5. Stratégie de Tests

Framework : Vitest.

**Tests unitaires** : scoring (calcul, bornes, null), parsing JSON Claude, auth (JWT, bcrypt), prompt builder, validation des inputs.

**Tests d'intégration** : API routes CRUD, pipeline kanban (changement de statut → activité créée), recherche Google Places (mock).

**Tests E2E (Phase 2)** : flux complet login → recherche → maquette → email. Kanban drag & drop.

**CI/CD** : GitHub Actions — lint + type-check + tests + build sur chaque push. Merge bloqué si échec.

**Couverture** : Phase 1 > tests unitaires critiques. Phase 2 > 60%.

---

## 6. Priorisation par Phases

### Phase 1 — "Je peux prospecter" (priorité absolue)

- Authentification (login simple)
- Page Recherche de Prospects (Google Places + scoring)
- Page Prospects (liste + fiche avec onglets Infos et Maquette)
- Génération de maquette (Claude + Stitch + Netlify)
- Envoi d'email basique (depuis la fiche prospect)
- Pipeline kanban minimal (colonnes + drag & drop)
- Schéma Prisma complet dès le départ

### Phase 2 — "Je scale" (après le premier client)

- Dashboard complet avec stats et widgets
- Analyse concurrentielle (onglet dédié)
- Page Prospection Email dédiée
- Système de relances semi-automatique
- Enrichissement Pappers (données légales)
- Page Clients avec suivi post-livraison
- Plausible Analytics auto-hébergé + rapports mensuels automatisés
- Intégration Stripe API
- Export PDF audit concurrentiel
- Page Paramètres complète
- Tests Vitest + CI/CD GitHub Actions

---

## 7. Critères d'Acceptation

### Phase 1 validée si :

- La recherche Google Places retourne des résultats avec scoring fonctionnel
- Un prospect peut être enregistré et sa fiche affichée avec toutes les données
- La génération de maquette produit un site déployé sur Netlify accessible via URL
- Un email de prospection avec capture d'écran de la maquette peut être envoyé
- Le kanban permet le drag & drop sur desktop ET mobile
- L'application est responsive et fonctionnelle sur mobile
- npm run build ne produit aucune erreur

### Phase 2 validée si :

- Le dashboard affiche des statistiques cohérentes et à jour
- L'analyse concurrentielle produit des résultats exploitables
- Le système de relances suggère les bonnes actions au bon moment
- La page Clients affiche les clients actifs avec statut paiement et dernier rapport
- Le rapport mensuel se génère correctement (stats Plausible + résumé Claude + PDF)
- L'abonnement Stripe se crée et le statut de paiement se synchronise via webhook
- Les tests couvrent les fonctions critiques (scoring, parsing, auth)
- La CI/CD bloque les merges si les tests échouent
