# Prospection Cloud Pipeline — Design Spec

**Date :** 2026-03-31
**Auteur :** Benjamin Bourger
**Statut :** Approuvé

---

## Contexte

Le CRM est déployé sur Vercel. La page `/prospection` actuelle spawne `prospect.js` comme child process Node.js — incompatible avec les fonctions serverless Vercel (pas de long-running process, filesystem éphémère).

L'objectif est de rendre le pipeline de prospection entièrement fonctionnel depuis le CRM déployé, en découplant chaque étape en appels API indépendants.

---

## Nouveau pipeline (vue utilisateur)

```
1. /prospection  → Recherche "plombier Steenvoorde"
                 → Résultats streamés (un par un)
                 → Bouton "Ajouter" par prospect intéressant

2. /prospects    → Liste des prospects sauvegardés
                 → Bouton "Générer maquette" sur chaque fiche
                 → Bouton "Générer l'email" avec expand inline

3. /prospects/[id] → Fiche complète
                   → Section maquette : lien public + bouton regénérer
                   → Section email : sujet + corps + bouton copier
```

---

## Architecture

### Supprimé

- `crm/src/app/api/prospection/start/route.ts` — spawn child process
- `crm/src/app/api/prospection/[jobId]/stream/route.ts` — SSE long-running
- `crm/src/lib/prospection-jobs.ts` — job manager in-memory
- Banner "Vercel incompatible" dans `/prospection`

### Nouveaux endpoints

| Endpoint | Méthode | Description |
|---|---|---|
| `/api/prospection/search` | GET | Search streamée Google Places + Claude |
| `/api/maquettes/generate` | POST | Génère HTML via Claude + déploie Netlify |
| `/api/prospects/[id]/email` | POST | Génère email de prospection via Claude |

### Modifiés

| Fichier | Modification |
|---|---|
| `crm/src/app/(dashboard)/prospection/page.tsx` | Redesign complet : search + résultats + sélection |
| `crm/src/app/(dashboard)/prospects/page.tsx` | Ajouter bouton "Générer maquette" + email expand |
| `crm/src/app/(dashboard)/prospects/[id]/page.tsx` | Section maquette + section email |

---

## Section 1 — Recherche de prospects

### `GET /api/prospection/search?q=plombier+Steenvoorde`

**Auth :** `requireAuth`
**Validation :** `q` required, max 200 chars
**Response :** SSE stream (`text/event-stream`)

**Flow :**
1. Google Places Text Search (`placesTextSearch(q)`) → liste d'entreprises
2. Pour chaque résultat (en parallèle, max 5 concurrents) :
   - `placesDetails(placeId)` → tél, site, horaires
   - Claude API → analyse présence web → `{ statut, priorite, raison, argumentCommercial }`
3. Chaque résultat émis dès qu'il est prêt via SSE :
   ```
   data: {"nom":"Plomberie Dupont","ville":"Steenvoorde","statut":"SANS_SITE",...}\n\n
   ```
4. Événement final : `data: [DONE]\n\n`

**Pas d'écriture fichier, pas de crm.json.**

**Fonctions réutilisées depuis `prospect.js` :**
Les fonctions `placesTextSearch`, `placesDetails` sont portées dans `crm/src/lib/places.ts`.
L'analyse Claude est portée dans `crm/src/lib/analyse-prospect.ts`.

### Page `/prospection` redesignée

- Input + bouton "Lancer la recherche"
- État : idle / searching / results
- Liste des résultats avec :
  - Badge statut coloré (SANS_SITE rouge, SITE_OBSOLETE orange, SITE_BASIQUE jaune)
  - Badge priorité (HAUTE / MOYENNE / BASSE)
  - Argument commercial en italique
  - Bouton "➕ Ajouter au CRM" → `POST /api/prospects` (existant)
  - Prospects déjà dans le CRM → badge "Déjà ajouté" (grayed out, bouton désactivé)
    - Détection : l'endpoint search vérifie en DB via `db.prospect.findFirst({ where: { nom, ville } })` pour chaque résultat avant de l'émettre. Champ `alreadyInCrm: boolean` ajouté dans le payload SSE.
- Résultats arrivent un par un au fur et à mesure du stream

---

## Section 2 — Génération de maquette

### `POST /api/maquettes/generate`

**Auth :** `requireAuth`
**Body :** `{ prospectId: string }`
**Config route :** `export const maxDuration = 300`
**Response :** `{ id, demoUrl, prospectId }`

**Flow :**
1. Fetch prospect depuis DB (nom, ville, activité, statut, siteUrl, argumentCommercial, adresse, noteGoogle)
2. Appel Claude API avec le prompt de génération HTML (identique à `prospect.js` `getUserPrompt()`)
3. Assemblage du HTML complet
4. Déploiement Netlify Sites API :
   ```
   POST https://api.netlify.com/api/v1/sites
   Authorization: Bearer {NETLIFY_TOKEN}
   Body: { name: "{slug}-{random}" }
   → retourne site_id

   POST https://api.netlify.com/api/v1/sites/{site_id}/deploys
   Content-Type: application/zip
   Body: ZIP contenant index.html
   → retourne { deploy_url }
   ```
5. `db.maquette.upsert` → stocke `demoUrl`, `html`, `prospectId`
6. Si maquette existante pour ce prospect → update (pas de doublon)

**Variables d'env requises :**
- `NETLIFY_TOKEN` (déjà présent)
- `NETLIFY_SITE_ID` non requis — on crée un nouveau site par maquette

**Gestion d'erreur :**
- Timeout Vercel Hobby (60s) : afficher message "Génération en cours, rafraîchissez dans quelques secondes" + polling
- Erreur Netlify API → retourner maquette sans demoUrl (HTML stocké en DB, déploiement retryable)

### UX sur la fiche prospect `/prospects/[id]`

- Si aucune maquette : bouton "🎨 Générer la maquette" (primary)
- Si maquette existante : lien "Voir la démo →" + bouton "Regénérer"
- Pendant génération : bouton désactivé + spinner + "Génération en cours (~30s)"
- Après succès : lien demoUrl affiché immédiatement

### UX sur la liste `/prospects`

- Colonne ou bouton inline "🎨 Maquette" → déclenche la génération sans naviguer vers la fiche
- Indicateur visuel si maquette déjà générée (icône checkmark)

---

## Section 3 — Génération d'email

### `POST /api/prospects/[id]/email`

**Auth :** `requireAuth`
**Body :** `{}` (données lues depuis DB via [id])
**Response :** `{ sujet: string, corps: string }`
**Pas de sauvegarde en DB** — généré à la demande, copié par l'utilisateur

**Flow :**
1. Fetch prospect depuis DB
2. Fetch maquette associée (si existe → récupère demoUrl)
3. Appel Claude API avec prompt email :
   - **Ton :** direct, professionnel, jamais "je me permets de vous contacter"
   - **Accroche :** basée sur statut (SANS_SITE vs SITE_OBSOLETE vs SITE_BASIQUE)
   - **Argument :** `argumentCommercial` du prospect injecté
   - **Lien démo :** `demoUrl` si disponible, sinon "maquette disponible sur demande"
   - **CTA :** appel ou réponse email (pas de Calendly)
   - **Signature :** Benjamin Bourger — Steenvoorde — [téléphone depuis paramètres]
4. Retourne `{ sujet, corps }`

### UX

**Sur `/prospects/[id]` (fiche) :**
- Bouton "✉️ Générer l'email"
- Section expandable avec : Sujet (bouton copier) + Corps (bouton copier)
- Bouton "Regénérer" si insatisfait
- Note : générer la maquette en premier pour avoir le lien démo dans l'email

**Sur `/prospects` (liste) :**
- Bouton "✉️" par ligne → expand inline sous la ligne
- Même affichage sujet/corps/copier

---

## Dépendances et prérequis

### Variables d'environnement (à ajouter sur Vercel)

| Variable | Valeur | Déjà présente ? |
|---|---|---|
| `NETLIFY_TOKEN` | Token Netlify | ✅ Oui (local) |
| `ANTHROPIC_API_KEY` | Clé API Claude | ✅ Oui (local) |
| `GOOGLE_PLACES_KEY` | Clé Google Places | ✅ Oui (local) |
| `FIRECRAWL_KEY` | Clé Firecrawl | ✅ Oui (local) |

→ **À ajouter sur Vercel dashboard** pour que le pipeline fonctionne en prod.

### Modèle Prisma

Le modèle `Maquette` existe déjà. Vérifier qu'il contient un champ `html` (TEXT) pour stocker le HTML généré. Si absent → migration Prisma.

```prisma
model Maquette {
  id          String   @id @default(cuid())
  prospectId  String
  demoUrl     String?
  html        String?  // ← à vérifier/ajouter
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  prospect    Prospect @relation(fields: [prospectId], references: [id])
}
```

### Nouveaux fichiers utilitaires

| Fichier | Contenu |
|---|---|
| `crm/src/lib/places.ts` | `placesTextSearch()`, `placesDetails()` portés depuis prospect.js |
| `crm/src/lib/analyse-prospect.ts` | Appel Claude pour analyser présence web d'un prospect |
| `crm/src/lib/netlify-deploy.ts` | `deployToNetlify(html, slug)` → demoUrl |
| `crm/src/lib/prompts/maquette.ts` | Prompt Claude génération HTML (porté depuis prospect.js) |
| `crm/src/lib/prompts/email.ts` | Prompt Claude génération email prospection |

### Dépendance npm à ajouter

```bash
cd crm && npm install jszip
```

`jszip` est utilisé dans `netlify-deploy.ts` pour créer le ZIP en mémoire avant l'envoi à l'API Netlify :
```ts
const zip = new JSZip();
zip.file("index.html", html);
const buffer = await zip.generateAsync({ type: "nodebuffer" });
// POST buffer à /api/v1/sites/{site_id}/deploys avec Content-Type: application/zip
```

---

## Ce qui reste localement

`prospect.js` à la racine reste intact pour usage CLI local (batch, `--tous`, `--index`). La nouvelle architecture CRM ne remplace pas le CLI — elle le complète.

---

## Non inclus dans ce scope

- Cache Google Places (géré côté CLI dans `cache/places/`) — pas porté dans le CRM
- Génération maquette Astro — uniquement HTML dans le CRM
- Déploiement sur domaine custom — Netlify subdomain suffit pour les démos
- Envoi d'email automatique — copier/coller manuel par Benjamin
