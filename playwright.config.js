import { defineConfig, devices } from "@playwright/test";

/**
 * Test end-to-end: aprono l'app vera nel browser (Chromium) e ne percorrono le
 * funzioni principali. Girano sulla build di produzione servita da
 * `vite preview`, la stessa che va online, prerender delle pagine compreso.
 *
 * In locale `npm run test:e2e` costruisce l'app e la serve; nella CI la build
 * c'è già e si avvia solo il server.
 */
const PORTA = 4174;

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORTA}`,
    colorScheme: "dark",
    locale: "it-IT",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 860 } }, testIgnore: /mobile\.spec/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile\.spec/ },
  ],
  webServer: {
    command: process.env.CI
      ? `npm run preview -- --port ${PORTA} --strictPort`
      : `npm run build && npm run preview -- --port ${PORTA} --strictPort`,
    url: `http://localhost:${PORTA}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
