#!/usr/bin/env node
/**
 * test-model.mjs
 * ──────────────
 * Test di integrità del dato e di comportamento di buildGraph.
 * Non scarica nulla: gira offline su src/data/pdnd-data.json.
 *
 * Uso:   npm test
 * Exit:  0 se tutti i test passano, 1 al primo fallimento.
 *
 * Copre in particolare la regressione della provenienza: il dato curato (v1)
 * non porta il campo `archi`, quindi buildGraph applica un fallback. Quel
 * fallback NON deve dichiarare gli archi come "certificata", perché non sono
 * derivati dal campo attributes del catalogo ma ricostruiti da documentazione.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const DATA = JSON.parse(
  fs.readFileSync(path.join(ROOT, "src/data/pdnd-data.json"), "utf8")
);

// buildGraph è un modulo ES con export nominato: lo importiamo direttamente.
const { buildGraph } = await import(
  path.join(ROOT, "src/utils/buildGraph.js")
);

let passed = 0;
const failures = [];

function check(name, fn) {
  try {
    const res = fn();
    if (res === true || res === undefined) {
      passed++;
      console.log(`  ok   ${name}`);
    } else {
      failures.push(`${name}: ${res}`);
      console.log(`  FAIL ${name}: ${res}`);
    }
  } catch (err) {
    failures.push(`${name}: ${err.message}`);
    console.log(`  FAIL ${name}: ${err.message}`);
  }
}

console.log("\nIntegrità del dato (src/data/pdnd-data.json)");

const ids = new Set(DATA.enti.map((e) => e.id));

check("ogni ente ha id, name e categoria", () => {
  const bad = DATA.enti.filter((e) => !e.id || !e.name || !e.categoria);
  return bad.length === 0 || `${bad.length} enti incompleti`;
});

check("gli id degli enti sono unici", () => {
  return ids.size === DATA.enti.length || "id duplicati fra gli enti";
});

check("gli id degli e-service sono unici", () => {
  const seen = new Set();
  const dup = DATA.eservices.filter((s) => (seen.has(s.id) ? true : (seen.add(s.id), false)));
  return dup.length === 0 || `${dup.length} id duplicati`;
});

check("ogni erogatore risolve a un ente esistente", () => {
  const bad = DATA.eservices.filter((s) => !ids.has(s.erogatore));
  return bad.length === 0 || `${bad.length} e-service con erogatore ignoto`;
});

check("ogni fruitore risolve a un ente esistente", () => {
  const bad = [];
  DATA.eservices.forEach((s) =>
    (s.fruitori || []).forEach((f) => { if (!ids.has(f)) bad.push(`${s.id}→${f}`); })
  );
  return bad.length === 0 || `${bad.length} riferimenti pendenti: ${bad.slice(0, 3).join(", ")}`;
});

check("nessun auto-anello (erogatore uguale a fruitore)", () => {
  const bad = [];
  DATA.eservices.forEach((s) =>
    (s.fruitori || []).forEach((f) => { if (f === s.erogatore) bad.push(s.id); })
  );
  return bad.length === 0 || `${bad.length} auto-anelli: ${bad.slice(0, 3).join(", ")}`;
});

check("nessun fruitore ripetuto nello stesso e-service", () => {
  const bad = DATA.eservices.filter(
    (s) => new Set(s.fruitori || []).size !== (s.fruitori || []).length
  );
  return bad.length === 0 || `${bad.length} e-service con fruitori duplicati`;
});

check("nessun nodo orfano (ogni ente compare in almeno un arco)", () => {
  const used = new Set();
  DATA.eservices.forEach((s) => {
    used.add(s.erogatore);
    (s.fruitori || []).forEach((f) => used.add(f));
  });
  const orfani = DATA.enti.filter((e) => !used.has(e.id)).map((e) => e.id);
  return orfani.length === 0 || `${orfani.length} orfani: ${orfani.join(", ")}`;
});

check("il meta dichiara la fonte delle connessioni", () => {
  return (
    (DATA.meta && DATA.meta.fonte_connessioni && DATA.meta.note_connessioni)
      ? true
      : "meta.fonte_connessioni o meta.note_connessioni mancante"
  );
});

console.log("\nComportamento di buildGraph");

const graph = buildGraph(DATA);
const ORIGINI_VALIDE = new Set(["documentata", "certificata", "ricostruita", "inferita"]);

check("restituisce nodes, links e linkCounts", () => {
  return (
    Array.isArray(graph.nodes) && Array.isArray(graph.links) && graph.linkCounts
      ? true
      : "struttura di ritorno inattesa"
  );
});

check("un nodo per ogni ente", () => {
  return graph.nodes.length === DATA.enti.length ||
    `${graph.nodes.length} nodi contro ${DATA.enti.length} enti`;
});

check("un link per ogni istanza erogatore→fruitore", () => {
  const atteso = DATA.eservices.reduce((a, s) => a + (s.fruitori || []).length, 0);
  return graph.links.length === atteso ||
    `${graph.links.length} link contro ${atteso} attesi`;
});

check("ogni link porta un'origine valida", () => {
  const bad = graph.links.filter((l) => !ORIGINI_VALIDE.has(l.origine));
  return bad.length === 0 ||
    `${bad.length} link con origine non prevista (es. "${bad[0]?.origine}")`;
});

// Regressione: il dato v1 non ha `archi`, quindi tutti i link nascono dal
// fallback. Etichettarli "certificata" affermerebbe una derivazione dal campo
// attributes del catalogo che non è mai avvenuta.
check('il fallback non dichiara gli archi "certificata"', () => {
  const senzaArchi = DATA.eservices.filter((s) => !s.archi);
  if (senzaArchi.length === 0) return true; // il dato porta già la provenienza
  const nomi = new Set(senzaArchi.map((s) => s.nome));
  const daFallback = graph.links.filter((l) => nomi.has(l.eservice));
  const certificati = daFallback.filter((l) => l.origine === "certificata");
  return certificati.length === 0 ||
    `${certificati.length} archi ricostruiti dichiarati "certificata"`;
});

check("nessun link punta a un nodo inesistente", () => {
  const bad = graph.links.filter((l) => !ids.has(l.source) || !ids.has(l.target));
  return bad.length === 0 || `${bad.length} link pendenti`;
});

check("il peso è simmetrico per la coppia non ordinata", () => {
  const bad = graph.links.filter((l) => {
    const key = [l.source, l.target].sort().join("--");
    return l.weight !== graph.linkCounts[key];
  });
  return bad.length === 0 || `${bad.length} link con peso incoerente`;
});

check("ogni peso è un intero positivo", () => {
  const bad = graph.links.filter(
    (l) => !Number.isInteger(l.weight) || l.weight < 1
  );
  return bad.length === 0 || `${bad.length} pesi non validi`;
});

console.log("\nCoerenza con le metriche pubblicate");

check("la topologia corrisponde al report (51 nodi, 86 e-service, 343 archi)", () => {
  const distinti = new Set();
  DATA.eservices.forEach((s) =>
    (s.fruitori || []).forEach((f) => distinti.add(`${s.erogatore}->${f}`))
  );
  const err = [];
  if (DATA.enti.length !== 51) err.push(`nodi ${DATA.enti.length}≠51`);
  if (DATA.eservices.length !== 86) err.push(`e-service ${DATA.eservices.length}≠86`);
  if (distinti.size !== 343) err.push(`archi distinti ${distinti.size}≠343`);
  return err.length === 0 || err.join(", ");
});

const totale = passed + failures.length;
console.log(
  `\n${failures.length === 0 ? "Tutti i test superati" : "Test falliti"}: ${passed}/${totale}\n`
);
process.exit(failures.length === 0 ? 0 : 1);
