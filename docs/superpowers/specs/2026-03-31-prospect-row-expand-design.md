# Prospect Row Expand — Design Spec

> **For agentic workers:** Use `superpowers:subagent-driven-development` to implement this plan task-by-task.

**Goal:** Ajouter un expand inline sur chaque ligne de la liste prospects, donnant accès au lien démo, à la génération d'email, et à la régénération de maquette avec prompt éditable à la volée.

---

## Comportement général

Chaque ligne de `ProspectsList` gagne un chevron ▶/▼ cliquable (nouvelle colonne de gauche, 28px). Un seul prospect peut être expanded à la fois — cliquer un autre referme le précédent. Cliquer le chevron d'une ligne déjà ouverte la referme.

---

## Panel expand (ProspectRowExpand)

Lorsqu'une ligne est dépliée, une `<tr>` supplémentaire est insérée immédiatement après, avec `colspan` couvrant toutes les colonnes. Elle contient un mini-panel horizontal avec :

**1. Lien démo**
- Si `demoUrl` existe : lien cliquable `hecker-freres-xxx.netlify.app ↗` (ouvre dans un nouvel onglet)
- Si pas de maquette : bouton **🎨 Générer maquette** → appel `POST /api/maquettes/generate` avec `{ prospectId }` (prompt standard, sans modale)

**2. Bouton "✉️ Générer email"**
- Appel `POST /api/prospects/[id]/email`
- Pendant le chargement : bouton disabled + spinner
- Résultat affiché inline dans le panel : sujet (avec icône copier) + corps (avec icône copier)
- Si déjà généré : affiche le résultat avec bouton "Regénérer"

**3. Bouton "🎨 Regénérer maquette…"**
- Visible uniquement si une maquette existe déjà
- Au clic : ouvre `RegenMaquetteModal`
- Après génération réussie : met à jour le `demoUrl` dans le panel sans recharger la page

**4. Lien "Voir la fiche complète →"** (aligné à droite)
- Navigue vers `/prospects/[id]`

---

## Modale de régénération (RegenMaquetteModal)

Ouverte par le bouton "Regénérer maquette…".

**À l'ouverture :**
- Fetch `GET /api/prospects/[id]/prompt` → reçoit `{ prompt: string }`
- Affiche un spinner pendant le fetch
- Pré-remplit le `<textarea>` avec le prompt reçu

**Contenu :**
- Titre : "Regénérer — [Nom du prospect]"
- Note : `text-xs text-muted` — "Modifications non sauvegardées — le prompt standard reste inchangé"
- `<textarea>` éditable, hauteur min 220px, police monospace, scrollable
- Bouton **↺ Réinitialiser** → re-fetch `GET /api/prospects/[id]/prompt` et réinitialise le textarea
- Bouton **Annuler** → ferme sans générer
- Bouton **🎨 Générer** → appel `POST /api/maquettes/generate` avec `{ prospectId, customPrompt: textarea.value }`

**Pendant la génération :**
- Bouton Générer : disabled + spinner + texte "Génération en cours (~30s)…"
- Textarea et Réinitialiser : disabled
- Un message d'info : "Claude génère le HTML complet… jusqu'à 60 secondes."

**Après succès :**
- Ferme la modale
- Met à jour `demoUrl` dans le panel expand parent
- Toast "Maquette regénérée !"

**En cas d'erreur :**
- Toast erreur, modale reste ouverte

---

## Nouveaux endpoints API

### GET /api/prospects/[id]/prompt

Retourne le prompt utilisateur par défaut pour la génération de maquette.

```
Response 200: { prompt: string }
Response 400: { error: "id invalide" }
Response 404: { error: "Prospect introuvable" }
```

Implémentation : `requireAuth` → `db.prospect.findUnique` → `getDesignDirection(activite)` → `getUserPrompt(prospect, d)` → retourne `{ prompt }`.

### POST /api/maquettes/generate (modification)

Accepte un `customPrompt?: string` optionnel dans le body. Si fourni, il remplace le `getUserPrompt()` dans l'appel Claude. Le `getSystemPrompt()` reste inchangé.

```
Body: { prospectId: string, customPrompt?: string }
```

---

## Modifications de la page Prospects

### prospects/page.tsx

Le `select` des maquettes passe de `{ id, statut }` à `{ id, statut, demoUrl }` pour que le panel expand puisse afficher le lien démo sans fetch supplémentaire.

### ProspectRow interface

Ajouter `demoUrl: string | null` dans `maquettes: { id: string; statut: string; demoUrl: string | null }[]`.

---

## Nouveaux composants

### ProspectRowExpand

```
Props: {
  prospect: ProspectRow  // contient id, nom, maquettes[0]?.demoUrl
  onClose: () => void
  onMaquetteUpdated: (demoUrl: string) => void
}
```

Client component. Gère son propre état local : email (sujet/corps), loading email, loading maquette standard, modal open.

### RegenMaquetteModal

```
Props: {
  prospectId: string
  prospectNom: string
  open: boolean
  onClose: () => void
  onSuccess: (demoUrl: string) => void
}
```

Client component. Gère : fetch du prompt à l'ouverture, édition, soumission.

---

## Contraintes non négociables

- Le `customPrompt` n'est **jamais persisté** — pas de champ en DB, pas de state global
- Chaque ouverture de la modale re-fetch le prompt par défaut (pas de cache)
- Un seul expand ouvert à la fois dans `ProspectsList`
- Le system prompt (`getSystemPrompt()`) est toujours utilisé, même avec `customPrompt`
- Les boutons "Générer email" et "Générer maquette" du panel sont indépendants — l'un n'attend pas l'autre
