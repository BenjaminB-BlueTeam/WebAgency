import { Page, expect } from "@playwright/test"

export const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "test1234"

/**
 * Effectue le login complet via le formulaire et attend la redirection vers /.
 */
export async function login(page: Page, password: string = E2E_PASSWORD) {
  await page.goto("/login")
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole("button", { name: /se connecter/i }).click()
  await expect(page).toHaveURL(/\/$|\/(dashboard)?$/, { timeout: 15_000 })
}
