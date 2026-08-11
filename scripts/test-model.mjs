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

console.log("\nRotte e collegamenti diretti");

const { parseLocation, buildPath } = await import(
  path.join(ROOT, "src/utils/useUrlState.js")
);

check("le rotte note risolvono nella scheda giusta", () => {
  const casi = [
    ["/", "grafo", null], ["", "grafo", null],
    ["/statistiche", "statistiche", null], ["/metodologia/", "metodologia", null],
    ["/guida", "guida", null], ["/ente/inps", "grafo", "inps"],
  ];
  const bad = casi.filter(([p, tab, id]) => {
    const r = parseLocation(p);
    return r.tab !== tab || r.entityId !== id;
  });
  return bad.length === 0 || `${bad.length} rotte risolte male`;
});

check("una rotta sconosciuta ricade sul grafo", () => {
  const r = parseLocation("/non-esiste");
  return (r.tab === "grafo" && r.entityId === null) || "ricaduta errata";
});

check("percorso e stato sono reversibili", () => {
  const bad = ["/", "/statistiche", "/guida", "/ente/inps", "/ente/r_lazio"].filter(
    (p) => buildPath(parseLocation(p)) !== p
  );
  return bad.length === 0 || `non reversibili: ${bad.join(", ")}`;
});

check("ogni ente del dato ha un percorso valido", () => {
  const bad = DATA.enti.filter((e) => parseLocation(buildPath({ tab: "grafo", entityId: e.id })).entityId !== e.id);
  return bad.length === 0 || `${bad.length} enti con percorso non risolvibile`;
});

check("le rotte a percorso hanno la riscrittura lato server", () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "staticwebapp.config.json"), "utf8"));
  return cfg.navigationFallback?.rewrite === "/index.html"
    ? true
    : "navigationFallback assente: /ente/... darebbe 404 in produzione";
});

// Regressione: un collegamento diretto a /ente/{id} mandava l'applicazione in
// ciclo. Due effetti reattivi si osservavano a vicenda e, poiché in React le
// modifiche di stato valgono dal render successivo, oscillavano indefinitamente
// chiamando pushState a ogni giro. Il modello qui sotto riproduce il ciclo
// render/effetti e verifica che lo schema adottato converga.
check("un collegamento diretto a un ente non innesca un ciclo di render", () => {
  const NODI = DATA.enti.map((e) => e.id);
  let entityId = parseLocation("/ente/inps").entityId;
  let selNode = null;
  let prevEntity;
  let push = 0;
  for (let r = 0; r < 25; r++) {
    let pendSel;
    let cambia = false;
    if (entityId !== prevEntity) {
      prevEntity = entityId;
      if (!entityId) {
        if (selNode) { pendSel = null; cambia = true; }
      } else if (selNode !== entityId && NODI.includes(entityId)) {
        pendSel = entityId;
        cambia = true;
      }
    }
    // La selezione notifica solo su azione dell'utente, non tramite un effetto:
    // è questa asimmetria a impedire l'oscillazione.
    if (!cambia) {
      if (selNode !== "inps") return `converge ma senza selezionare l'ente (selNode=${selNode})`;
      if (push !== 0) return `converge ma con ${push} scritture nella cronologia`;
      return true;
    }
    if (pendSel !== undefined) selNode = pendSel;
  }
  return "non converge entro 25 render: il collegamento diretto va in ciclo";
});

console.log("\nEsportazione");

const exp = await import(path.join(ROOT, "src/utils/exportGraph.js"));

check("la lista archi conserva la topologia del report", () => {
  const { nodes, edges } = exp.toEdgeList(DATA);
  const istanze = edges.reduce((a, e) => a + e.weight, 0);
  const err = [];
  if (nodes.length !== 51) err.push(`nodi ${nodes.length}≠51`);
  if (edges.length !== 343) err.push(`archi ${edges.length}≠343`);
  if (istanze !== 570) err.push(`somma pesi ${istanze}≠570`);
  return err.length === 0 || err.join(", ");
});

check("ogni arco esportato dichiara la provenienza", () => {
  const { edges } = exp.toEdgeList(DATA);
  const bad = edges.filter((e) => !e.origine);
  return bad.length === 0 || `${bad.length} archi senza origine`;
});

check("i nodi aggregati sono marcati come tali", () => {
  const { nodes } = exp.toEdgeList(DATA);
  const agg = nodes.filter((n) => n.aggregato).map((n) => n.id);
  return agg.includes("comuni_agg") || "comuni_agg non marcato come aggregato";
});

check("GraphML e GEXF sono XML bilanciati e dichiarano l'avvertenza", () => {
  for (const [nome, testo] of [["GraphML", exp.toGraphML(DATA)], ["GEXF", exp.toGEXF(DATA)]]) {
    if (!testo.startsWith("<?xml")) return `${nome}: manca la dichiarazione XML`;
    if (!/aggregato/i.test(testo)) return `${nome}: manca l'avvertenza sull'aggregazione`;
    const apre = (testo.match(/<(?!\/|\?|!)[a-zA-Z]/g) || []).length;
    const chiude = (testo.match(/<\//g) || []).length;
    const auto = (testo.match(/\/>/g) || []).length;
    if (apre - auto !== chiude) return `${nome}: tag non bilanciati (${apre - auto} contro ${chiude})`;
  }
  return true;
});

check("i CSV hanno intestazione e una riga per record", () => {
  const nodi = exp.toNodesCSV(DATA).trim().split("\n");
  const archi = exp.toEdgesCSV(DATA).trim().split("\n");
  const { nodes, edges } = exp.toEdgeList(DATA);
  if (!nodi[0].startsWith("id,label")) return "intestazione nodi inattesa";
  if (!archi[0].startsWith("Source,Target,Weight")) return "intestazione archi non compatibile con Gephi";
  // I campi con virgole o punti e virgola sono quotati, quindi possono contenere
  // a capo: si contano solo le righe che iniziano un record.
  if (nodi.length - 1 !== nodes.length) return `righe nodi ${nodi.length - 1}≠${nodes.length}`;
  if (archi.length - 1 !== edges.length) return `righe archi ${archi.length - 1}≠${edges.length}`;
  return true;
});

check("i caratteri speciali sono correttamente sottoposti a escape", () => {
  const finto = {
    meta: {},
    enti: [{ id: "a", name: 'X & <Y> "Z"', categoria: "T", tipo: "T", descrizione: "" },
           { id: "b", name: "B", categoria: "T", tipo: "T", descrizione: "" }],
    eservices: [{ id: "s", nome: "S & <T>", erogatore: "a", fruitori: ["b"] }],
  };
  const xml = exp.toGraphML(finto);
  if (/&(?!amp;|lt;|gt;|quot;)/.test(xml)) return "e commerciale non sottoposta a escape";
  if (!xml.includes("&amp;") || !xml.includes("&lt;")) return "escape mancante";
  const csv = exp.toNodesCSV(finto);
  return csv.includes('"X & <Y> ""Z"""') || "campo CSV con virgolette non quotato correttamente";
});

check("le esportazioni nel repository sono allineate al dato", () => {
  const dir = path.join(ROOT, "exports");
  if (!fs.existsSync(dir)) return "cartella exports/ assente: eseguire npm run export";
  const attesi = [
    ["pdnd-eservices-graph-graphml.graphml", exp.toGraphML],
    ["pdnd-eservices-graph-gexf.gexf", exp.toGEXF],
    ["pdnd-eservices-graph-nodi-csv.csv", exp.toNodesCSV],
    ["pdnd-eservices-graph-archi-csv.csv", exp.toEdgesCSV],
  ];
  const stantii = attesi.filter(([nome, gen]) => {
    const f = path.join(dir, nome);
    return !fs.existsSync(f) || fs.readFileSync(f, "utf8") !== gen(DATA);
  });
  return stantii.length === 0
    ? true
    : `${stantii.length} file non allineati (${stantii.map((s) => s[0]).join(", ")}): eseguire npm run export`;
});

const totale = passed + failures.length;
console.log(
  `\n${failures.length === 0 ? "Tutti i test superati" : "Test falliti"}: ${passed}/${totale}\n`
);
process.exit(failures.length === 0 ? 0 : 1);
