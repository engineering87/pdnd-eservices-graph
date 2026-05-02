#!/usr/bin/env node
/**
 * compute-paper-metrics.mjs
 * ─────────────────────────
 * Genera i valori numerici esatti necessari per il paper Zenodo a
 * partire da `src/data/pdnd-data.json`. Output formattato per essere
 * incollato direttamente nel sorgente LaTeX.
 *
 * Uso:
 *   node scripts/compute-paper-metrics.mjs [path-to-pdnd-data.json]
 *
 * Sezioni dell'output:
 *   A. Aggregate metrics (Tabella 4 del paper)
 *   B. Out-degree e in-degree distribution (Figura 3, pgfplots)
 *   C. Top-7 providers e top-7 consumers (Figura 4, pgfplots)
 *
 * Ogni sezione è già pre-formattata per l'incollaggio nel .tex.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const inputPath = process.argv[2]
  ? resolve(process.argv[2])
  : resolve(__dirname, '..', 'src', 'data', 'pdnd-data.json');

const data = JSON.parse(readFileSync(inputPath, 'utf8'));
const enti = data.enti ?? [];
const eservices = data.eservices ?? [];
const entiById = new Map(enti.map(e => [e.id, e]));
const nameOf = id => entiById.get(id)?.name ?? id;

// Costruzione grafo
const edgeSet = new Map();
for (const es of eservices) {
  for (const f of (es.fruitori ?? [])) {
    if (f === es.erogatore) continue;
    const k = `${es.erogatore}||${f}`;
    if (!edgeSet.has(k)) edgeSet.set(k, new Set());
    edgeSet.get(k).add(es.id);
  }
}

const inDeg = new Map(), outDeg = new Map();
for (const id of entiById.keys()) { inDeg.set(id, 0); outDeg.set(id, 0); }
for (const k of edgeSet.keys()) {
  const [a, b] = k.split('||');
  outDeg.set(a, outDeg.get(a) + 1);
  inDeg.set(b, inDeg.get(b) + 1);
}

const providers = [...outDeg.values()].filter(v => v > 0).length;
const consumers = [...inDeg.values()].filter(v => v > 0).length;
const mixed = [...entiById.keys()].filter(id => outDeg.get(id) > 0 && inDeg.get(id) > 0).length;

// ──────────────────────────────────────────────────────────────
const banner = (s) => console.log(`\n${'═'.repeat(72)}\n  ${s}\n${'═'.repeat(72)}`);

banner('A. AGGREGATE METRICS — Table 4 of the paper');
console.log(`
\\begin{table}[htbp]
\\centering
\\small
\\begin{tabular}{lr}
\\toprule
\\textbf{Metric} & \\textbf{Value} \\\\
\\midrule
Nodes $|V|$ & ${enti.length} \\\\
Directed edges $|E|$ & ${edgeSet.size} \\\\
Distinct e-services modelled & ${eservices.length} \\\\
Provider nodes (with $d_{\\text{out}} > 0$) & ${providers} \\\\
Consumer nodes (with $d_{\\text{in}} > 0$) & ${consumers} \\\\
Mixed-role nodes (both roles) & ${mixed} \\\\
\\bottomrule
\\end{tabular}
\\caption{Aggregate metrics of the reconstructed network.}
\\label{tab:metrics}
\\end{table}
`);

// ──────────────────────────────────────────────────────────────
banner('B. DEGREE DISTRIBUTION — Figure 3 (pgfplots)');

function distribution(map, maxBin = 11) {
  const bins = Array.from({ length: maxBin + 1 }, () => 0);
  for (const v of map.values()) bins[v >= maxBin ? maxBin : v]++;
  return bins;
}
const outBins = distribution(outDeg);
const inBins = distribution(inDeg);

const maxBin = Math.max(...outBins, ...inBins);
const ymax = Math.ceil((maxBin + 1) / 2) * 2; // arrotondato a even

console.log(`  Suggested ymax for the axis: ${ymax}\n`);

console.log(`% Out-degree (blue series)`);
console.log(`\\addplot[draw=blue!60, fill=blue!25] coordinates {`);
console.log(`  ${outBins.map((c, i) => `(${i},${c})`).join(' ')}`);
console.log(`};\n`);

console.log(`% In-degree (orange series)`);
console.log(`\\addplot[draw=orange!70!black, fill=orange!25] coordinates {`);
console.log(`  ${inBins.map((c, i) => `(${i},${c})`).join(' ')}`);
console.log(`};\n`);

console.log(`Readable form:`);
console.log(`    deg | out | in`);
console.log(`    ----+-----+----`);
for (let i = 0; i <= 11; i++) {
  const lab = i === 11 ? '>=11' : ` ${String(i).padStart(2)} `;
  console.log(`    ${lab} | ${String(outBins[i]).padStart(3)} | ${String(inBins[i]).padStart(3)}`);
}

// ──────────────────────────────────────────────────────────────
banner('C. TOP-7 PROVIDERS AND CONSUMERS — Figure 4 (pgfplots)');

function topK(map, k) {
  return [...map.entries()]
    .map(([id, deg]) => ({ id, name: nameOf(id), deg }))
    .filter(x => x.deg > 0)
    .sort((a, b) => b.deg - a.deg || a.name.localeCompare(b.name))
    .slice(0, k);
}

// pgfplots non gestisce parentesi tonde nei symbolic coords:
// usiamo un labeller che produce una versione safe
function safeLabel(name) {
  return name.replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim();
}

const topProv = topK(outDeg, 7).reverse(); // pgfplots disegna dal basso
const topCons = topK(inDeg, 7).reverse();

const xmaxProv = Math.max(...topProv.map(p => p.deg)) + 4;
const xmaxCons = Math.max(...topCons.map(p => p.deg)) + 4;
const xmaxBoth = Math.max(xmaxProv, xmaxCons);

console.log(`  Suggested xmax for both panels: ${xmaxBoth}\n`);

console.log(`% Top-7 providers (left panel)`);
console.log(`  symbolic y coords={${topProv.map(p => safeLabel(p.name)).join(', ')}},`);
console.log(`  ...`);
console.log(`\\addplot[draw=blue!60, fill=blue!25] coordinates {`);
console.log(`  ${topProv.map(p => `(${p.deg},${safeLabel(p.name)})`).join(' ')}`);
console.log(`};\n`);

console.log(`% Top-7 consumers (right panel)`);
console.log(`  symbolic y coords={${topCons.map(p => safeLabel(p.name)).join(', ')}},`);
console.log(`  ...`);
console.log(`\\addplot[draw=green!50!black, fill=green!20] coordinates {`);
console.log(`  ${topCons.map(p => `(${p.deg},${safeLabel(p.name)})`).join(' ')}`);
console.log(`};\n`);

// ──────────────────────────────────────────────────────────────
banner('NARRATIVE INPUTS — for the prose around the figures');

const top1Prov = topProv[topProv.length - 1];
const top1Cons = topCons[topCons.length - 1];
const provInBoth = topProv.filter(p => topCons.some(c => c.id === p.id));

console.log(`  Top provider:  ${top1Prov.name} (out-degree ${top1Prov.deg})`);
console.log(`  Top consumer:  ${top1Cons.name} (in-degree ${top1Cons.deg})`);
console.log(`  Nodes in both top-7 lists: ${provInBoth.length}`);
provInBoth.forEach(p => console.log(`    - ${p.name}`));

// Edge count by role of source
const aggOutEdges = [...edgeSet.keys()].filter(k => k.startsWith('comuni_agg||')).length;
const aggInEdges  = [...edgeSet.keys()].filter(k => k.endsWith('||comuni_agg')).length;
console.log(`\n  Edges originating from comuni_agg (aggregate as provider): ${aggOutEdges}`);
console.log(`  Edges arriving at comuni_agg (aggregate as consumer):     ${aggInEdges}`);

console.log('\nDone.\n');
