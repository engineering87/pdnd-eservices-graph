#!/usr/bin/env node
/**
 * compare-catalog.mjs
 * ───────────────────
 * Confronta il modello in `src/data/pdnd-data.json` con il catalogo
 * ufficiale `eservice_a_catalogo.csv` di italia/pdnd-opendata.
 *
 * Output:
 *   - Numeri reali del catalogo (totale, pubblicate, sospese)
 *   - Conteggio endpoint per producerName
 *   - Stima endpoint coperti dal modello, distinguendo:
 *       * endpoint individualmente modellati (e-service centrali)
 *       * endpoint rappresentati dal nodo aggregato (servizi tipo comunali)
 *   - Top-N producer del catalogo che non hanno un nodo dedicato nel modello
 *
 * Uso:
 *   node scripts/compare-catalog.mjs [path-to-pdnd-data.json]
 *   node scripts/compare-catalog.mjs --csv ./eservice_a_catalogo.csv
 *
 * Se il flag --csv non viene passato, lo script tenta di scaricare il CSV
 * da raw.githubusercontent.com. Se la rete non è disponibile, può
 * essere passato un file locale.
 *
 * Idempotente: rilanciabile per produrre uno snapshot aggiornato.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CSV_URL =
  'https://raw.githubusercontent.com/italia/pdnd-opendata/main/data/eservice_a_catalogo.csv';

// ───────────────────────────────────────────────────────────────────
// CLI
// ───────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
let modelPath = null;
let csvPath = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--csv') csvPath = args[++i];
  else if (!modelPath) modelPath = args[i];
}
modelPath = modelPath
  ? resolve(modelPath)
  : resolve(__dirname, '..', 'src', 'data', 'pdnd-data.json');

// ───────────────────────────────────────────────────────────────────
// Lettura modello
// ───────────────────────────────────────────────────────────────────
// NOTA: il modello viene letto e validato, ma al momento non è usato nel
// confronto: le metriche di copertura riportate più sotto sono calcolate dalla
// sola mappatura del catalogo. La lettura resta come controllo di integrità del
// file, e il confronto nodo per nodo è da completare.
try {
  JSON.parse(readFileSync(modelPath, 'utf8'));
} catch (err) {
  console.error(`Cannot read model JSON at ${modelPath}: ${err.message}`);
  process.exit(1);
}

// ───────────────────────────────────────────────────────────────────
// Lettura/scaricamento del CSV catalogo
// ───────────────────────────────────────────────────────────────────
async function getCatalogCsv() {
  if (csvPath && existsSync(resolve(csvPath))) {
    console.log(`Reading local catalogue CSV: ${csvPath}`);
    return readFileSync(resolve(csvPath), 'utf8');
  }
  console.log(`Downloading catalogue from: ${CSV_URL}`);
  try {
    const res = await fetch(CSV_URL);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    const text = await res.text();
    // Cache locale a fianco del modello, così la corsa successiva non rifa download
    const cachePath = resolve(__dirname, '..', '.cache-catalog.csv');
    try { writeFileSync(cachePath, text); } catch { /* ignore */ }
    return text;
  } catch (err) {
    console.error(`Cannot fetch catalogue: ${err.message}`);
    console.error('Pass --csv <path-to-local-eservice_a_catalogo.csv> as a fallback.');
    process.exit(2);
  }
}

// ───────────────────────────────────────────────────────────────────
// Parser CSV minimale (gestisce campi con virgolette)
// ───────────────────────────────────────────────────────────────────
function parseCsvLine(line) {
  const out = [];
  let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      // Doppia virgoletta = escape
      if (q && line[i + 1] === '"') { cur += '"'; i++; }
      else q = !q;
    } else if (c === ',' && !q) {
      out.push(cur); cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.length > 0);
  if (lines.length < 2) return { header: [], rows: [] };
  const header = parseCsvLine(lines[0]).map(s => s.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    const obj = {};
    header.forEach((h, idx) => { obj[h] = (fields[idx] ?? '').trim(); });
    rows.push(obj);
  }
  return { header, rows };
}

// ───────────────────────────────────────────────────────────────────
// Heuristiche di classificazione "service type" per endpoint del catalogo.
// Allineate con METODOLOGIA.md §3.1.
// ───────────────────────────────────────────────────────────────────
function classifyServiceType(name = '') {
  const n = name.toLowerCase();
  if (n.includes('albo pretorio')) return 'Albo Pretorio';
  if (n.includes('suap')) return 'Pratiche SUAP';
  if (n.includes('civici') || n.includes('stradario') || n.includes('toponoma')) return 'Numerazione Civica / Stradario';
  if (n.includes('amministrazione trasparente') || n.includes('legge 190') || n.includes('trasparente')) return 'Amministrazione Trasparente';
  if (n.includes('demografic') || n.includes('soggett') || n.includes('famiglia') || n.includes('residen')) return 'Servizi Demografici';
  if (n.includes('tribut') || n.includes('imu') || n.includes('tari') || n.includes('riscoss')) return 'Tributi e Posizioni Debitorie';
  if (n.includes('welfare') || n.includes('waas')) return 'WaaS – Welfare as a Service';
  if (n.includes('protocollo')) return 'Protocollo Informatico';
  if (n.includes('iot') || n.includes('sensor')) return 'Dati Sensori IoT';
  return null;
}

// ───────────────────────────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────────────────────────
const banner = (s) => console.log(`\n${'═'.repeat(72)}\n  ${s}\n${'═'.repeat(72)}`);
const sub = (s) => console.log(`\n  ${s}\n  ${'─'.repeat(s.length)}`);

(async () => {
  const csv = await getCatalogCsv();
  const { header, rows } = parseCsv(csv);

  console.log(`\nRows in catalogue: ${rows.length}`);
  console.log(`Columns: ${header.join(', ')}`);

  // Stato pubblicazione: la colonna si chiama solitamente `state`
  const stateKey = header.find(h => /^state$/i.test(h)) ?? header.find(h => /state/i.test(h));
  // ProducerName ha priorità rigorosa su producerId: cerchiamo l'esatto match prima
  const producerKey =
    header.find(h => /^producerName$/i.test(h)) ??
    header.find(h => /^producer_name$/i.test(h)) ??
    header.find(h => /producer.?name/i.test(h)) ??
    'producerName';
  const nameKey = header.find(h => /^name$/i.test(h)) ?? 'name';

  banner('1. CATALOGUE OVERVIEW');
  const total = rows.length;
  const published = rows.filter(r => stateKey && r[stateKey] === 'PUBLISHED').length;
  const suspended = rows.filter(r => stateKey && r[stateKey] === 'SUSPENDED').length;
  const distinctProducers = new Set(rows.map(r => r[producerKey])).size;
  console.log(`  Total endpoints in catalogue:     ${total}`);
  console.log(`  Published:                        ${published}`);
  console.log(`  Suspended:                        ${suspended}`);
  console.log(`  Draft / other:                    ${total - published - suspended}`);
  console.log(`  Distinct producers (entities):    ${distinctProducers}`);

  // ───────────────────────────────────────────────────────────────────
  // Classificazione per service-type
  // ───────────────────────────────────────────────────────────────────
  banner('2. CATALOGUE BY SERVICE TYPE (HEURISTIC)');
  console.log(`  These are HEURISTIC counts based on substring matching on the\n`
            + `  e-service name field. They give a rough mapping between\n`
            + `  catalogue endpoints and the service-type aggregation used in\n`
            + `  pdnd-data.json. See METODOLOGIA.md §3.1 for the original\n`
            + `  estimates.\n`);

  const stByType = new Map();
  let unclassified = 0;
  for (const r of rows) {
    if (stateKey && r[stateKey] !== 'PUBLISHED') continue;
    const t = classifyServiceType(r[nameKey]);
    if (t) stByType.set(t, (stByType.get(t) ?? 0) + 1);
    else unclassified++;
  }
  const stEntries = [...stByType.entries()].sort((a, b) => b[1] - a[1]);
  console.log(`  ${'Service type'.padEnd(38)} ${'Endpoints'.padStart(10)}`);
  console.log(`  ${'─'.repeat(38)} ${'─'.repeat(10)}`);
  stEntries.forEach(([t, n]) => {
    console.log(`  ${t.padEnd(38)} ${String(n).padStart(10)}`);
  });
  const stTotal = stEntries.reduce((a, [, n]) => a + n, 0);
  console.log(`  ${'─'.repeat(38)} ${'─'.repeat(10)}`);
  console.log(`  ${'covered by aggregation rule'.padEnd(38)} ${String(stTotal).padStart(10)}`);
  console.log(`  ${'unclassified (likely central)'.padEnd(38)} ${String(unclassified).padStart(10)}`);

  // ───────────────────────────────────────────────────────────────────
  // Producer del catalogo
  // ───────────────────────────────────────────────────────────────────
  banner('3. TOP-30 PRODUCERS IN THE CATALOGUE (PUBLISHED)');
  const byProducer = {};
  for (const r of rows) {
    if (stateKey && r[stateKey] !== 'PUBLISHED') continue;
    const k = r[producerKey] || '<unknown>';
    byProducer[k] = (byProducer[k] ?? 0) + 1;
  }
  const sorted = Object.entries(byProducer).sort((a, b) => b[1] - a[1]);
  sorted.slice(0, 30).forEach(([n, c], i) => {
    console.log(`  ${String(i + 1).padStart(2)}. ${String(n).substring(0, 50).padEnd(50)} ${String(c).padStart(5)}`);
  });

  // ───────────────────────────────────────────────────────────────────
  // Mappatura producer del catalogo ai nodi del modello
  // ───────────────────────────────────────────────────────────────────
  banner('4. COVERAGE OF CATALOGUE PRODUCERS BY MODEL NODES');

  // Tabella di alias esplicita: per ogni id del modello, una lista di pattern
  // (substring case-insensitive) che, se trovati nel producerName del catalogo,
  // mappano sul nodo. Le voci sono valutate nell'ordine: la prima che fa match
  // vince. Più specifico → prima.
  //
  // Modificare questa tabella quando si aggiungono nuovi nodi al modello o
  // quando il catalogo introduce nuove varianti di denominazione.
  const PRODUCER_ALIASES = [
    // Riscossione PRIMA di Agenzia delle Entrate per evitare mismatch
    ['ade_riscossione', ['agenzia delle entrate-riscossione', 'agenzia delle entrate - riscossione', 'riscossione']],
    ['ade',             ['agenzia delle entrate']],
    ['ag_demanio',      ['agenzia del demanio']],
    ['min_interno',     ['ministero dell\'interno', "ministero dell interno", 'anpr']],
    ['min_giustizia',   ['ministero della giustizia']],
    ['min_cultura',     ['ministero della cultura', 'i.pac', 'ipac', 'istituto centrale per la digitalizzazione del patr']],
    ['mef',             ['ministero dell\'economia e delle finanze', 'ministero economia e finanze', 'mef']],
    ['mlps',            ['ministero del lavoro']],
    ['mit',             ['ministero delle infrastrutture', 'ministero infrastrutture']],
    ['mit_dgmot',       ['motorizzazione', 'direzione generale per la motorizzazione']],
    ['mur',             ['ministero dell\'universita\' e della ricerca', 'ministero dell\'università e della ricerca', 'ministero dell\'università', 'ministero dell\'universita', 'ministero universita', "mur"]],
    ['min_istruzione',  ['ministero dell\'istruzione e del merito', 'ministero dell\'istruzione', 'ministero istruzione']],
    ['ispra',           ['istituto superiore per la protezione e la ricerca ambientale', 'ispra']],
    ['dfp',             ['dipartimento della funzione pubblica', 'funzione pubblica']],
    ['inps',            ['istituto nazionale previdenza sociale', 'i.n.p.s.', 'inps']],
    ['inail',           ['istituto nazionale assicurazione', 'inail']],
    ['agid',            ['agenzia per l\'italia digitale', 'agid']],
    ['anac',            ['autorita\' nazionale anticorruzione', 'autorita nazionale anticorruzione', 'a.n.ac', 'anac']],
    ['unioncamere',     ['unione italiana delle camere di commercio', 'unioncamere', 'infocamere']],
    ['istat',           ['istituto nazionale di statistica', 'istat']],
    ['pagopa',          ['pagopa']],
    ['sogei',           ['sogei']],
    ['cineca',          ['cineca']],
    // Regioni e Province Autonome (ordine importante: PA prima delle regioni omonime)
    ['pa_bolzano',      ['provincia autonoma di bolzano']],
    ['pa_trento',       ['provincia autonoma di trento']],
    ['r_friuli',        ['friuli-venezia giulia', 'friuli venezia giulia']],
    ['r_sicilia',       ['regione siciliana', 'regione sicilia']],
    ['r_vda',           ["valle d'aosta", 'valle d aosta']],
    ['r_emilia',        ['emilia-romagna', 'emilia romagna']],
    ['r_lombardia',     ['regione lombardia']],
    ['r_lazio',         ['regione lazio']],
    ['r_campania',      ['regione campania']],
    ['r_liguria',       ['regione liguria']],
    ['r_toscana',       ['regione toscana']],
    ['r_molise',        ['regione molise']],
    ['r_puglia',        ['regione puglia']],
    ['r_abruzzo',       ['regione abruzzo']],
    ['r_piemonte',      ['regione piemonte']],
    ['r_veneto',        ['regione del veneto', 'regione veneto']],
    ['r_marche',        ['regione marche']],
    ['r_umbria',        ['regione umbria']],
    ['r_basilicata',    ['regione basilicata']],
    ['r_sardegna',      ['regione autonoma della sardegna', 'regione sardegna']],
    ['r_calabria',      ['regione calabria']],
    // Big municipalities (ordine: prima dei comuni generici)
    ['c_milano',        ['comune di milano']],
    ['c_roma',          ['roma capitale', 'comune di roma']],
    ['c_napoli',        ['comune di napoli']],
    ['c_bologna',       ['comune di bologna']],
    ['c_genova',        ['comune di genova']],
    ['c_padova',        ['comune di padova']],
  ];

  function matchToNode(producerName) {
    // Normalizza apostrofi unicode (' ` ‘ ’) → ' e collassa whitespace
    const p = producerName
      .toLowerCase()
      .replace(/[\u2018\u2019\u0060\u00b4]/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
    for (const [id, patterns] of PRODUCER_ALIASES) {
      for (const pat of patterns) {
        const np = pat.replace(/[\u2018\u2019\u0060\u00b4]/g, "'");
        if (p.includes(np)) return id;
      }
    }
    if (/^comune di /i.test(producerName)) return null;
    return null;
  }

  let coveredEndpoints = 0;
  let mappedToCentral = 0;
  let mappedToBigComune = 0;
  let mappedToAggregate = 0;
  let unmappedEndpoints = 0;
  const unmappedByProducer = {};

  const bigComuni = new Set(['c_milano', 'c_roma', 'c_napoli', 'c_bologna', 'c_genova', 'c_padova']);
  const aggregateEligible = (name) => /^Comune di /i.test(name);

  for (const r of rows) {
    if (stateKey && r[stateKey] !== 'PUBLISHED') continue;
    const pn = r[producerKey] || '';
    const matched = matchToNode(pn);
    if (matched) {
      coveredEndpoints++;
      if (bigComuni.has(matched)) mappedToBigComune++;
      else mappedToCentral++;
    } else if (aggregateEligible(pn)) {
      coveredEndpoints++;
      mappedToAggregate++;
    } else {
      unmappedEndpoints++;
      unmappedByProducer[pn] = (unmappedByProducer[pn] ?? 0) + 1;
    }
  }

  console.log(`  Published endpoints in catalogue:               ${published}`);
  console.log(`  Covered by model (any node):                    ${coveredEndpoints}`);
  console.log(`    - mapped to a central/specific entity:        ${mappedToCentral}`);
  console.log(`    - mapped to a big municipality node:          ${mappedToBigComune}`);
  console.log(`    - subsumed by the aggregate municipalities:   ${mappedToAggregate}`);
  console.log(`  Not covered by any current model node:          ${unmappedEndpoints}`);
  console.log(`    Coverage:                                     ${(100 * coveredEndpoints / published).toFixed(1)}%`);

  if (unmappedEndpoints > 0) {
    sub('Top-15 unmapped producers (candidates for inclusion or for a mapping rule)');
    Object.entries(unmappedByProducer)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .forEach(([n, c]) => {
        console.log(`    ${String(c).padStart(4)}  ${n}`);
      });
  }

  // ───────────────────────────────────────────────────────────────────
  console.log('\nDone.\n');
})();
