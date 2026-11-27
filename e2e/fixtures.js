/**
 * Base comune dei test end-to-end.
 *
 * - La schermata di benvenuto risulta già vista, così non copre la pagina;
 *   il test che la riguarda lo disattiva con `benvenutoVisto: false`.
 * - Ogni errore JavaScript della pagina o in console fa fallire il test.
 * - `window.__fotogrammi` conta i fotogrammi richiesti dall'app, per
 *   verificare che la mappa smetta di ridisegnarsi quando è ferma.
 */

import { test as base, expect } from "@playwright/test";

export const test = base.extend({
  benvenutoVisto: [true, { option: true }],

  page: async ({ page, benvenutoVisto }, use) => {
    await page.addInitScript((visto) => {
      if (visto) {
        try { window.localStorage.setItem("pdnd-graph-benvenuto-visto", "1"); } catch { /* */ }
      }
      window.__fotogrammi = 0;
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (cb) => { window.__fotogrammi++; return raf(cb); };
    }, benvenutoVisto);

    const errori = [];
    page.on("pageerror", (e) => errori.push(`pageerror: ${e.message}`));
    page.on("console", (m) => { if (m.type() === "error") errori.push(`console: ${m.text()}`); });
    // Privacy: l'app non deve contattare altri siti (caratteri, statistiche,
    // CDN). Ogni richiesta fuori dal sito fa fallire il test.
    page.on("request", (r) => {
      const u = new URL(r.url());
      if (/^https?:$/.test(u.protocol) && u.hostname !== "localhost") errori.push(`richiesta esterna: ${u.origin}`);
    });

    await use(page);

    expect(errori, "errori nella pagina").toEqual([]);
  },
});

export { expect };

/** Cerca un ente nella mappa e lo apre con Invio. */
export async function cercaNellaMappa(page, testo) {
  const campo = page.getByRole("combobox", { name: /Cerca un ente/ });
  await campo.fill(testo);
  await campo.press("Enter");
}
