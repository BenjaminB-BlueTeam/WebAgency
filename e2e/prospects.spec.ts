import { test } from "@playwright/test"
import { login } from "./helpers"

test.describe("Prospects", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test.skip("ajout manuel via modale", async ({ page }) => {
    // TODO: confirmer le data-testid ou le label exact du bouton "Ajouter un prospect"
    // et les noms des champs de la modale (nom entreprise, activité, ville, etc.).
    await page.goto("/prospects")
  })

  test.skip("filtres activité + ville", async ({ page }) => {
    // TODO: confirmer les sélecteurs des composants de filtres (Select shadcn).
    await page.goto("/prospects")
  })

  test.skip("ouvrir fiche et naviguer entre les 4 onglets", async ({ page }) => {
    // TODO: vérifier les noms des onglets (Infos, Audit, Maquette, Notes ?) et qu'au moins
    // un prospect existe en base de test pour cliquer dessus.
    await page.goto("/prospects")
  })

  test.skip("modifier statut pipeline depuis la fiche", async ({ page }) => {
    // TODO: identifier le composant de changement de statut côté fiche prospect.
    await page.goto("/prospects")
  })
})
