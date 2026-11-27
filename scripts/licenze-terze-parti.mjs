#!/usr/bin/env node
/**
 * licenze-terze-parti.mjs
 * ───────────────────────
 * Scrive dist/licenze-terze-parti.txt con il testo integrale delle licenze di
 * tutto il codice e i caratteri di terze parti che il sito distribuisce:
 * le dipendenze di runtime di package.json e, ricorsivamente, le loro.
 *
 * Serve perché la build minifica il codice e toglie i commenti di licenza,
 * mentre MIT (React) e SIL Open Font License 1.1 (Titillium Web, Roboto Mono)
 * chiedono che la nota di copyright e la licenza accompagnino ogni copia.
 * Gira dopo `vite build` (vedi lo script build in package.json).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const NM = path.join(ROOT, "node_modules");

const leggi = (nome) => JSON.parse(fs.readFileSync(path.join(NM, nome, "package.json"), "utf8"));

// Dipendenze di runtime, in profondità, senza duplicati.
const visti = new Map();
const coda = Object.keys(JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).dependencies || {});
while (coda.length) {
  const nome = coda.shift();
  if (visti.has(nome)) continue;
  const pkg = leggi(nome);
  visti.set(nome, pkg);
  coda.push(...Object.keys(pkg.dependencies || {}));
}

const testoLicenza = (nome) => {
  const dir = path.join(NM, nome);
  const file = fs.readdirSync(dir).find((f) => /^(licen[cs]e|copying)(\.|$)/i.test(f));
  if (!file) throw new Error(`licenze-terze-parti: nessun file di licenza per ${nome}`);
  return fs.readFileSync(path.join(dir, file), "utf8").trim();
};

const sezioni = [...visti.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([nome, pkg]) => {
    const repo = typeof pkg.repository === "string" ? pkg.repository : pkg.repository?.url || "";
    return [
      "=".repeat(78),
      `${nome} ${pkg.version} — ${pkg.license}`,
      pkg.homepage || repo ? `${pkg.homepage || repo}` : null,
      "=".repeat(78),
      "",
      testoLicenza(nome),
      "",
    ].filter((r) => r !== null).join("\n");
  });

const intestazione = `PDND E-Services Graph — licenze di terze parti
https://www.pdndgraph.it

Il codice del progetto è distribuito con licenza GNU AGPL-3.0-or-later con un termine
aggiuntivo di attribuzione (sezione 7(b)): vedi LICENSE e ADDITIONAL-TERMS.md in
https://github.com/engineering87/pdnd-eservices-graph

Il sito include i seguenti componenti di terze parti, ciascuno con la propria
licenza, riportata qui per intero.

I dati di origine sono PDND Open Data (https://github.com/italia/pdnd-opendata),
Presidenza del Consiglio dei Ministri – Dipartimento per la Trasformazione
Digitale, licenza CC0 1.0, rielaborati dal progetto.

`;

if (!fs.existsSync(DIST)) throw new Error("licenze-terze-parti: cartella dist/ assente, eseguire prima vite build");
fs.writeFileSync(path.join(DIST, "licenze-terze-parti.txt"), intestazione + sezioni.join("\n") + "\n", "utf8");
console.log(`licenze-terze-parti: ${visti.size} componenti in dist/licenze-terze-parti.txt`);
