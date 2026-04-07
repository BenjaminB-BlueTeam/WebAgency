# Session 9 — Tests + nettoyage Phase 1

## Objectif

Renforcer la base technique du projet : combler les trous de tests, nettoyer le code mort, vérifier le responsive code-only, build sans warning.

## Scope

5 lots indépendants (lots 3 sécurité et 6 CI/CD déjà couverts par Session 18) :

### Lot 1 — Tests unitaires libs

Combler les trous existants. **Ne pas réécrire** ce qui existe déjà.

Cibles :
- `lib/scoring.ts` : moyenne pondérée, gestion des null, bornes 0–10
- `lib/auth.ts` : signToken, verifyToken (valide / expiré / malformé)
- `lib/maquette/build-prompt.ts` (remplace `stitch/buildPrompt` supprimé) : prompt contient nom + ville + activité du prospect
- Parsing JSON Claude (`lib/anthropic.ts`) : cas normal, fences markdown, JSON avec texte avant/après, JSON invalide → fallback

Avant d'écrire un test, vérifier qu'il n'existe pas déjà dans `src/__tests__/lib/`.

### Lot 2 — Tests d'intégration API

- `POST /api/prospects` : création valide, champs manquants, doublon → 409
- `PATCH /api/prospects/[id]` : changement de statut → vérifier qu'une `Activite` est créée
- `POST /api/prospection/save` : enregistrement + dédoublonnage `placeId`
- `GET /api/prospects` avec filtres `search`, `statut`, `scoreMin`

Vérifier dans `src/__tests__/api/` ce qui manque avant d'écrire.

### Lot 4 — Audit responsive (code-only)

Vérification statique sans browser :
- Classes Tailwind responsive (`sm:`, `md:`, `lg:`)
- Breakpoints cohérents
- Composants critiques : sidebar, `prospect-list`, `prospect-card-mobile`, `kanban`, `search-form`, page emails

Livrable : rapport `docs/superpowers/audits/2026-04-07-responsive-audit.md` avec issues + fixes appliqués si triviaux.

### Lot 5 — Build clean

- `npm run build` doit passer **zéro warning**
- Supprimer le code mort, notamment `injectNav` dans `netlify-deploy.ts` (mentionné par l'utilisateur)
- Supprimer les `console.log` de debug restants (pas les `console.error` structurés)
- Corriger tous les warnings TypeScript

### Lot 7 — Vérification CLAUDE.md

CLAUDE.md existe et semble complet. Vérifier :
- Stack à jour (Next.js, Prisma, Tailwind, Vitest)
- Règles de dev présentes (TS strict, requireAuth, validation, pas de mass assignment)
- Commandes utiles (`dev`, `build`, `test`, `lint`, `prisma`)
- Référence au CDC.md

Compléter si manque, sinon ne rien toucher.

## Stratégie d'exécution

Subagents en parallèle :
- **Vague 1 (parallèle)** : Lot 1, Lot 2, Lot 4, Lot 7 — indépendants
- **Vague 2 (séquentiel)** : Lot 5 — après les autres pour build final propre

## Critères de succès

- `npm run test` : tous les tests passent, couverture améliorée sur les libs ciblées
- `npm run build` : zéro warning
- `npm run lint` : zéro warning
- Rapport responsive committé
- CLAUDE.md à jour

## Hors scope (déjà couvert)

- Lot 3 audit sécurité OWASP → Session 18
- Lot 6 CI/CD GitHub Actions → déjà présent
