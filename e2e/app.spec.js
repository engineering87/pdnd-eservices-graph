/**
 * Percorsi principali dell'app su desktop.
 */

import { test, expect, cercaNellaMappa } from "./fixtures.js";

const pannello = (page) => page.getByRole("button", { name: "Chiudi dettaglio" }).locator("..");

test.describe("Mappa", () => {
  test("la ricerca apre un ente e ne aggiorna l'indirizzo", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("img", { name: /Mappa degli scambi di dati/ })).toBeVisible();
    await cercaNellaMappa(page, "INPS");
    await expect(page).toHaveURL(/\/ente\/inps$/);
    await expect(pannello(page)).toContainText("Istituto Nazionale della Previdenza Sociale");
    await expect(pannello(page)).toContainText("Servizi che offre");
  });

  test("un link diretto apre l'ente selezionato", async ({ page }) => {
    await page.goto("/ente/ade");
    await expect(pannello(page)).toBeVisible();
    await expect(page).toHaveTitle(/Agenzia delle Entrate/);
  });

  test("la mappa smette di ridisegnarsi quando è ferma", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("img", { name: /Mappa degli scambi di dati/ })).toBeVisible();
    // Quando la simulazione si è assestata, in un secondo non partono fotogrammi.
    await expect.poll(async () => {
      const prima = await page.evaluate(() => window.__fotogrammi);
      await page.waitForTimeout(1000);
      return (await page.evaluate(() => window.__fotogrammi)) - prima;
    }, { timeout: 25_000, intervals: [0] }).toBe(0);
  });

  test("il filtro di provenienza finisce nell'indirizzo", async ({ page }) => {
    await page.goto("/?archi=osservata");
    await expect(page.getByText(/legami visibili su/)).toBeVisible();
    await expect(page).toHaveURL(/archi=osservata/);
  });
});

test.describe("Classi di enti", () => {
  test("dentro la classe, apertura nella mappa e chiusura", async ({ page }) => {
    await page.goto("/ente/sanita_agg");
    await page.getByRole("button", { name: "Dentro la classe" }).click();
    await expect(page.getByRole("button", { name: /ASL e ASP/ })).toBeVisible();
    await expect(page.getByText("Chi pubblica più e-service")).toBeVisible();

    await page.getByRole("button", { name: "Apri nella mappa per tipo di ente" }).click();
    await expect(page).toHaveURL(/aperte=sanita_agg/);

    await cercaNellaMappa(page, "ASL e ASP");
    await expect(page).toHaveURL(/\/ente\/sanita_agg__asl\?aperte=sanita_agg/);
    await expect(pannello(page)).toContainText("Parte della classe");

    await page.getByRole("button", { name: "Richiudi la classe" }).click();
    await expect(page).toHaveURL(/\/ente\/sanita_agg$/);
  });

  test("una classe aperta da link resta aperta", async ({ page }) => {
    await page.goto("/ente/pa_centrali_agg?aperte=pa_centrali_agg");
    await page.getByRole("button", { name: "Dentro la classe" }).click();
    await expect(page.getByRole("button", { name: "Richiudi la classe nella mappa" })).toBeVisible();
  });
});

test.describe("Il tuo ente", () => {
  test("cerca un Comune e ne apre la scheda", async ({ page }) => {
    await page.goto("/enti");
    const campo = page.getByLabel("Nome o codice IPA");
    await campo.fill("comune di lecce");
    await expect(page.getByRole("button", { name: /^Comune di Lecce/ }).first()).toBeVisible();
    await campo.press("Enter");
    await expect(page).toHaveURL(/\/enti\?ente=c_e506$/);
    await expect(page.getByRole("heading", { name: "Comune di Lecce" })).toBeVisible();
    await expect(page.getByText("Servizi usati dagli enti di questo tipo")).toBeVisible();
  });

  test("un link condiviso apre la scheda e porta alla mappa", async ({ page }) => {
    await page.goto("/enti?ente=inps");
    await expect(page.getByRole("heading", { name: /INPS/ })).toBeVisible();
    await page.getByRole("button", { name: "Apri nella mappa" }).click();
    await expect(page).toHaveURL(/\/ente\/inps$/);
  });
});

test.describe("Altre schede", () => {
  test("Relazioni con un filtro dall'indirizzo", async ({ page }) => {
    await page.goto("/esplora?fruitore=comuni_agg");
    await expect(page.locator("table tbody tr").first()).toBeVisible();
  });

  test("scheda di un e-service", async ({ page }) => {
    await page.goto("/eservice/pagopa_cfc8a94d");
    await expect(page.getByRole("heading", { name: "SEND - Servizio Notifiche Digitali" })).toBeVisible();
  });

  test("Numeri: andamenti, confronto, comunità e rete nel tempo", async ({ page }) => {
    await page.goto("/statistiche");
    await expect(page.getByRole("heading", { name: "Cosa è cambiato" })).toBeVisible();
    await expect(page.getByText("Comunità della rete")).toBeVisible();
    await expect(page.getByText("La rete nel tempo")).toBeVisible();
  });

  test("Metodologia e Guida", async ({ page }) => {
    await page.goto("/metodologia");
    await expect(page.locator("main")).toContainText("Fonti");
    await page.goto("/guida");
    await expect(page.locator("main")).toContainText("Il tuo ente");
  });
});

test.describe("Primo accesso, tema e accessibilità", () => {
  test.describe("senza benvenuto già visto", () => {
    test.use({ benvenutoVisto: false });

    test("il benvenuto compare e si chiude con Esc", async ({ page }) => {
      await page.goto("/");
      const benvenuto = page.getByRole("dialog");
      await expect(benvenuto).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(benvenuto).toBeHidden();
      await page.reload();
      await expect(page.getByRole("dialog")).toBeHidden();
    });
  });

  test("il tema chiaro si attiva e resta dopo il ricaricamento", async ({ page }) => {
    await page.goto("/guida");
    await page.getByRole("button", { name: /passa al tema chiaro/ }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("le intestazioni di sicurezza sono attive", async ({ page }) => {
    // La policy vale anche qui (vite preview usa staticwebapp.config.json):
    // una risorsa bloccata produrrebbe un errore in console e farebbe fallire
    // tutti gli altri test.
    const risposta = await page.goto("/");
    const h = risposta.headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["x-content-type-options"]).toBe("nosniff");
  });

  test("i caratteri arrivano dal sito stesso", async ({ page }) => {
    const font = [];
    page.on("response", (r) => { if (/\.woff2?$/.test(new URL(r.url()).pathname)) font.push(r.url()); });
    await page.goto("/guida");
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.fonts.check("600 16px 'Titillium Web'"))).toBe(true);
    expect(font.length).toBeGreaterThan(0);
    expect(font.every((u) => u.startsWith("http://localhost"))).toBe(true);
  });

  test("il primo Tab porta al link «Vai al contenuto»", async ({ page }) => {
    await page.goto("/guida");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Vai al contenuto" })).toBeFocused();
  });
});
