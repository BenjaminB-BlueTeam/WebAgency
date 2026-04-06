# Lessons apprises

| Date | Ce qui s'est passé | Règle à appliquer |
|------|-------------------|-------------------|
| 2026-04-05 | Les tests avec `as any` déclenchent `@typescript-eslint/no-explicit-any` en CI, cassant le lint | Ajouter `/* eslint-disable @typescript-eslint/no-explicit-any */` en tête de TOUS les fichiers de test qui utilisent `as any` (mocks Prisma, mocks Request, etc.) |
| 2026-04-05 | Quand on retire un paramètre d'une fonction (ex: `_request: NextRequest` → `GET()`), les tests qui l'appellent avec `GET(req as any)` cassent le typecheck CI (TS2554). | Après tout changement de signature de route, mettre à jour les tests correspondants dans le même commit |
| 2026-04-05 | Un `// eslint-disable-next-line @typescript-eslint/no-explicit-any` inutile (aucun `any` sur la ligne suivante) génère un warning lint "Unused eslint-disable directive" | Vérifier que chaque eslint-disable correspond bien à un vrai `any` sur la ligne suivante avant de commiter |
