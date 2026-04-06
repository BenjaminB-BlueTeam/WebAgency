# Spec — Système de Relances (Session 13)

**Date :** 2026-04-06
**CDC référence :** section 3.6

---

## Objectif

Étendre le système de relances pour couvrir les 4 situations du CDC, persister `prochaineRelance` via event hooks, afficher des badges sur le kanban, et générer des emails Claude contextuels selon le type de relance.

---

## Périmètre

- 4 règles de relance : EMAIL (7j), MAQUETTE (5j), RDV (3j), DEVIS (10j)
- Persistence event-driven via `refreshProchainRelance` dans les routes existantes
- Badge visuel sur les cartes kanban
- Dashboard : déjà fonctionnel une fois `prochaineRelance` écrit en DB
- Page emails : étendue avec `relanceType` dans le payload
- Prompts Claude contextuels selon le type de relance

---

## Types

### `src/types/emails.ts` — modifications

```ts
export type RelanceType = "EMAIL" | "MAQUETTE" | "RDV" | "DEVIS"

export interface RelanceInfo {
  due: boolean
  urgente: boolean
  joursRetard: number
  relanceType: RelanceType | null  // ajout
}

export interface EmailProspectItem {
  id: string
  nom: string
  activite: string
  ville: string
  email: string | null
  statutPipeline: string
  dernierEmail: { id: string; sujet: string; dateEnvoi: string | null; statut: string } | null
  emailsHistory: { id: string; sujet: string; dateEnvoi: string | null; statut: string; createdAt: string }[]
  relance: RelanceInfo
  relanceType: RelanceType | null  // ajout
}
```

---

## Logique de calcul

### `src/lib/relance.ts` — nouvelle fonction

```ts
export type ProspectRelanceInput = {
  prochaineRelance: Date | null
  statutPipeline: string
  dateMaquetteEnvoi: Date | null
  dateRdv: Date | null
  emails: { statut: string; dateEnvoi: Date | null }[]
  activites: { type: string; description: string; createdAt: Date }[]
}

export type ProchainRelanceResult = {
  prochaineRelance: Date | null
  relanceType: RelanceType | null
}

export function computeProchainRelance(input: ProspectRelanceInput): ProchainRelanceResult
```

**Règles, évaluées dans cet ordre (priorité décroissante) :**

1. **DEVIS** — `statutPipeline === "NEGOCIATION"` + dernière activité `type === "PIPELINE"` + description contient "NEGOCIATION" → date de cette activité + 10j
2. **RDV** — `dateRdv` définie et `dateRdv < now` → `dateRdv` + 3j
3. **MAQUETTE** — `dateMaquetteEnvoi` définie → `dateMaquetteEnvoi` + 5j
4. **EMAIL** — dernier email avec `statut === "ENVOYE"` → `dateEnvoi` + 7j
5. Aucune règle → `{ prochaineRelance: null, relanceType: null }`

`computeProchainRelance` recalcule toujours depuis les données brutes — le champ `prochaineRelance` en DB est un cache écrit par `refreshProchainRelance`, jamais une source de vérité manuelle.

Si la date calculée est dans le passé, elle est quand même retournée (la relance est due).
Si la date calculée est dans le futur, elle est retournée (la relance n'est pas encore due).

**`computeRelance` existant reste inchangé** — utilisé uniquement dans `GET /api/emails` pour le champ `relance.due/urgente/joursRetard`.

---

## Persistence — `src/lib/relance-writer.ts`

```ts
export async function refreshProchainRelance(prospectId: string): Promise<void>
```

- Charge depuis Prisma : `prospect` (tous les champs), `emails` (statut + dateEnvoi), `activites` (type + description + createdAt)
- Appelle `computeProchainRelance`
- Écrit `prochaineRelance` via `prisma.prospect.update`
- Silencieux en cas d'erreur (log uniquement)

### Intégration dans les routes existantes

**`POST /api/prospects/[id]/email/send`** — après le `prisma.prospect.update` existant :
```ts
refreshProchainRelance(id).catch(console.error)
```

**`PATCH /api/prospects/[id]`** — après le `prisma.prospect.update` existant, si le body contient `statutPipeline` ou `dateRdv` :
```ts
if (data.statutPipeline !== undefined || data.dateRdv !== undefined) {
  refreshProchainRelance(id).catch(console.error)
}
```

---

## Kanban — badge de relance

### `src/components/pipeline/relance-dot.tsx` (nouveau)

Composant minimal : affiche une pastille rouge `#f87171` (6×6px) si `prochaineRelance` est dans le passé.

```ts
interface RelanceDotProps {
  prochaineRelance: string | null
}
```

### `src/components/pipeline/kanban-card.tsx` — modification

`CardContent` ajoute `<RelanceDot prochaineRelance={prospect.prochaineRelance} />` dans le header, à côté de `ScorePastille`.

---

## Page emails — extensions

### `GET /api/emails`

Le `prisma.prospect.findMany` charge en plus :
```ts
select: {
  // champs existants...
  dateMaquetteEnvoi: true,
  dateRdv: true,
  activites: {
    where: { type: "PIPELINE" },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { type: true, description: true, createdAt: true },
  },
}
```

Pour chaque prospect, on appelle `computeProchainRelance` et on ajoute `relanceType` dans le payload retourné.

### `src/components/emails/email-prospect-row.tsx` — modification

Reçoit `relanceType: RelanceType | null` et le transmet à `DemarcherSheet` via la modal state.

### `src/components/emails/emails-client.tsx` — modification

`modalState` étendu : `{ prospect, isRelance, relanceType: RelanceType | null }`. Transmet `relanceType` à `DemarcherSheet`.

### `src/components/prospects/demarcher-sheet.tsx` — modification

Reçoit `relanceType?: RelanceType`. Transmet au `POST .../email/generate` dans le body : `{ relance: isRelance, relanceType }`.

---

## Prompts Claude — `src/lib/email.ts`

`generateProspectionEmail` reçoit un 5e paramètre `relanceType?: RelanceType`.

Quand `isRelance: true`, le system prompt varie :

| relanceType | System prompt |
|-------------|---------------|
| `"EMAIL"` (défaut) | "Tu rédiges une relance chaleureuse suite à un email sans réponse, pas un premier contact" |
| `"MAQUETTE"` | "Tu rédiges une relance suite à l'envoi d'une maquette web sans retour du prospect depuis plus de 5 jours" |
| `"RDV"` | "Tu rédiges un email de suivi suite à un RDV passé avec le prospect, pour proposer une suite concrète (devis ou prochaine étape)" |
| `"DEVIS"` | "Tu rédiges une relance suite à l'envoi d'un devis sans réponse depuis plus de 10 jours, ton ton est professionnel et non intrusif" |

### `POST /api/prospects/[id]/email/generate` — modification

Lit `relanceType` depuis le body et le transmet à `generateProspectionEmail`.

---

## Tests

### `src/__tests__/lib/relance-multi.test.ts` (nouveau)

- Retourne `null` si aucune donnée
- Règle EMAIL : due après 7j depuis dernier ENVOYE
- Règle MAQUETTE : due après 5j depuis `dateMaquetteEnvoi`
- Règle RDV : due après 3j depuis `dateRdv` passé
- Règle DEVIS : due après 10j depuis activité PIPELINE→NEGOCIATION
- Priorité : DEVIS > RDV > MAQUETTE > EMAIL
- Override manuel `prochaineRelance` bypasse toutes les règles

### `src/__tests__/lib/relance-writer.test.ts` (nouveau)

- Appelle `prisma.prospect.update` avec la date calculée
- Silencieux si Prisma throw

### `src/__tests__/api/email-generate.test.ts` — additions

- `relanceType: "MAQUETTE"` → system prompt contient "maquette"
- `relanceType: "RDV"` → system prompt contient "RDV"
- `relanceType: "DEVIS"` → system prompt contient "devis"

---

## Gestion d'erreurs

| Cas | Comportement |
|-----|-------------|
| `refreshProchainRelance` échoue | Log + silencieux, pas de blocage de la réponse HTTP |
| Activité NEGOCIATION absente pour un prospect NEGOCIATION | Règle DEVIS ignorée, fall-through vers RDV/MAQUETTE/EMAIL |
| `dateRdv` dans le futur | Règle RDV ignorée |

---

## Hors périmètre

- Délais personnalisables (session Paramètres)
- Badge compteur dans la sidebar
- Envoi automatique de relances
- Relance SMS / appel suggéré (UI uniquement pour email)
