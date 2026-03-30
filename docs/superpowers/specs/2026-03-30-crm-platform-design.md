# CRM WebAgency — Plateforme de gestion commerciale

> **For agentic workers:** This is a design spec. Use superpowers:writing-plans to create the implementation plan.

**Goal:** Plateforme web personnelle pour Benjamin Bourger permettant de gérer l'intégralité du cycle commercial : prospection automatisée, gestion prospects/clients, maquettes de sites, devis et facturation.

**Architecture:** Application Next.js full-stack (App Router) avec SQLite (via Prisma) pour la persistance, déployée localement en dev puis sur Vercel en prod. Le pipeline de prospection existant (`prospect.js`) est intégré comme module backend appelé depuis l'UI.

**Tech Stack:** Next.js 15 (App Router) · React 19 · Tailwind CSS 4 · shadcn/ui · Prisma + SQLite · TypeScript

---

## Décisions de design validées

| Question | Réponse |
|----------|---------|
| Stack | Next.js + React + Tailwind + shadcn/ui + Prisma/SQLite |
| Utilisateurs | Solo (Benjamin), architecture extensible pour multi-user |
| Layout | Sidebar rétractable : labels complets ↔ icônes seules |
| Style | Full dark mode, accent ambre/doré (#f59e0b, #e8a020) |
| Pages | Dashboard, Prospects, Clients, Maquettes, Prospection, Devis, Factures, Paramètres |
| Scope | Plateforme complète en 3 phases |
| Base de données | SQLite local (Prisma), migratable vers PostgreSQL plus tard |
| Auth | Aucune en phase 1, préparé pour NextAuth en phase future |

---

## Phasage

### Phase 1 — Fondations + CRM (priorité immédiate)
- Layout (sidebar rétractable, thème dark)
- Dashboard (stats, pipeline, alertes relance, activité récente)
- Prospects (liste, fiches, filtres, pipeline Kanban, notes, historique)
- Clients (prospects convertis, leur site, suivi post-livraison)
- Maquettes (galerie, preview iframe, statut, lien vers prospect)
- Paramètres (infos Benjamin, clés API, tarifs par défaut)
- Migration des données depuis `crm.json` existant

### Phase 2 — Prospection + Devis
- Prospection (lancer des recherches depuis l'UI, voir les résultats en temps réel, ajouter au CRM)
- Devis (créer/éditer, générer PDF, envoyer par email, suivi signature)
- Intégration `prospect.js` comme module backend (API routes)

### Phase 3 — Facturation + Polish
- Factures (génération depuis devis signé, suivi paiements, relances)
- Notifications (alertes relance, rappels RDV, renouvellements domaine)
- Export données (CSV, PDF récapitulatif)
- Préparation auth (NextAuth) pour future option multi-user

---

## Architecture technique

### Structure du projet

```
crm/
├── prisma/
│   ├── schema.prisma          # Modèle de données
│   └── seed.ts                # Import crm.json existant
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout (sidebar + thème)
│   │   ├── page.tsx           # Dashboard
│   │   ├── prospects/
│   │   │   ├── page.tsx       # Liste prospects
│   │   │   └── [id]/page.tsx  # Fiche prospect détaillée
│   │   ├── clients/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── maquettes/
│   │   │   ├── page.tsx       # Galerie maquettes
│   │   │   └── [id]/page.tsx  # Détail + preview iframe
│   │   ├── prospection/
│   │   │   └── page.tsx       # Lancer recherches
│   │   ├── devis/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── factures/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── parametres/
│   │   │   └── page.tsx
│   │   └── api/
│   │       ├── prospects/route.ts
│   │       ├── clients/route.ts
│   │       ├── maquettes/route.ts
│   │       ├── prospection/route.ts   # Lance prospect.js
│   │       ├── devis/route.ts
│   │       ├── factures/route.ts
│   │       └── netlify/route.ts       # Redéploiement
│   ├── components/
│   │   ├── layout/
│   │   │   ├── sidebar.tsx            # Sidebar rétractable
│   │   │   ├── sidebar-item.tsx
│   │   │   └── topbar.tsx             # Barre supérieure contextuelle
│   │   ├── ui/                        # shadcn/ui components
│   │   ├── prospects/
│   │   │   ├── prospect-table.tsx
│   │   │   ├── prospect-card.tsx
│   │   │   ├── prospect-filters.tsx
│   │   │   └── pipeline-kanban.tsx
│   │   ├── dashboard/
│   │   │   ├── stat-card.tsx
│   │   │   ├── pipeline-bar.tsx
│   │   │   ├── recent-activity.tsx
│   │   │   └── alerts-relance.tsx
│   │   ├── maquettes/
│   │   │   ├── maquette-gallery.tsx
│   │   │   └── maquette-preview.tsx
│   │   └── shared/
│   │       ├── data-table.tsx
│   │       ├── status-badge.tsx
│   │       └── empty-state.tsx
│   └── lib/
│       ├── db.ts                      # Prisma client singleton
│       ├── prospect-engine.ts         # Wrapper autour de prospect.js
│       ├── netlify.ts                 # API Netlify (deploy/redeploy)
│       ├── pdf.ts                     # Génération PDF devis/factures
│       └── utils.ts
├── public/
├── tailwind.config.ts
├── next.config.ts
└── package.json
```

### Modèle de données (Prisma)

```prisma
model Prospect {
  id                String   @id @default(cuid())
  nom               String
  activite          String
  ville             String
  telephone         String?
  email             String?
  siteUrl           String?
  statut            String   // SANS_SITE, SITE_OBSOLETE, SITE_BASIQUE, SITE_CORRECT
  priorite          String   // HAUTE, MOYENNE, FAIBLE
  raison            String?
  argumentCommercial String?
  statutPipeline    String   @default("PROSPECT") // PROSPECT, CONTACTE, RDV, DEVIS, SIGNE, LIVRE
  dateAjout         DateTime @default(now())
  dateContact       DateTime?
  dateRdv           DateTime?
  dateDevis         DateTime?
  dateSignature     DateTime?
  dateLivraison     DateTime?
  notes             String?
  source            String?  // "google_places", "terrain", "bouche_a_oreille"

  maquettes         Maquette[]
  devis             Devis[]
  factures          Facture[]
  activites         Activite[]

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([nom, ville])
}

model Maquette {
  id                String   @id @default(cuid())
  prospectId        String
  prospect          Prospect @relation(fields: [prospectId], references: [id])
  type              String   // "html", "astro"
  htmlPath          String?  // Chemin local vers index.html
  demoUrl           String?  // URL Netlify démo
  propositionUrl    String?  // URL Netlify proposition
  netlifySiteId     String?  // Pour redéploiement
  netlifyPropSiteId String?
  statut            String   @default("BROUILLON") // BROUILLON, DEPLOYE, ENVOYE, VALIDE, REFUSE
  dateCreation      DateTime @default(now())
  dateEnvoi         DateTime?
  dateValidation    DateTime?
  retourClient      String?

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model Devis {
  id                String   @id @default(cuid())
  prospectId        String
  prospect          Prospect @relation(fields: [prospectId], references: [id])
  reference         String   @unique // DEV-2026-001
  offre             String   // ESSENTIELLE, PROFESSIONNELLE, PREMIUM
  montantHT         Float
  montantTTC        Float
  lignes            String   // JSON des lignes du devis
  statut            String   @default("BROUILLON") // BROUILLON, ENVOYE, ACCEPTE, REFUSE, EXPIRE
  dateCreation      DateTime @default(now())
  dateEnvoi         DateTime?
  dateAcceptation   DateTime?
  dateExpiration    DateTime?
  validiteJours     Int      @default(30)
  pdfPath           String?
  notes             String?

  facture           Facture?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model Facture {
  id                String   @id @default(cuid())
  prospectId        String
  prospect          Prospect @relation(fields: [prospectId], references: [id])
  devisId           String?  @unique
  devis             Devis?   @relation(fields: [devisId], references: [id])
  reference         String   @unique // FAC-2026-001
  montantHT         Float
  montantTTC        Float
  statut            String   @default("EN_ATTENTE") // EN_ATTENTE, ACOMPTE_RECU, PAYEE, RELANCEE, IMPAYEE
  dateCreation      DateTime @default(now())
  dateEcheance      DateTime?
  dateAcompte       DateTime?
  datePaiement      DateTime?
  montantAcompte    Float?
  pdfPath           String?
  notes             String?

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model Activite {
  id                String   @id @default(cuid())
  prospectId        String?
  prospect          Prospect? @relation(fields: [prospectId], references: [id])
  type              String   // APPEL, EMAIL, SMS, VISITE, RDV, MAQUETTE, DEVIS, FACTURE, NOTE
  description       String
  date              DateTime @default(now())

  createdAt         DateTime @default(now())
}

model Recherche {
  id                String   @id @default(cuid())
  query             String
  resultatsCount    Int
  prospectsAjoutes  Int
  date              DateTime @default(now())
  rapport           String?  // Contenu markdown du rapport
}

model Parametre {
  id                String   @id @default(cuid())
  cle               String   @unique
  valeur            String
}
```

---

## Pages — Détail fonctionnel

### Dashboard (`/`)

**4 stat cards :**
- Prospects total (avec delta semaine)
- Maquettes déployées
- CA potentiel (nombre HAUTE × prix moyen offre)
- À relancer (prospects sans contact depuis +7j)

**Pipeline bar :** Barre horizontale segmentée par statut (PROSPECT → CONTACTÉ → RDV → DEVIS → SIGNÉ → LIVRÉ) avec compteurs et couleurs.

**Activité récente :** Timeline des 10 dernières actions (ajout prospect, maquette déployée, devis envoyé, appel effectué...).

**Alertes relance :** Liste des prospects sans activité depuis +7 jours, triés par priorité, avec bouton "Marquer comme contacté".

### Prospects (`/prospects`)

**Vue liste** (par défaut) :
- Tableau avec colonnes : Nom, Activité, Ville, Statut web, Priorité, Pipeline, Tél, Dernière action, Actions
- Filtres : statut web, priorité, statut pipeline, ville
- Recherche textuelle
- Tri par colonne
- Actions en ligne : appeler (lien tel:), voir fiche, générer maquette

**Vue Kanban** (toggle) :
- Colonnes = statuts pipeline (PROSPECT → CONTACTÉ → RDV → DEVIS → SIGNÉ → LIVRÉ)
- Drag & drop pour changer de statut
- Card avec nom, activité, ville, priorité (badge couleur)

**Fiche prospect** (`/prospects/[id]`) :
- Header : nom, activité, ville, badge statut + priorité
- Infos contact : tél (cliquable), email, site actuel
- Argument commercial (le pitch généré par Claude)
- Section maquettes liées (preview miniature, liens Netlify)
- Section devis liés
- Timeline d'activité (appels, emails, notes...)
- Actions : changer statut pipeline, ajouter note, générer maquette, créer devis

### Clients (`/clients`)

Même structure que Prospects mais filtrée sur `statutPipeline = SIGNÉ | LIVRÉ`.

Informations supplémentaires :
- URL du site final (domaine client)
- Date de livraison
- Maintenance active (oui/non, date renouvellement)
- Domaine (registrar, date expiration)
- Prochaine action de suivi (J+7, M+1, M+6, M+12)

### Maquettes (`/maquettes`)

**Galerie** : Cards avec preview miniature (screenshot ou iframe), nom du prospect, date, statut (BROUILLON, DEPLOYÉ, ENVOYÉ, VALIDÉ, REFUSÉ).

**Détail maquette** (`/maquettes/[id]`) :
- Preview iframe plein écran de la démo Netlify
- Infos : prospect lié, date création, URLs (démo + proposition)
- Actions : redéployer sur Netlify, ouvrir dans nouvel onglet, envoyer au prospect (copier le message SMS/WhatsApp pré-formaté), marquer comme envoyé/validé/refusé
- Retour client : zone de texte pour noter les retours

### Prospection (`/prospection`) — Phase 2

**Formulaire de lancement :**
- Champ requête (ex: "plombier Steenvoorde")
- Mode : HTML / Astro
- Scope : Top prospect / Tous les HAUTE
- Bouton "Lancer la recherche"

**Résultats en temps réel :**
- Progression par étapes (Recherche Places... → Enrichissement... → Classification... → Génération maquette... → Déploiement...)
- Server-Sent Events (SSE) pour le streaming des logs
- Tableau des résultats quand c'est terminé
- Bouton "Ajouter au CRM" pour chaque prospect trouvé

**Historique des recherches :** Liste des recherches passées avec date, requête, nombre de résultats.

### Devis (`/devis`) — Phase 2

**Liste :** Tableau avec référence, prospect, offre, montant, statut, date.

**Créer/Éditer un devis** (`/devis/[id]`) :
- Sélection du prospect (autocomplete)
- Choix de l'offre (Essentielle 299€ / Professionnelle 499€ / Premium 799€) → pré-remplit les lignes
- Tableau de lignes éditable : description, quantité, prix unitaire, total
- Calcul automatique HT/TTC (pas de TVA, micro-entrepreneur)
- Conditions : acompte %, délai livraison, validité
- Preview du devis
- Générer PDF
- Envoyer par email
- Suivi : BROUILLON → ENVOYÉ → ACCEPTÉ/REFUSÉ/EXPIRÉ

**Format du devis PDF :**
- En-tête : Benjamin Bourger, Steenvoorde, SIRET, coordonnées
- Référence + date + validité
- Client : nom, adresse
- Tableau prestations
- Total HT (= TTC, micro-entrepreneur)
- Conditions de paiement
- Signature

### Factures (`/factures`) — Phase 3

**Création** depuis un devis accepté (pré-rempli).

**Suivi paiements :**
- Statut : EN_ATTENTE → ACOMPTE_REÇU → PAYÉE / RELANCÉE / IMPAYÉE
- Montant acompte reçu / reste à payer
- Date échéance
- Bouton relance (génère email/SMS pré-formaté)

### Paramètres (`/parametres`)

- **Profil** : Nom, adresse, téléphone, email, SIRET
- **Clés API** : Anthropic, Google Places, Firecrawl, Netlify (masquées, modifiables)
- **Tarifs par défaut** : Prix des 3 offres, maintenance mensuelle, modification ponctuelle
- **Templates** : Messages SMS/email de prospection, relance, envoi démo (éditables)

---

## Design système

### Thème dark mode

```
Fond principal :     #0d1117 (quasi-noir)
Fond sidebar :       #111827 (gris très foncé)
Fond cards :         #1e1e2e (gris foncé chaud)
Fond inputs :        #161b22
Bordures :           #30363d
Texte principal :    #e6edf3
Texte secondaire :   #7d8590
Accent primaire :    #f59e0b (ambre/doré)
Accent hover :       #d97706
Succès :             #34d399
Danger :             #f87171
Warning :            #fbbf24
Info :               #60a5fa
```

### Sidebar rétractable

- **État étendu** (240px) : icône + label pour chaque item
- **État réduit** (64px) : icône seule, tooltip au hover
- **Toggle** : bouton chevron en bas de la sidebar
- **Persistance** : état sauvegardé en localStorage
- **Mobile** : sidebar en overlay avec backdrop, hamburger menu

### Composants UI (shadcn/ui)

Utiliser les composants shadcn/ui suivants avec le thème dark personnalisé :
- `Button`, `Input`, `Select`, `Textarea`, `Badge`
- `Table` (data-table avec tri/filtres)
- `Card`
- `Dialog` (modales)
- `DropdownMenu` (actions contextuelles)
- `Tabs` (toggle vue liste/kanban)
- `Toast` (notifications)
- `Tooltip` (sidebar réduite)
- `Sheet` (panels latéraux pour édition rapide)

### Responsive

- **Desktop** (>1024px) : sidebar + contenu plein
- **Tablette** (768-1024px) : sidebar réduite par défaut
- **Mobile** (<768px) : sidebar en overlay, layout single column

---

## Intégration avec l'existant

### Migration crm.json → SQLite

Script de seed Prisma qui :
1. Lit `crm.json`
2. Crée les prospects avec tous les champs mappés
3. Crée les maquettes pour les prospects qui ont `url_demo`
4. Crée les entrées Recherche depuis `mises_a_jour`

### Intégration prospect.js

Le pipeline existant est encapsulé dans `src/lib/prospect-engine.ts` :
- Fork un child process (`node prospect.js "query" --flags`)
- Parse stdout pour extraire la progression
- Stream les événements vers le client via SSE
- À la fin, lit le `crm.json` généré et sync vers SQLite

À terme (phase 2+), les fonctions de `prospect.js` seront refactorisées en modules importables directement.

### Netlify

Les fonctions `deployerNetlify` et `collectFiles` sont extraites dans `src/lib/netlify.ts` pour être utilisées depuis l'UI (redéploiement, création de site).

---

## Ce qui est hors scope

- Auth / multi-user (préparé mais pas implémenté)
- Espace client
- Intégration Calendly / prise de RDV en ligne
- Google Analytics / métriques de fréquentation
- Application mobile
- Envoi réel d'emails (on génère le contenu, Benjamin copie-colle ou utilise son client mail)
- Paiement en ligne (Stripe, etc.)
