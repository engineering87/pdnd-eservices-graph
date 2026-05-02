#!/usr/bin/env node
/**
 * audit-model.mjs
 * ───────────────
 * Audit interno del file `src/data/pdnd-data.json`. Non scarica nulla,
 * non si confronta con il catalogo ufficiale: si limita a fotografare
 * lo stato del modello e a segnalare incoerenze rispetto alla
 * convenzione di rappresentazione dichiarata in METODOLOGIA.md.
 *
 * Uso:
 *   node scripts/audit-model.mjs [path-to-pdnd-data.json]
 *
 * Output:
 *   - Riepilogo strutturale (nodi, e-service, archi derivati)
 *   - Distribuzione e-service erogati per nodo
 *   - Distribuzione fruitori per e-service
 *   - Distribuzione gradi (in-degree, out-degree)
 *   - Top-N erogatori e top-N fruitori
 *   - Sezione "incoerenze rilevate" (warning, non errori bloccanti)
 *
 * Lo script è idempotente e può essere rilanciato a ogni modifica del
 * JSON per verificare che il modello resti coerente con se stesso.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Risoluzione percorso input
const arg = process.argv[2];
const inputPath = arg
  ? resolve(arg)
  : resolve(__dirname, '..', 'src', 'data', 'pdnd-data.json');

let data;
try {
  data = JSON.parse(readFileSync(inputPath, 'utf8'));
} catch (err) {
  console.error(`Cannot read JSON at ${inputPath}: ${err.message}`);
  process.exit(1);
}

const { enti = [], eservices = [], meta = {} } = data;

// ───────────────────────────────────────────────────────────────────
// Helper: cerca un ente per id
// ───────────────────────────────────────────────────────────────────
const entiById = new Map(enti.map(e => [e.id, e]));
const nameOf = id => entiById.get(id)?.name ?? `<unknown:${id}>`;
const tipoOf = id => entiById.get(id)?.tipo ?? '';

// ───────────────────────────────────────────────────────────────────
// Sezione 1 — Riepilogo strutturale
// ───────────────────────────────────────────────────────────────────
const banner = (s) => console.log(`\n${'═'.repeat(72)}\n  ${s}\n${'═'.repeat(72)}`);
const sub = (s) => console.log(`\n  ${s}\n  ${'─'.repeat(s.length)}`);

console.log(`\nPDND data audit — input: ${inputPath}`);
if (meta.ultimo_aggiornamento) {
  console.log(`Last update declared in meta: ${meta.ultimo_aggiornamento}`);
}

banner('1. STRUCTURAL SUMMARY');

const totalEnti = enti.length;
const totalEs = eservices.length;
console.log(`  Total nodes (enti):           ${totalEnti}`);
console.log(`  Total e-service records:      ${totalEs}`);

// Categorie nodi
const byCat = {};
enti.forEach(e => {
  byCat[e.categoria] = (byCat[e.categoria] ?? 0) + 1;
});
sub('Nodes by category');
Object.entries(byCat).sort((a, b) => b[1] - a[1]).forEach(([cat, n]) => {
  console.log(`    ${cat.padEnd(26)} ${String(n).padStart(3)}`);
});

// ───────────────────────────────────────────────────────────────────
// Sezione 2 — Distribuzione e-service per erogatore
// ───────────────────────────────────────────────────────────────────
banner('2. E-SERVICE PER PROVIDER (out-eservices)');

const outEs = new Map();
for (const id of entiById.keys()) outEs.set(id, []);
for (const es of eservices) {
  if (!entiById.has(es.erogatore)) {
    console.warn(`  WARN: e-service "${es.id}" has unknown erogatore "${es.erogatore}"`);
    continue;
  }
  outEs.get(es.erogatore).push(es);
}

const ranked = [...outEs.entries()]
  .map(([id, list]) => ({ id, name: nameOf(id), n: list.length }))
  .sort((a, b) => b.n - a.n);

ranked.forEach(({ name, n }) => {
  const bar = '█'.repeat(Math.min(n, 30));
  console.log(`    ${name.padEnd(28)} ${String(n).padStart(3)}  ${bar}`);
});

// ───────────────────────────────────────────────────────────────────
// Sezione 3 — Distribuzione fruitori per e-service
// ───────────────────────────────────────────────────────────────────
banner('3. CONSUMERS PER E-SERVICE');

const fruitoriCounts = eservices.map(es => (es.fruitori ?? []).length);
const min = Math.min(...fruitoriCounts);
const max = Math.max(...fruitoriCounts);
const avg = fruitoriCounts.reduce((a, b) => a + b, 0) / fruitoriCounts.length;
const sorted = [...fruitoriCounts].sort((a, b) => a - b);
const median = sorted.length % 2 === 0
  ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
  : sorted[Math.floor(sorted.length / 2)];

console.log(`  Min:    ${min}`);
console.log(`  Max:    ${max}`);
console.log(`  Mean:   ${avg.toFixed(2)}`);
console.log(`  Median: ${median}`);

sub('Distribution (number of consumers per e-service)');
const buckets = { '0': 0, '1': 0, '2-5': 0, '6-10': 0, '11-20': 0, '21+': 0 };
fruitoriCounts.forEach(n => {
  if (n === 0) buckets['0']++;
  else if (n === 1) buckets['1']++;
  else if (n <= 5) buckets['2-5']++;
  else if (n <= 10) buckets['6-10']++;
  else if (n <= 20) buckets['11-20']++;
  else buckets['21+']++;
});
Object.entries(buckets).forEach(([range, n]) => {
  console.log(`    ${range.padEnd(10)} ${String(n).padStart(3)}  ${'█'.repeat(n)}`);
});

// ───────────────────────────────────────────────────────────────────
// Sezione 4 — Distribuzione dei gradi (rete derivata)
// ───────────────────────────────────────────────────────────────────
banner('4. DERIVED NETWORK G = (V, E, w)');

// Costruzione del grafo: arco (a,b) = a eroga >= 1 e-service consumato da b
const edgeKey = (a, b) => `${a}||${b}`;
const edgeServices = new Map();
for (const es of eservices) {
  const a = es.erogatore;
  for (const b of (es.fruitori ?? [])) {
    if (a === b) continue;
    const k = edgeKey(a, b);
    if (!edgeServices.has(k)) edgeServices.set(k, new Set());
    edgeServices.get(k).add(es.id);
  }
}
const totalEdges = edgeServices.size;
const inDeg = new Map();
const outDeg = new Map();
for (const id of entiById.keys()) { inDeg.set(id, 0); outDeg.set(id, 0); }
for (const k of edgeServices.keys()) {
  const [a, b] = k.split('||');
  outDeg.set(a, (outDeg.get(a) ?? 0) + 1);
  inDeg.set(b, (inDeg.get(b) ?? 0) + 1);
}

const providers = [...outDeg.values()].filter(v => v > 0).length;
const consumers = [...inDeg.values()].filter(v => v > 0).length;
const mixed = [...entiById.keys()].filter(id => outDeg.get(id) > 0 && inDeg.get(id) > 0).length;

console.log(`  Nodes |V|:                    ${totalEnti}`);
console.log(`  Directed edges |E|:           ${totalEdges}`);
console.log(`  Provider nodes (d_out > 0):   ${providers}`);
console.log(`  Consumer nodes (d_in > 0):    ${consumers}`);
console.log(`  Mixed-role nodes:             ${mixed}`);

// Distribuzione gradi
sub('Out-degree distribution (bins, last bin >=11)');
function distribution(map, maxBin = 11) {
  const bins = Array.from({ length: maxBin + 1 }, () => 0);
  for (const v of map.values()) bins[v >= maxBin ? maxBin : v]++;
  return bins;
}
const outBins = distribution(outDeg);
const inBins = distribution(inDeg);
console.log('    deg | out | in');
console.log('    ----+-----+-----');
for (let i = 0; i <= 11; i++) {
  const lab = i === 11 ? '>=11' : ` ${String(i).padStart(2)} `;
  console.log(`    ${lab} | ${String(outBins[i]).padStart(3)} | ${String(inBins[i]).padStart(3)}`);
}

// ───────────────────────────────────────────────────────────────────
// Sezione 5 — Top-N
// ───────────────────────────────────────────────────────────────────
banner('5. TOP-7 PROVIDERS AND CONSUMERS BY DEGREE');

function topK(map, k) {
  return [...map.entries()]
    .map(([id, deg]) => ({ id, name: nameOf(id), deg }))
    .filter(x => x.deg > 0)
    .sort((a, b) => b.deg - a.deg || a.name.localeCompare(b.name))
    .slice(0, k);
}
const topProv = topK(outDeg, 7);
const topCons = topK(inDeg, 7);

sub('Top-7 providers (by out-degree)');
topProv.forEach(p => console.log(`    ${p.name.padEnd(28)} ${String(p.deg).padStart(3)}`));

sub('Top-7 consumers (by in-degree)');
topCons.forEach(p => console.log(`    ${p.name.padEnd(28)} ${String(p.deg).padStart(3)}`));

// ───────────────────────────────────────────────────────────────────
// Sezione 6 — Incoerenze rilevate
// ───────────────────────────────────────────────────────────────────
banner('6. CONSISTENCY CHECKS');

const warnings = [];

// 6.1 Nodi marcati Erogatore o Erogatore/Fruitore senza e-service erogati
for (const e of enti) {
  if ((e.tipo === 'Erogatore' || e.tipo === 'Erogatore/Fruitore') && outEs.get(e.id).length === 0) {
    warnings.push(`Node "${e.name}" (id=${e.id}) is declared "${e.tipo}" but provides 0 e-services`);
  }
}

// 6.2 Nodi marcati Fruitore o Erogatore/Fruitore senza fruizioni
const referencedAsFruitor = new Set();
for (const es of eservices) {
  for (const f of (es.fruitori ?? [])) referencedAsFruitor.add(f);
}
for (const e of enti) {
  if ((e.tipo === 'Fruitore' || e.tipo === 'Erogatore/Fruitore') && !referencedAsFruitor.has(e.id)) {
    warnings.push(`Node "${e.name}" (id=${e.id}) is declared "${e.tipo}" but is never a consumer`);
  }
}

// 6.3 Fruitori con id sconosciuto
for (const es of eservices) {
  for (const f of (es.fruitori ?? [])) {
    if (!entiById.has(f)) {
      warnings.push(`E-service "${es.id}" lists unknown consumer "${f}"`);
    }
  }
}

// 6.4 Self-loop
for (const es of eservices) {
  if ((es.fruitori ?? []).includes(es.erogatore)) {
    warnings.push(`E-service "${es.id}" has provider also in fruitori (self-loop)`);
  }
}

// 6.5 E-service senza fruitori
for (const es of eservices) {
  if (!es.fruitori || es.fruitori.length === 0) {
    warnings.push(`E-service "${es.id}" has no consumers`);
  }
}

if (warnings.length === 0) {
  console.log('  No inconsistencies detected.');
} else {
  console.log(`  ${warnings.length} warning(s):\n`);
  warnings.forEach((w, i) => console.log(`    ${i + 1}. ${w}`));
}

// ───────────────────────────────────────────────────────────────────
// Sezione 7 — Modelling note
// ───────────────────────────────────────────────────────────────────
banner('7. MODELLING NOTE');
console.log(`
  Each record in 'eservices[]' represents a SERVICE TYPE rather than a
  catalogue endpoint. The 9 e-services produced by the aggregate node
  (comuni_agg) stand for the standardised services replicated by ~7,500
  municipalities in the official PDND catalogue. The same convention
  applies, to a lesser extent, to centrally-issued services that may
  appear as multiple endpoints in the catalogue.

  Consequences for any downstream count:

    - The number ${totalEs} of e-services in this model IS NOT directly
      comparable to the "2,000+ APIs" advertised by the PDND dashboard,
      because the dashboard counts catalogue endpoints, not service types.
    - The mapping from service-type to endpoints is roughly: each of the
      9 aggregate-node services corresponds to N hundreds of endpoints
      in the catalogue, summing to ~6,000 endpoints attributable to the
      aggregate node alone. See METODOLOGIA.md §3.1 for the breakdown.
`);

console.log('Done.\n');
