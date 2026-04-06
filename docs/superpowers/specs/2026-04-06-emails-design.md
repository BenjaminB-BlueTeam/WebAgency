# Spec — Page Prospection Email (Session 12)

**Date :** 2026-04-06
**CDC référence :** sections 3.5 et 3.6

---

## Objectif

Remplacer le placeholder `/emails` par une page de gestion complète de la prospection email : liste des prospects actifs, indicateurs de relance, génération/envoi d'emails (premier contact et relance), et historique inline.

---

## Périmètre

- Prospects affichés : tous sauf `statutPipeline IN ['CLIENT', 'PERDU']`
- Relance : indicateur visuel + bouton "Relancer" qui génère un email de relance via Claude
- Historique : expand inline par prospect (données chargées dans le payload initial)
- Réutilisation : `DemarcherSheet` existant, avec ajout du paramètre `relance` dans `generate`

---

## API

### `GET /api/emails`

Retourne les prospects actifs avec métadonnées email.

**Filtre :** `statutPipeline NOT IN ['CLIENT', 'PERDU']`

**Payload par prospect :**
```ts
{
  id: string
  nom: string
  activite: string
  ville: string
  email: string | null
  statutPipeline: string
  dernierEmail: {
    id: string
    sujet: string
    dateEnvoi: string | null
    statut: string
  } | null
  emailsHistory: {
    id: string
    sujet: string
    dateEnvoi: string | null
    statut: string
    createdAt: string
  }[]
  relance: {
    due: boolean
    urgente: boolean      // due ET joursRetard > délai de base
    joursRetard: number   // 0 si pas due
  }
}
```

**Calcul relance :**
- Si `prochaineRelance` est défini sur le prospect → utiliser cette date
- Sinon, si un email ENVOYE existe → délai 7 jours depuis `dateEnvoi`
- Si délai dépassé → `due: true`, `joursRetard = jours depuis dateEnvoi - délai`
- Si `joursRetard > délai de base` → `urgente: true`

**Tri :** relances urgentes → dues → le reste (par `updatedAt` desc)

**Auth :** `requireAuth()` obligatoire

---

### `POST /api/prospects/[id]/email/generate` — modification

Ajout du paramètre optionnel `relance: boolean` dans le body.

- Si `relance: true` → system prompt adapté : "tu rédiges une relance chaleureuse suite à un email sans réponse, pas un premier contact"
- Si `relance: false` ou absent → comportement actuel inchangé

---

## Composants

### `src/app/(dashboard)/emails/page.tsx`
Server Component. Appelle `GET /api/emails`, passe le résultat à `EmailsClient`. Affiche `ErrorState` si l'appel échoue.

### `src/components/emails/emails-client.tsx`
Client Component racine. Gère :
- `expandedId: string | null` — quel prospect est expanded
- `modalState: { prospectId, isRelance } | null` — quelle modal est ouverte

### `src/components/emails/email-prospect-row.tsx`
Ligne de la liste. Colonnes :
| Nom + Activité | Ville | Statut | Dernier email | Relance | Actions |

Actions :
- "Démarcher" → ouvre modal (`isRelance: false`). Désactivé + tooltip si `email === null`.
- "Relancer" → visible si `relance.due`. Ouvre modal (`isRelance: true`).
- Clic sur la ligne → toggle expand

### `src/components/emails/relance-badge.tsx`
Badge indicateur de relance :
- Pas due → discret vert (#4ade80 très atténué) ou absent
- Due → orange (#fbbf24), texte "Relance J+N"
- Urgente → rouge (#f87171), texte "Relance J+N !"

### `src/components/emails/email-history-expand.tsx`
Expand inline animé avec `expandCollapse` de `lib/animations.ts`. Affiche la liste des emails (sujet, date, statut BROUILLON/ENVOYE). Données issues du payload initial (pas de fetch supplémentaire).

### `DemarcherSheet` (existant — modification mineure)
Le composant accepte actuellement `prospect: ProspectWithRelations`. Pour éviter de surcharger le payload `GET /api/emails`, on change le type du prop en une interface minimale :
```ts
interface DemarcherSheetProspect {
  id: string
  nom: string
  email: string | null
}
```
Ajout du prop `isRelance: boolean` (défaut `false`) pour transmettre `{ relance: true }` dans le body de `POST .../email/generate`.

---

## Gestion d'erreurs

| Cas | Comportement |
|-----|-------------|
| Prospect sans email | Bouton "Démarcher" désactivé, tooltip "Ajoutez un email dans la fiche" |
| `GET /api/emails` échoue | `ErrorState` centré sur la page |
| Liste vide | `EmptyState` : "Tous vos prospects actifs ont été traités" |
| Envoi email échoue | Toast erreur via `DemarcherSheet` existant |

---

## Tests

### `GET /api/emails`
- Filtre : exclut CLIENT et PERDU, inclut les autres statuts
- Calcul relance : `due: false` si aucun email envoyé
- Calcul relance : `due: true` si `dateEnvoi` > 7 jours
- Calcul relance : `urgente: true` si `joursRetard > 7`
- Calcul relance : utilise `prochaineRelance` si défini
- Tri : urgentes en tête

### `POST .../email/generate`
- `relance: true` → system prompt contient "relance"
- `relance: false` → comportement inchangé

### Composants (Vitest + @testing-library)
- `EmailProspectRow` : rendu sans email (bouton disabled)
- `EmailProspectRow` : rendu avec relance due (badge orange visible)
- `RelanceBadge` : 3 états (pas due, due, urgente)

---

## Hors périmètre

- Envoi automatique de relances (manuel uniquement, CDC 3.6)
- Personnalisation des délais de relance (section Paramètres, session future)
- Badge compteur sur le dashboard (session future)
