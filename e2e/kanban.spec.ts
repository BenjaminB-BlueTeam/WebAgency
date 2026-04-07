import { test } from "@playwright/test"
import { login } from "./helpers"

test.describe("Kanban pipeline", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test.skip("drag & drop colonne → colonne", async ({ page }) => {
    // TODO: dnd-kit n'est pas trivialement testable via mouse drag — vérifier
    // si une API d'interaction existe ou exposer un data-testid sur les colonnes.
    await page.goto("/pipeline")
  })

  test.skip("drop dans Perdu ouvre la modale raison", async ({ page }) => {
    // TODO: idem + confirmer le label de la modale "Raison de la perte".
    await page.goto("/pipeline")
  })

  test.skip("drop dans Client ouvre la modale Session B", async ({ page }) => {
    // TODO: confirmer le contenu exact de la modale Client introduite en Session B.
    await page.goto("/pipeline")
  })
})
