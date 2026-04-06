# Fix mineurs — à faire plus tard

| Date | Fichier | Problème | Action |
|------|---------|----------|--------|
| 2026-04-05 | `middleware.ts` | Convention `middleware` dépréciée dans Next.js 16 — warning au démarrage | Renommer en `proxy.ts` et adapter selon la doc : https://nextjs.org/docs/messages/middleware-to-proxy |

---

## Fix 2 — Aligner les statuts pipeline avec le CDC

Les colonnes du kanban et les valeurs dans validation.ts ne correspondent pas au CDC.

Remplacer les statuts actuels par ceux-ci (dans cet ordre) :
- A_DEMARCHER
- MAQUETTE_EMAIL_ENVOYES
- REPONDU
- RDV_PLANIFIE
- NEGOCIATION
- CLIENT
- PERDU

Fichiers à modifier :
- `src/lib/validation.ts` → `STATUT_PIPELINE_VALUES`
- `src/components/pipeline/kanban-board.tsx` → `COLUMNS`
- `src/components/prospects/status-badge.tsx` → vérifier que les badges couvrent les nouveaux noms
- `src/components/prospects/prospect-filters.tsx` → vérifier le dropdown de filtre statut

Supprimer : `CONTACTE`, `SIGNE`, `RELANCE`
Ajouter : `MAQUETTE_EMAIL_ENVOYES`, `REPONDU`, `NEGOCIATION`, `CLIENT`

Labels affichés dans le kanban :
| Valeur | Label |
|--------|-------|
| A_DEMARCHER | À démarcher |
| MAQUETTE_EMAIL_ENVOYES | Maquette + Email envoyés |
| REPONDU | Répondu |
| RDV_PLANIFIE | RDV planifié |
| NEGOCIATION | Négociation |
| CLIENT | Client |
| PERDU | Perdu |

---

## Fix 3 — Aligner le type d'activité

Dans `src/app/api/prospects/[id]/route.ts`, le type d'activité créé lors d'un changement de statut pipeline est `"CHANGEMENT_STATUT"`. Le remplacer par `"PIPELINE"` pour être cohérent avec le CDC (section 4.6 — types : `RECHERCHE | ANALYSE | MAQUETTE | EMAIL | RELANCE | PIPELINE | NOTE`).

---

## Fix 4 — Stitch SDK instable (priorité haute)

L'API Stitch retourne parfois "Incomplete API response from generate_screen_from_text".
Si le problème persiste après mise à jour du SDK, implémenter un plan B :
Claude génère le HTML directement (comme la v1) au lieu de passer par Stitch.
Garder l'architecture actuelle (buildStitchPrompt → generateMaquette → deployToNetlify)
mais remplacer l'appel Stitch par un appel Claude qui génère le HTML complet.

---

## Fix 5 — Taux de conversion dashboard

Dans `lib/dashboard.ts`, `getDashboardStats()` calcule `tauxConversion = clients / total`.
Le total inclut les prospects jamais contactés, ce qui fausse le taux.
Calculer plutôt : `clients / (prospects ayant statut >= MAQUETTE_EMAIL_ENVOYES)`.

---

## Fix 6 — computeProchainRelance fragile

Dans `lib/relance.ts`, la règle DEVIS filtre avec `description.includes("NEGOCIATION")`.
Si le format de description change, le calcul casse silencieusement.
Solution : stocker le statut cible dans un champ dédié de l'Activite,
ou utiliser un format de description standardisé et parsable.

---

## Fix 7 — Page emails : modale → split view

Le design validé prévoyait un split view (liste 40% gauche, composition 60% droite).
L'implémentation actuelle utilise une modale (DemarcherSheet).
Refactorer en split view pour un usage plus fluide si la page est utilisée fréquemment.
