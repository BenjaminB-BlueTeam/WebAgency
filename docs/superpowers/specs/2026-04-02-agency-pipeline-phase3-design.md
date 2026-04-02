# Spec — Agency Pipeline Phase 3 : Maquette Pipeline

**Date :** 2026-04-02
**Statut :** Approuvé (décisions autonomes)
**Dépend de :** Phase 2 (analyse concurrentielle)

---

## Objectif

Automatiser la génération + hébergement de maquettes avec création d'un repo GitHub privé, limiter à 3 maquettes par prospect, alerter pour validation, et adapter le prompt en fonction des retours.

---

## 1. Génération maquette — point d'entrée

Le bouton `🎨 Générer maquette` (dans l'expand, colonne gauche) est **actif uniquement si `prospect.notes.analyse` est présent** (gating Phase 2).

Au clic : ouvre `RegenMaquetteModal` (composant existant). Le prompt est pré-rempli avec le prompt par défaut **enrichi du rapport d'analyse** (concurrents, faiblesses, opportunités). Le champ est éditable.

**Limite 3 maquettes :** avant d'ouvrir la modal, on compte `SELECT count(*) FROM Maquette WHERE prospectId = X`. Si ≥ 3 : bouton remplacé par `"3 maquettes atteintes"` non-cliquable, avec tooltip `"Maximum 3 maquettes par prospect. Supprimez-en une pour en générer une nouvelle."`.

---

## 2. Pipeline de génération

Après validation dans la modal → `POST /api/maquettes/generate` (route existante, étendue) :

### Étape 1 — Génération HTML (existant)
Claude génère le HTML avec le prompt enrichi analyse + `customPrompt` utilisateur.

### Étape 2 — Déploiement Netlify (existant)
ZIP upload → Netlify REST API → polling → `demoUrl`. Inchangé.

### Étape 3 — Création repo GitHub privé (nouveau)
```
POST /api/github/repos
```
- Nom du repo : `maquette-{slug-prospect}-v{N}` (N = numéro de version, 1-3)
- Privé, initialisé avec README
- Push du `index.html` généré sur branche `main`
- URL du repo sauvegardée dans `Maquette.githubUrl`

**Auth GitHub :** `GITHUB_TOKEN` dans `.env.local` (Personal Access Token avec scope `repo`). Jamais exposé côté client.

### Étape 4 — Enregistrement DB
`Maquette` créée/mise à jour avec :
```typescript
{
  prospectId,
  html,          // contenu HTML
  demoUrl,       // URL Netlify
  githubUrl,     // URL repo GitHub
  statut: 'ATTENTE_VALIDATION',
  version: N,    // 1, 2 ou 3
  promptUsed,    // prompt exact utilisé (pour traçabilité)
}
```

### Étape 5 — Alerte validation
Dès que `demoUrl` est disponible :
- Toast dans l'app : `"✅ Maquette v{N} — Dupont Plomberie hébergée · Valider →"`
- Badge rouge sur l'icône Maquettes dans la nav (count des maquettes `ATTENTE_VALIDATION`)
- La ligne prospect dans le tableau affiche le lien de la dernière maquette

---

## 3. Validation dans le CRM

Page `/maquettes` (existante) — nouvelle colonne `Statut validation` :

| Statut | Badge | Actions disponibles |
|---|---|---|
| `ATTENTE_VALIDATION` | amber "En attente" | Valider / Demander corrections |
| `VALIDEE` | green "Validée" | Voir démo / Voir GitHub |
| `A_CORRIGER` | red "À corriger" | Voir instructions / Regénérer |

**Bouton "Valider" :** PATCH `Maquette.statut = 'VALIDEE'` → pipeline statut prospect → `DEVIS` (Phase 5).

**Bouton "Demander corrections" :** ouvre un champ texte libre. Le feedback est sauvegardé dans `Maquette.feedbackBenjamin`. Statut → `A_CORRIGER`.

---

## 4. Régénération avec retours

Quand Benjamin régénère (max 3 au total) :
- La modal `RegenMaquetteModal` charge le prompt précédent + **injecte le `feedbackBenjamin`** de la dernière maquette `A_CORRIGER`
- Prefix automatique dans le prompt : `"La version précédente a été refusée car : {feedbackBenjamin}. Corrige en priorité : ..."`
- Benjamin peut modifier librement avant de valider

---

## 5. Affichage des liens sur la ligne prospect

La colonne `Démo` du tableau prospects affiche jusqu'à 3 badges :
```
[v1 🔗] [v2 🔗] [v3 🔗]
```
Chaque badge : lien Netlify + indicateur de statut par couleur.

---

## 6. Prompt maquette enrichi (route existante étendue)

`GET /api/prospects/[id]/prompt` — retourne maintenant :
```
[Prompt système design existant]

--- ANALYSE CONCURRENTIELLE ---
{prospect.notes.analyse.benchmark}
{prospect.notes.analyse.auditSite}

--- INSTRUCTIONS PRIORITAIRES ---
Corrige explicitement ces faiblesses : {liste des lacunes identifiées}
Exploite ces opportunités de différenciation : {liste des opportunités}

[Feedback précédent si régénération]
```

---

## Schéma DB — modifications Maquette

```prisma
model Maquette {
  // existant
  id           String   @id @default(cuid())
  prospectId   String
  html         String
  demoUrl      String?
  statut       String   @default("BROUILLON")

  // nouveau
  githubUrl       String?
  version         Int      @default(1)
  promptUsed      String?
  feedbackBenjamin String?
  validatedAt     DateTime?
}
```

---

## Fichiers touchés

| Fichier | Modification |
|---|---|
| `crm/src/app/api/maquettes/generate/route.ts` | Ajout étape GitHub + statut ATTENTE_VALIDATION + version |
| `crm/src/app/api/github/repos/route.ts` | Nouvelle route création repo + push |
| `crm/src/lib/github.ts` | Nouveau helper GitHub REST API |
| `crm/src/app/(dashboard)/maquettes/page.tsx` | Colonne statut validation + boutons Valider/Corrections |
| `crm/src/components/prospects/prospect-row-expand.tsx` | Gating 3 maquettes + multi-liens v1/v2/v3 |
| `crm/src/components/layout/sidebar.tsx` | Badge count ATTENTE_VALIDATION |
| `crm/prisma/schema.prisma` | Nouveaux champs Maquette |
| `crm/src/app/api/prospects/[id]/prompt/route.ts` | Injection analyse + feedback |
