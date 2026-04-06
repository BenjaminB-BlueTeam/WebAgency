# Design — Génération de maquette (Session 7)

**Date :** 2026-04-05
**Scope :** Bouton "Générer une maquette" fonctionnel sur la fiche prospect.
**Hors scope :** envoi d'email avec la maquette, capture d'écran (Session 8).

---

## 1. Architecture

```
lib/
├── stitch.ts                  → wrapper @google/stitch-sdk
├── stitch/buildPrompt.ts      → Claude construit le prompt Stitch
├── netlify-deploy.ts          → déploiement multi-pages via Netlify File Digest API

app/api/
├── maquettes/generate/route.ts  → POST : orchestration complète
├── maquettes/[id]/route.ts      → GET : détail maquette
└── maquettes/[id]/preview/route.ts → GET : redirect vers demoUrl

components/prospects/
└── prospect-maquette-tab.tsx    → remplace PlaceholderTab dans prospect-detail.tsx
```

---

## 2. lib/stitch.ts

Wrapper autour du SDK `@google/stitch-sdk`. Auth automatique via `STITCH_API_KEY`.

**Fonction principale :**

```ts
generateMaquette(prospect, analyse?) → { projectId, screens: [{name, html}] }
```

**Flow interne :**
1. `stitch.createProject(prospect.nom)` → `Project`
2. `buildStitchPrompt(prospect, analyse)` → prompt de base (via Claude)
3. Pour chaque écran dans `["accueil", "services", "contact", "a-propos"]` :
   - `project.generate(promptParEcran, "MOBILE")` → `Screen`
   - `fetch(await screen.getHtml())` → HTML brut (getHtml() retourne une URL)
4. Retourne `{ projectId, screens: [{name, html}] }`

**Prompts par écran :**
- `accueil` : page d'accueil avec hero, accroche principale, CTA contact
- `services` : liste des prestations de l'activité du prospect
- `contact` : formulaire de contact, téléphone, adresse, carte
- `a-propos` : présentation de l'entreprise, valeurs, zone géographique

---

## 3. lib/stitch/buildPrompt.ts

```ts
buildStitchPrompt(prospect, analyse?) → string
```

Appelle Claude Sonnet avec :
- **System** : "Tu es un expert en design de sites vitrines pour artisans et petites entreprises locales en Flandre Intérieure. Tu génères des prompts de design UI pour Google Stitch. Règles : style professionnel mais chaleureux (jamais startup tech), mobile-first, textes en français, palette cohérente avec le métier, intégrer nom/téléphone/ville."
- **User** : données du prospect (nom, activité, ville, téléphone, siteUrl) + recommandations de l'analyse si disponible.

Retourne un prompt en français décrivant l'identité visuelle souhaitée (palette, ton, style), qui sera enrichi spécifiquement pour chaque écran dans `stitch.ts`.

---

## 4. lib/netlify-deploy.ts

```ts
deployToNetlify(screens: {name, html}[], prospectName, ville) → { url, siteId }
```

**Flow (Netlify File Digest API, sans dépendance zip) :**
1. `POST /api/v1/sites` avec `{ name: slugify(prospectName-ville) }` → crée ou récupère le site
2. Injecter une `<nav>` dans chaque HTML avant `</body>` avec liens vers les 3 autres pages
3. `POST /api/v1/sites/{siteId}/deploys` avec les SHA1 des 4 fichiers
4. `PUT /api/v1/deploys/{deployId}/files/{path}` pour chaque fichier
5. Retourne `{ url: "https://{slug}.netlify.app", siteId }`

**Pages déployées :**
| Fichier | Écran |
|---------|-------|
| `index.html` | accueil |
| `services.html` | services |
| `contact.html` | contact |
| `a-propos.html` | à propos |

**Nav injectée :** barre simple en haut de chaque page avec 4 liens internes.

---

## 5. API Routes

### POST /api/maquettes/generate

**Body :** `{ prospectId: string }`

**Flow :**
1. `requireAuth()`
2. Valider `prospectId` (string non vide, max 50 chars)
3. Vérifier que le prospect existe en DB
4. Compter les maquettes existantes → si ≥ 3, retourner 409
5. Récupérer prospect + dernière analyse (si existante)
6. `generateMaquette(prospect, analyse)` → `{ projectId, screens }`
7. `deployToNetlify(screens, prospect.nom, prospect.ville)` → `{ url, siteId }`
8. Sauvegarder `Maquette` en DB :
   - `html` = `JSON.stringify([{name:"accueil",html:"..."},{name:"services",html:"..."},...])`  (tableau des 4 écrans)
   - `demoUrl` = URL Netlify
   - `netlifySiteId` = siteId Netlify
   - `version` = maquettes existantes + 1
   - `promptUsed` = prompt utilisé
   - `statut` = `"BROUILLON"`
9. Créer `Activite` : `{ type: "MAQUETTE", description: "Maquette v{n} générée" }`
10. Retourner `{ data: { id, demoUrl, version } }`

**Timeout Vercel :** `export const maxDuration = 300`

### GET /api/maquettes/[id]

Retourne `{ data: maquette }` (id, demoUrl, version, statut, createdAt, promptUsed).

### GET /api/maquettes/[id]/preview

Redirect 302 vers `maquette.demoUrl`. Permet d'afficher la preview via une URL interne.

---

## 6. UI — ProspectMaquetteTab

Remplace `PlaceholderTab` dans `prospect-detail.tsx` pour l'onglet `"maquette"`.

**Props :** `{ prospect: ProspectWithRelations }`

### État 1 — Vide (aucune maquette)
- Icône + texte "Aucune maquette générée"
- Bouton "Générer une maquette" (blanc, centré)

### État 2 — Génération en cours
- Spinner animé
- Texte "Génération en cours… (jusqu'à 2 min)"
- Pas de bouton d'annulation
- Timeout client : après 5 min → toast d'erreur, retour à l'état vide

### État 3 — Maquette disponible
- **Sélecteur de version** (si > 1 maquette) : boutons v1 / v2 / v3
- **Badge statut** : BROUILLON (gris) / ENVOYEE (bleu) / VALIDEE (vert) / REJETEE (rouge)
- **iframe** sandboxée (`sandbox="allow-scripts allow-same-origin"`) pointant sur `demoUrl`, hauteur fixe 600px
- **Boutons d'action** :
  - "Plein écran" → `window.open(demoUrl)`
  - "Régénérer" → visible si `maquettes.length < 3`, déclenche une nouvelle génération
  - "Copier l'URL" → copie `demoUrl` dans le presse-papiers + toast de confirmation

---

## 7. Gestion des erreurs

| Erreur | Comportement |
|--------|-------------|
| Stitch API timeout / erreur | 500 avec message explicite |
| Netlify deploy échoue | 500, la maquette n'est pas sauvegardée |
| Max 3 maquettes atteint | 409 `{ error: "Nombre maximum de maquettes atteint" }` |
| Prospect introuvable | 404 |
| Timeout client (5 min) | Toast erreur côté UI, état remis à vide |

---

## 8. Variables d'environnement requises

```env
STITCH_API_KEY=        # clé API depuis stitch.withgoogle.com/settings
NETLIFY_TOKEN=         # personal access token Netlify
```
