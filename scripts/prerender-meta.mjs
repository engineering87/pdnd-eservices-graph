#!/usr/bin/env node
/**
 * prerender-meta.mjs
 * ──────────────────
 * Dopo `vite build`, scrive in dist/ una pagina HTML per ogni rotta pubblica
 * (sezioni, enti, e-service) con titolo, descrizione e anteprima di
 * condivisione propri. I servizi che mostrano un'anteprima dei link (LinkedIn,
 * messaggistica, motori di ricerca) non eseguono JavaScript: senza queste
 * pagine ogni link mostrerebbe il titolo generico della home.
 *
 * Il contenuto della pagina resta l'app: cambia solo l'intestazione <head>.
 * Le rotte senza pagina dedicata continuano a passare dal rewrite su
 * /index.html di staticwebapp.config.json.
 *
 * Uso:  node scripts/prerender-meta.mjs   (eseguito da `npm run build`)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const SITO = "https://www.pdndgraph.it";
const BASE = "PDND E-Services Graph";

const data = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/pdnd-data.json"), "utf8"));
const template = fs.readFileSync(path.join(DIST, "index.html"), "utf8");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const taglia = (s, n = 200) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const fmt = (n) => n.toLocaleString("it-IT");
const sessioni = (n) => (n >= 1e6 ? `${(n / 1e6).toLocaleString("it-IT", { maximumFractionDigits: 1 })} milioni di sessioni` : `${fmt(n)} sessioni`);

/** Sostituisce il contenuto di un tag dell'intestazione; fallisce se manca. */
function sostituisci(html, re, valore, nome) {
  if (!re.test(html)) throw new Error(`prerender-meta: tag ${nome} non trovato in dist/index.html`);
  return html.replace(re, (_, a, b) => `${a}${valore}${b}`);
}

function pagina({ percorso, titolo, descrizione }) {
  const url = `${SITO}${percorso}`;
  const t = esc(titolo), d = esc(taglia(descrizione)), u = esc(url);
  let html = template;
  html = sostituisci(html, /(<title>)[^<]*(<\/title>)/, t, "title");
  html = sostituisci(html, /(<meta name="description" content=")[^"]*(")/, d, "description");
  html = sostituisci(html, /(<link rel="canonical" href=")[^"]*(")/, u, "canonical");
  html = sostituisci(html, /(<meta property="og:title" content=")[^"]*(")/, t, "og:title");
  html = sostituisci(html, /(<meta property="og:description" content=")[^"]*(")/, d, "og:description");
  html = sostituisci(html, /(<meta property="og:url" content=")[^"]*(")/, u, "og:url");
  const file = percorso === "/" ? path.join(DIST, "index.html") : path.join(DIST, ...percorso.split("/").filter(Boolean).map(decodeURIComponent), "index.html");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

const enti = new Map(data.enti.map((e) => [e.id, e]));
const pagine = [
  { percorso: "/esplora", titolo: `Relazioni — ${BASE}`, descrizione: "Quali enti offrono i dati e quali li usano: tutte le relazioni della mappa PDND, con filtri per ente, categoria e fonte ed esportazione in CSV." },
  { percorso: "/statistiche", titolo: `Numeri — ${BASE}`, descrizione: "I servizi PDND più adottati e più usati, le classi di enti e l'analisi della rete: chi raggiunge chi, gli enti ponte, la struttura dei legami." },
  { percorso: "/metodologia", titolo: `Metodologia — ${BASE}`, descrizione: "Fonti, scelte di rappresentazione e limiti della mappa PDND: dati aperti ufficiali, provenienza dichiarata per ogni legame." },
  { percorso: "/guida", titolo: `Guida — ${BASE}`, descrizione: "Come leggere e usare la mappa degli scambi di dati fra le Pubbliche Amministrazioni: comandi, colori, provenienze e parole chiave." },
];

for (const e of data.enti) {
  const offerti = data.eservices.filter((s) => s.erogatore === e.id).length;
  const usati = data.eservices.filter((s) => s.fruitori.includes(e.id)).length;
  const descrizione = e.aggregato
    ? `${e.name.replace(" (aggregati)", "")}: classe di ${fmt(e.aderenti || 0)} enti aderenti alla PDND. Usa ${usati} servizi di scambio dati nella mappa${offerti ? ` e ne offre ${offerti}` : ""}.`
    : `${e.name}${e.descrizione ? ` (${e.descrizione})` : ""}: ${offerti} servizi offerti e ${usati} usati sulla PDND, con gli enti collegati.`;
  pagine.push({ percorso: `/ente/${encodeURIComponent(e.id)}`, titolo: `${e.name} — ${BASE}`, descrizione });
}

for (const s of data.eservices) {
  const erog = enti.get(s.erogatore)?.name || s.erogatore;
  const uso = [
    s.enti_abilitati_min ? `almeno ${fmt(s.enti_abilitati_min)} enti abilitati` : null,
    s.sessioni_min ? `almeno ${sessioni(s.sessioni_min)} di scambio` : null,
  ].filter(Boolean).join(", ");
  const descrizione = `E-service di ${erog} sulla PDND${uso ? `: ${uso}` : ""}. ${s.descrizione || ""}`.trim();
  pagine.push({ percorso: `/eservice/${encodeURIComponent(s.id)}`, titolo: `${s.nome} — ${BASE}`, descrizione });
}

for (const p of pagine) pagina(p);
console.log(`prerender-meta: ${pagine.length} pagine con anteprima di condivisione in dist/`);
