import { test } from "@playwright/test"
import { login } from "./helpers"

test.describe("Recherche prospects", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test.skip("recherche puis enregistrement d'un résultat", async ({ page }) => {
    // TODO: confirmer le path exact de l'API recherche (/api/recherche ou /api/places/search ?)
    // et le shape de la réponse pour le mock.
    await page.route("**/api/recherche/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            results: [
              {
                placeId: "mock-1",
                name: "Boulangerie Test",
                address: "1 rue de Test, Lille",
                rating: 4.2,
                hasWebsite: false,
              },
            ],
          },
        }),
      })
    })
    await page.goto("/recherche")
  })
})
