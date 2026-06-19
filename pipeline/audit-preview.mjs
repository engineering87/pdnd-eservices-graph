/**
 * audit-preview.mjs
 * ─────────────────
 * Controllo di qualità sul file generato dalla pipeline
 * (pipeline/pdnd-data.preview.json). Non modifica nulla: stampa solo statistiche
 * verificabili e segnala i casi che meritano una revisione manuale.
 *
 * Uso:
 *   node pipeline/audit-preview.mjs
 *   node pipeline/audit-preview.mjs path/al/file.json
 *
 * Cosa controlla:
 *   - Integrità del vocabolario: ogni erogatore e ogni fruitore deve essere un nodo esistente.
 *   - Auto-anelli: erogatore presente tra i propri fruitori.
 *   - Fruitori duplicati nello stesso e-service.
 *   - Conteggio archi per provenienza (documentata / certificata / inferita).
 *   - E-service senza archi.
 *   - Distribuzione della confidenza AI e lista delle inferenze a bassa confidenza.
 *   - Hub: e-service con il maggior numero di fruitori inferiti.
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PATH = process.argv[2] || join(__dirname, "pdnd-data.preview.json");
const LOW_CONF = parseFloat(process.env.AUDIT_LOW_CONF || "0.65");

const data = JSON.parse(readFileSync(PATH, "utf-8"));
const ids = new Set(data.enti.map(e => e.id));

const issues = { badErogatore: [], badFruitore: [], selfLoop: [], dupFruitore: [], schemaMismatch: [] };
const byOrigine = { documentata: 0, certificata: 0, inferita: 0, altro: 0 };
const noArchi = [];
const confidences = [];
const lowConf = [];
const fanout = [];

for (const s of data.eservices) {
  if (!ids.has(s.erogatore)) issues.badErogatore.push(`${s.nome} → ${s.erogatore}`);

  const archi = Array.isArray(s.archi) ? s.archi : [];
  if (archi.length === 0) noArchi.push(s.nome);

  // coerenza fruitori[] vs archi[]
  const fruitoriArchi = archi.map(a => a.fruitore).sort().join(",");
  const fruitoriLista = (Array.isArray(s.fruitori) ? [...s.fruitori] : []).sort().join(",");
  if (fruitoriArchi !== fruitoriLista) issues.schemaMismatch.push(s.nome);

  const seen = new Set();
  let inferiti = 0;
  for (const a of archi) {
    if (!ids.has(a.fruitore)) issues.badFruitore.push(`${s.nome} → ${a.fruitore}`);
    if (a.fruitore === s.erogatore) issues.selfLoop.push(`${s.nome} (${a.fruitore})`);
    if (seen.has(a.fruitore)) issues.dupFruitore.push(`${s.nome} → ${a.fruitore}`);
    seen.add(a.fruitore);
    if (byOrigine[a.origine] === undefined) byOrigine.altro++;
    else byOrigine[a.origine]++;
    if (a.origine === "inferita") inferiti++;
  }

  if (typeof s.ai_confidenza === "number") {
    confidences.push(s.ai_confidenza);
    if (s.ai_confidenza < LOW_CONF) lowConf.push({ nome: s.nome, conf: s.ai_confidenza });
  }
  if (inferiti > 0) fanout.push({ nome: s.nome, n: inferiti });
}

const pct = (n, d) => (d ? ((100 * n) / d).toFixed(1) + "%" : "—");
const totalArchi = byOrigine.documentata + byOrigine.certificata + byOrigine.inferita + byOrigine.altro;
const median = (arr) => {
  if (!arr.length) return null;
  const a = [...arr].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};

const line = (s = "") => process.stdout.write(s + "\n");

line(`\n=== AUDIT  ${PATH} ===`);
line(`Nodi: ${data.enti.length} · E-service: ${data.eservices.length} · Archi totali: ${totalArchi}`);

line(`\n--- Integrità ---`);
const ok = (label, arr) => line(`${arr.length === 0 ? "OK " : "!! "}${label}: ${arr.length}${arr.length ? "  → " + arr.slice(0, 8).join("; ") + (arr.length > 8 ? " …" : "") : ""}`);
ok("Erogatori fuori vocabolario", issues.badErogatore);
ok("Fruitori fuori vocabolario", issues.badFruitore);
ok("Auto-anelli (erogatore=fruitore)", issues.selfLoop);
ok("Fruitori duplicati", issues.dupFruitore);
ok("Disallineamenti fruitori[]/archi[]", issues.schemaMismatch);

line(`\n--- Archi per provenienza ---`);
line(`Documentata : ${byOrigine.documentata}  (${pct(byOrigine.documentata, totalArchi)})`);
line(`Certificata : ${byOrigine.certificata}  (${pct(byOrigine.certificata, totalArchi)})`);
line(`Inferita    : ${byOrigine.inferita}  (${pct(byOrigine.inferita, totalArchi)})`);
if (byOrigine.altro) line(`Altro       : ${byOrigine.altro}`);

line(`\n--- Copertura ---`);
line(`E-service con archi   : ${data.eservices.length - noArchi.length}  (${pct(data.eservices.length - noArchi.length, data.eservices.length)})`);
line(`E-service senza archi : ${noArchi.length}  (${pct(noArchi.length, data.eservices.length)})`);

line(`\n--- Confidenza AI (${confidences.length} e-service inferiti) ---`);
if (confidences.length) {
  line(`min ${Math.min(...confidences).toFixed(2)} · mediana ${median(confidences).toFixed(2)} · max ${Math.max(...confidences).toFixed(2)}`);
  const buckets = { "< 0.70": 0, "0.70-0.79": 0, "0.80-0.89": 0, "0.90-1.00": 0 };
  for (const c of confidences) {
    if (c < 0.7) buckets["< 0.70"]++;
    else if (c < 0.8) buckets["0.70-0.79"]++;
    else if (c < 0.9) buckets["0.80-0.89"]++;
    else buckets["0.90-1.00"]++;
  }
  for (const [k, v] of Object.entries(buckets)) line(`  ${k}: ${v}`);
  line(`\nInferenze a confidenza < ${LOW_CONF} (${lowConf.length}) — da rivedere a mano:`);
  for (const x of lowConf.sort((a, b) => a.conf - b.conf)) line(`  ${x.conf.toFixed(2)}  ${x.nome}`);
}

line(`\n--- Hub (più fruitori inferiti) ---`);
for (const x of fanout.sort((a, b) => b.n - a.n).slice(0, 10)) line(`  ${String(x.n).padStart(3)}  ${x.nome}`);
line("");
