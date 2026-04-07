import { test, expect } from "@playwright/test"
import { E2E_PASSWORD, login } from "./helpers"

test.describe("Authentification", () => {
  test("mauvais mot de passe affiche un message d'erreur", async ({ page }) => {
    await page.goto("/login")
    await page.locator('input[type="password"]').fill("definitely-wrong-password-xyz")
    await page.getByRole("button", { name: /se connecter/i }).click()
    await expect(page.getByText(/incorrect|erreur/i)).toBeVisible({ timeout: 10_000 })
  })

  test("bon mot de passe redirige vers /", async ({ page }) => {
    await login(page)
    expect(new URL(page.url()).pathname).toBe("/")
  })

  test("logout redirige vers /login", async ({ page, context }) => {
    await login(page)
    // POST direct sur /api/auth/logout puis vérifie qu'une nav vers /prospects redirige.
    await context.request.post("/api/auth/logout")
    await page.goto("/prospects")
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test("accès /prospects sans auth redirige vers /login", async ({ page, context }) => {
    await context.clearCookies()
    await page.goto("/prospects")
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })
})

// Garde-fou : signale clairement quand E2E_PASSWORD n'est pas fourni
test.beforeAll(() => {
  if (!process.env.E2E_PASSWORD) {
    console.warn(
      `[e2e] E2E_PASSWORD non défini, fallback "${E2E_PASSWORD}". ` +
        `Si le login échoue, exporte E2E_PASSWORD correspondant à CRM_PASSWORD_HASH.`
    )
  }
})
