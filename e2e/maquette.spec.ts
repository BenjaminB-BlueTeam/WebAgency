import { test } from "@playwright/test"
import { login } from "./helpers"

test.describe("Génération maquette", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test.skip("clic Générer maquette → modale prompt → demoUrl mockée", async ({ page }) => {
    // TODO: confirmer le path de l'API de génération (/api/maquette/generate ?)
    // et où le bouton "Générer une maquette" se trouve (fiche prospect probablement).
    await page.route("**/api/maquette/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: { demoUrl: "https://mock-demo.netlify.app", id: "mock-maquette-1" },
        }),
      })
    })
    await page.route("**/api.pexels.com/**", (r) => r.fulfill({ status: 200, body: "{}" }))
    await page.route("**/api.pappers.fr/**", (r) => r.fulfill({ status: 200, body: "{}" }))
    await page.route("**/api.anthropic.com/**", (r) => r.fulfill({ status: 200, body: "{}" }))
    await page.goto("/prospects")
  })
})
