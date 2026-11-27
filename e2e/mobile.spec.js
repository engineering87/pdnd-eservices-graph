/**
 * Controlli su smartphone: pannello dell'ente e pagine senza scorrimento
 * orizzontale.
 */

import { test, expect } from "./fixtures.js";

const senzaScorrimentoOrizzontale = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test("il pannello di un ente si apre su smartphone", async ({ page }) => {
  await page.goto("/ente/inps");
  await expect(page.getByRole("button", { name: "Chiudi dettaglio" })).toBeVisible();
  expect(await senzaScorrimentoOrizzontale(page)).toBe(true);
});

for (const percorso of ["/enti?ente=c_e506", "/statistiche", "/esplora", "/guida"]) {
  test(`nessuno scorrimento orizzontale su ${percorso}`, async ({ page }) => {
    await page.goto(percorso);
    await expect(page.locator("main")).toBeVisible();
    expect(await senzaScorrimentoOrizzontale(page)).toBe(true);
  });
}
