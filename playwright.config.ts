import { defineConfig, devices } from "@playwright/test"

/**
 * Playwright config — projet CRM Flandre Web Agency
 * Lance les tests E2E contre une instance Next.js en local.
 *
 * Variables d'environnement :
 * - E2E_BASE_URL (défaut http://localhost:3000)
 * - E2E_PASSWORD (défaut "test1234") — mot de passe en clair correspondant
 *   au CRM_PASSWORD_HASH du .env.local utilisé par le serveur testé.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
