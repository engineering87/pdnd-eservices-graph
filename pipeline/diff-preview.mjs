/**
 * diff-preview.mjs
 * ────────────────
 * Confronta il grafo live curato (src/data/pdnd-data.json) con l'anteprima
 * generata dalla pipeline (pipeline/pdnd-data.preview.json) e mostra COSA
 * cambierebbe se promuovessi l'anteprima. Non modifica nulla.
 *
 * Uso:
 *   node pipeline/diff-preview.mjs
 *
 * Nota sul matching degli e-service: il grafo curato non ha catalogId, quindi
 * l'allineamento tra i due insiemi avviene per NOME normalizzato. È quindi
 * un'approssimazione: nomi cambiati nel catalogo possono risultare come
 * "rimosso + aggiunto" anche se si tratta dello stesso servizio.
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const live = JSON.parse(readFileSync(join(ROOT, "src", "data", "pdnd-data.json"), "utf-8"));
const prev = JSON.parse(readFileSync(join(__dirname, "pdnd-data.preview.json"), "utf-8"));

const norm = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();
const archiOf = (e) => (Array.isArray(e.archi) ? e.archi.map(a => a.fruitore)
  : Array.isArray(e.fruitori) ? e.fruitori : []);
const connCount = (g) => g.eservices.reduce((n, e) => n + archiOf(e).length, 0);

const line = (s = "") => process.stdout.write(s + "\n");

// --- Nodi ---
const liveNodes = new Set(live.enti.map(e => e.id));
const prevNodes = new Set(prev.enti.map(e => e.id));
const nodesAdded = [...prevNodes].filter(id => !liveNodes.has(id));
const nodesRemoved = [...liveNodes].filter(id => !prevNodes.has(id));

// --- E-service (match per nome normalizzato) ---
const liveByName = new Map(live.eservices.map(e => [norm(e.nome), e]));
const prevByName = new Map(prev.eservices.map(e => [norm(e.nome), e]));
const esAdded = [...prevByName.keys()].filter(k => !liveByName.has(k));
const esRemoved = [...liveByName.keys()].filter(k => !prevByName.has(k));
const esCommon = [...prevByName.keys()].filter(k => liveByName.has(k));

// --- Connessioni per provenienza nell'anteprima ---
const byOrigine = { documentata: 0, certificata: 0, inferita: 0, altro: 0 };
for (const e of prev.eservices) {
  for (const a of (e.archi || [])) {
    if (byOrigine[a.origine] === undefined) byOrigine.altro++;
    else byOrigine[a.origine]++;
  }
}

// --- Per gli e-service in comune: confronto connessioni ---
let keptSameConn = 0, keptChangedConn = 0;
for (const k of esCommon) {
  const a = new Set(archiOf(liveByName.get(k)));
  const b = new Set(archiOf(prevByName.get(k)));
  const equal = a.size === b.size && [...a].every(x => b.has(x));
  if (equal) keptSameConn++; else keptChangedConn++;
}

line(`\n=== DIFF  live (curato)  →  anteprima (pipeline) ===\n`);
line(`                     LIVE      ANTEPRIMA`);
line(`Nodi             :   ${String(live.enti.length).padStart(4)}      ${prev.enti.length}`);
line(`E-service        :   ${String(live.eservices.length).padStart(4)}      ${prev.eservices.length}`);
line(`Connessioni      :   ${String(connCount(live)).padStart(4)}      ${connCount(prev)}`);

line(`\n--- Nodi ---`);
line(`Aggiunti (${nodesAdded.length}): ${nodesAdded.join(", ") || "—"}`);
line(`Rimossi  (${nodesRemoved.length}): ${nodesRemoved.join(", ") || "—"}`);

line(`\n--- E-service (match per nome) ---`);
line(`Presenti in entrambi : ${esCommon.length}`);
line(`Solo nell'anteprima  : ${esAdded.length}  (nuovi dal catalogo)`);
line(`Solo nel live curato : ${esRemoved.length}  (spariranno dal grafo)`);
if (esRemoved.length) line(`   → ${esRemoved.slice(0, 12).map(k => liveByName.get(k).nome).join("; ")}${esRemoved.length > 12 ? " …" : ""}`);

line(`\n--- E-service in comune: cosa succede alle connessioni ---`);
line(`Connessioni invariate : ${keptSameConn}`);
line(`Connessioni cambiate  : ${keptChangedConn}`);

line(`\n--- Provenienza delle connessioni nell'anteprima ---`);
line(`Documentata (curata/override): ${byOrigine.documentata}`);
line(`Certificata (dal catalogo)   : ${byOrigine.certificata}`);
line(`Inferita (stima AI)          : ${byOrigine.inferita}`);
if (byOrigine.altro) line(`Altro                        : ${byOrigine.altro}`);

const totPrev = byOrigine.documentata + byOrigine.certificata + byOrigine.inferita + byOrigine.altro;
const pctInf = totPrev ? ((100 * byOrigine.inferita) / totPrev).toFixed(0) : "0";
line(`\n=> Nell'anteprima, ${pctInf}% delle connessioni sono stime AI, non fatti documentati.`);
line(`=> Le ${connCount(live)} connessioni del grafo curato NON vengono riportate`);
line(`   nell'anteprima (la pipeline non le legge). Per conservarle vanno spostate`);
line(`   in connections-overrides.json, dove diventano provenienza "documentata".`);
line("");
