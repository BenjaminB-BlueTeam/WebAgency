# Spec — Agency Pipeline Phase 5 : Pipeline Automation

**Date :** 2026-04-02
**Statut :** Approuvé (décisions autonomes)
**Dépend de :** Phases 1-4

---

## Objectif

Mettre à jour automatiquement le statut pipeline des prospects en fonction des actions réalisées, et afficher un résumé des échanges toujours à jour dans l'expand.

---

## 1. Transitions de statut automatiques

Le `statutPipeline` du prospect (`PROSPECT → CONTACTE → RDV → DEVIS → SIGNE → LIVRE`) évolue automatiquement lors des actions suivantes :

| Action déclencheur | Transition automatique | Condition |
|---|---|---|
| Email envoyé (`EMAIL_ENVOYE`) | `PROSPECT → CONTACTE` | Seulement si statut actuel = `PROSPECT` |
| Activité `RDV` créée | `CONTACTE → RDV` | Seulement si statut ≤ `CONTACTE` |
| Devis créé (`/api/devis`) | `RDV → DEVIS` | Seulement si statut ≤ `RDV` |
| Devis accepté (`statut = ACCEPTE`) | `DEVIS → SIGNE` | Seulement si statut = `DEVIS` |
| Maquette validée (`VALIDEE`) | `SIGNE → LIVRE` | Seulement si statut = `SIGNE` |

**Règle :** les transitions ne sont **jamais rétrogrades** — on ne peut pas descendre un statut automatiquement. Benjamin peut toujours modifier manuellement via le PATCH existant.

**Implémentation :** chaque route API concernée appelle un helper `avancerPipeline(prospectId, action)` qui applique la règle et PATCH si nécessaire.

```typescript
// crm/src/lib/pipeline.ts
export async function avancerPipeline(
  prospectId: string,
  action: 'EMAIL_ENVOYE' | 'RDV' | 'DEVIS_CREE' | 'DEVIS_ACCEPTE' | 'MAQUETTE_VALIDEE'
): Promise<void>
```

---

## 2. Résumé des échanges auto-généré

### Composant `ResumeEchangesSection` (existant, étendu)

Affiché **en haut de l'expand**, toujours visible avant les colonnes.

**Contenu :** Claude génère un résumé en 3-5 phrases à partir de :
- Toutes les `Activite` du prospect (chronologiques)
- Statut des maquettes + `feedbackBenjamin`
- `statutPipeline` actuel
- Devis éventuels

**Exemple de résumé :**
> "Premier contact par email le 15 mars. Réponse positive reçue le 17 : client intéressé mais souhaite voir plus de couleurs vives. Maquette v2 générée et hébergée le 19, intégrant ses retours. En attente de validation."

### Route `GET /api/prospects/[id]/resume`

- Récupère les 20 dernières activités + statut maquettes + statut pipeline
- Demande à Claude un résumé factuel, chronologique, 3-5 phrases, sans fioritures
- Résultat mis en cache dans `prospect.notes.resume` avec timestamp
- Cache invalidé automatiquement quand une nouvelle `Activite` est créée

**Refresh :** le composant affiche le résumé en cache avec date `"Mis à jour il y a X min"` et un bouton `🔄` pour forcer le rafraîchissement.

---

## 3. Alertes relance (existant amélioré)

Le composant `AlertsRelance` (existant, dashboard) est alimenté par une route existante. On l'étend pour :
- Inclure les prospects `CONTACTE` sans réponse depuis > 5 jours (pas seulement > 7 jours)
- Ajouter un lien direct `→ Ouvrir email` qui pré-génère un email de relance contextuel

Route existante `GET /api/prospects/relances` — ajout d'un champ `suggestRelanceEmail: true` pour les prospects sans activité depuis > 5 jours.

---

## 4. Dashboard — indicateurs mis à jour

Le dashboard affiche déjà les stats pipeline. Avec les transitions auto, les chiffres se mettent à jour en temps réel sans action manuelle.

Ajout d'une stat : **"Maquettes en attente de validation"** (count `Maquette.statut = ATTENTE_VALIDATION`), avec lien direct vers `/maquettes?filter=attente`.

---

## Fichiers touchés

| Fichier | Modification |
|---|---|
| `crm/src/lib/pipeline.ts` | Nouveau helper `avancerPipeline()` |
| `crm/src/app/api/prospects/[id]/email/send/route.ts` | Appel `avancerPipeline('EMAIL_ENVOYE')` |
| `crm/src/app/api/prospects/[id]/activites/route.ts` | Appel `avancerPipeline('RDV')` si type = RDV |
| `crm/src/app/api/devis/route.ts` | Appel `avancerPipeline('DEVIS_CREE')` |
| `crm/src/app/api/devis/[id]/route.ts` | Appel `avancerPipeline('DEVIS_ACCEPTE')` sur PATCH statut=ACCEPTE |
| `crm/src/app/api/maquettes/[id]/route.ts` | Appel `avancerPipeline('MAQUETTE_VALIDEE')` sur PATCH statut=VALIDEE |
| `crm/src/app/api/prospects/[id]/resume/route.ts` | Nouvelle route résumé Claude |
| `crm/src/components/prospects/resume-echanges-section.tsx` | Appel API + cache + bouton refresh |
| `crm/src/app/api/prospects/relances/route.ts` | Ajout suggestRelanceEmail + seuil 5j |
| `crm/src/components/dashboard/stat-card.tsx` | Stat maquettes en attente |

---

## Récapitulatif des 5 phases — ordre d'implémentation

| Phase | Estimation complexité | Dépendances |
|---|---|---|
| 1 — Prospection redesign | Faible | — |
| 2 — Expand + Analyse SSE | Moyenne | Phase 1 (données prospects) |
| 3 — Maquette pipeline + GitHub | Élevée | Phase 2 (analyse dans prompt) |
| 4 — Email workflow | Moyenne | Phase 3 (demoUrl disponible) |
| 5 — Pipeline automation | Faible | Phases 3+4 (actions déclencheurs) |
