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
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const DATA = JSON.parse(
  fs.readFileSync(path.join(ROOT, "src/data/pdnd-data.json"), "utf8")
);

// Istantanea congelata del modello v1 descritto nel report Zenodo
// (10.5281/zenodo.19989954). Il dato live evolve; questa no.
const V1 = JSON.parse(
  fs.readFileSync(path.join(ROOT, "src/data/snapshots/pdnd-data.2026-05-02.json"), "utf8")
);

// buildGraph è un modulo ES con export nominato: lo importiamo direttamente.
const { buildGraph } = await import(
  pathToFileURL(path.join(ROOT, "src/utils/buildGraph.js")).href
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

// Un arco "osservata" afferma una fruizione reale: deve portare il dato ufficiale
// che lo prova (enti abilitati o sessioni di scambio), altrimenti è un'affermazione
// senza fonte.
check("ogni arco osservato riporta connessioni o sessioni", () => {
  const bad = DATA.eservices.flatMap((s) => (s.archi || [])
    .filter((a) => a.origine === "osservata" && !(a.connessioni > 0) && !(a.sessioni > 0))
    .map((a) => `${s.id}->${a.fruitore}`));
  return bad.length === 0 || `${bad.length} archi osservati senza dato (es. ${bad[0]})`;
});

check("ogni nodo di classe dichiara il numero di aderenti e la fonte", () => {
  const bad = DATA.enti.filter((e) => e.aggregato && !(e.aderenti > 0 && e.aderenti_fonte)).map((e) => e.id);
  return bad.length === 0 || `nodi aggregati senza aderenti: ${bad.join(", ")}`;
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
const ORIGINI_VALIDE = new Set(["documentata", "osservata", "certificata", "ricostruita", "inferita"]);

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

check("l'istantanea v1 corrisponde al report (51 nodi, 86 e-service, 343 archi)", () => {
  const distinti = new Set();
  V1.eservices.forEach((s) =>
    (s.fruitori || []).forEach((f) => distinti.add(`${s.erogatore}->${f}`))
  );
  const err = [];
  if (V1.enti.length !== 51) err.push(`nodi ${V1.enti.length}≠51`);
  if (V1.eservices.length !== 86) err.push(`e-service ${V1.eservices.length}≠86`);
  if (distinti.size !== 343) err.push(`archi distinti ${distinti.size}≠343`);
  return err.length === 0 || err.join(", ");
});

// Il modello live deve conservare ogni relazione del modello v1: le coppie
// erogatore→fruitore e i nodi del report non possono sparire con un aggiornamento.
check("il dato live conserva tutte le relazioni e i nodi del modello v1", () => {
  const coppie = (d) => new Set(d.eservices.flatMap((s) => (s.fruitori || []).map((f) => `${s.erogatore}->${f}`)));
  const live = coppie(DATA);
  const perse = [...coppie(V1)].filter((c) => !live.has(c));
  const nodi = new Set(DATA.enti.map((e) => e.id));
  const nodiPersi = V1.enti.filter((e) => !nodi.has(e.id)).map((e) => e.id);
  const err = [];
  if (perse.length) err.push(`${perse.length} coppie v1 perse (es. ${perse[0]})`);
  if (nodiPersi.length) err.push(`nodi v1 persi: ${nodiPersi.join(", ")}`);
  return err.length === 0 || err.join("; ");
});

console.log("\nRotte e collegamenti diretti");

const { parseLocation, buildPath } = await import(
  pathToFileURL(path.join(ROOT, "src/utils/useUrlState.js")).href
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

const exp = await import(pathToFileURL(path.join(ROOT, "src/utils/exportGraph.js")).href);

check("la lista archi conserva la topologia del report (istantanea v1)", () => {
  const { nodes, edges } = exp.toEdgeList(V1);
  const istanze = edges.reduce((a, e) => a + e.weight, 0);
  const err = [];
  if (nodes.length !== 51) err.push(`nodi ${nodes.length}≠51`);
  if (edges.length !== 343) err.push(`archi ${edges.length}≠343`);
  if (istanze !== 570) err.push(`somma pesi ${istanze}≠570`);
  return err.length === 0 || err.join(", ");
});

check("la lista archi del dato live è coerente con il dato", () => {
  const { nodes, edges } = exp.toEdgeList(DATA);
  const coppie = new Set(DATA.eservices.flatMap((s) => (s.fruitori || []).map((f) => `${s.erogatore}->${f}`)));
  const istanze = DATA.eservices.reduce((a, s) => a + (s.fruitori || []).length, 0);
  const pesi = edges.reduce((a, e) => a + e.weight, 0);
  const err = [];
  if (nodes.length !== DATA.enti.length) err.push(`nodi ${nodes.length}≠${DATA.enti.length}`);
  if (edges.length !== coppie.size) err.push(`archi ${edges.length}≠${coppie.size}`);
  if (pesi !== istanze) err.push(`somma pesi ${pesi}≠${istanze}`);
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

console.log("\nEsplora e analisi di rete (relations.js, networkMetrics.js)");

const rel = await import(pathToFileURL(path.join(ROOT, "src/utils/relations.js")).href);
const net = await import(pathToFileURL(path.join(ROOT, "src/utils/networkMetrics.js")).href);
const RIGHE = rel.flattenRelations(DATA);

check("una riga per ogni arco del modello", () => {
  const archi = DATA.eservices.reduce((a, s) => a + (s.archi || s.fruitori).length, 0);
  return RIGHE.length === archi || `${RIGHE.length} righe, ${archi} archi`;
});

check("i filtri restringono senza perdere righe valide", () => {
  const f = rel.filterRelations(RIGHE, { erogatore: "inps", origini: ["osservata", "certificata"] });
  if (!f.length) return "nessuna riga per INPS";
  if (f.some((r) => r.erogatore !== "inps" || !["osservata", "certificata"].includes(r.origine))) return "riga fuori filtro";
  const attese = RIGHE.filter((r) => r.erogatore === "inps" && ["osservata", "certificata"].includes(r.origine)).length;
  return f.length === attese || `${f.length} invece di ${attese}`;
});

check("la ricerca ignora maiuscole e accenti", () => {
  const a = rel.filterRelations(RIGHE, { q: "anpr" }).length;
  const b = rel.filterRelations(RIGHE, { q: "ANPR" }).length;
  return (a > 0 && a === b) || `risultati diversi: ${a} / ${b}`;
});

check("i raggruppamenti sommano al totale delle righe", () => {
  for (const per of Object.keys(rel.RAGGRUPPAMENTI)) {
    const tot = rel.groupRelations(RIGHE, per).reduce((a, g) => a + g.relazioni, 0);
    if (tot !== RIGHE.length) return `${per}: ${tot} invece di ${RIGHE.length}`;
  }
  return true;
});

check("il CSV delle relazioni ha una riga per relazione più l'intestazione", () => {
  const righe = rel.relationsToCSV(RIGHE.slice(0, 20)).trim().split("\n");
  return righe.length === 21 || `${righe.length} righe`;
});

check("gli archi distinti coincidono con la definizione della densità", () => {
  const adj = net.distinctAdjacency(DATA);
  const coppie = new Set();
  DATA.eservices.forEach((s) => s.fruitori.forEach((f) => f !== s.erogatore && coppie.add(`${s.erogatore}->${f}`)));
  const tot = [...adj.values()].reduce((a, s) => a + s.size, 0);
  return tot === coppie.size || `${tot} invece di ${coppie.size}`;
});

check("betweenness corretta su un grafo noto (catena a→b→c)", () => {
  const adj = new Map([["a", new Set(["b"])], ["b", new Set(["c"])], ["c", new Set()]]);
  const bc = net.betweenness(adj);
  // Un solo cammino a→c passa da b; normalizzazione (n-1)(n-2) = 2.
  return (bc.get("b") === 0.5 && bc.get("a") === 0 && bc.get("c") === 0) || JSON.stringify([...bc]);
});

check("reciprocità corretta su un grafo noto", () => {
  const adj = new Map([["a", new Set(["b"])], ["b", new Set(["a", "c"])], ["c", new Set()]]);
  return net.reciprocity(adj) === 2 / 3 || String(net.reciprocity(adj));
});

console.log("\nAndamenti della piattaforma (meta.piattaforma)");

check("le serie mensili sono ordinate, positive e coerenti con i totali", () => {
  const p = DATA.meta.piattaforma;
  if (!p) return "meta.piattaforma assente: rigenerare l'anteprima con la pipeline";
  for (const [nome, s] of [["aderenti", p.aderenti.serie], ["sessioni", p.sessioni.serie]]) {
    if (!s.length) return `serie ${nome} vuota`;
    for (let i = 1; i < s.length; i++) if (s[i][0] <= s[i - 1][0]) return `serie ${nome} non ordinata a ${s[i][0]}`;
    if (s.some(([, v]) => !(v >= 0))) return `valori non validi nella serie ${nome}`;
  }
  const a = p.aderenti.serie;
  for (let i = 1; i < a.length; i++) if (a[i][1] < a[i - 1][1]) return `aderenti cumulati in calo a ${a[i][0]}`;
  const somma = p.sessioni.serie.reduce((t, [, v]) => t + v, 0);
  // Il totale ufficiale include anche i giorni dopo l'ultimo scaglione mensile.
  return (somma <= p.sessioni.totale * 1.001 && somma > p.sessioni.totale * .9) || `somma mensile ${somma} vs totale ${p.sessioni.totale}`;
});

check("l'andamento recente per e-service è coerente", () => {
  for (const s of DATA.eservices) {
    if (s.sessioni_6m != null && s.sessioni_12m != null && s.sessioni_6m > s.sessioni_12m) return `${s.id}: 6 mesi oltre i 12 mesi`;
    if (s.tendenza_6m != null && (s.sessioni_12m == null || s.sessioni_6m == null)) return `${s.id}: tendenza senza le sessioni delle due finestre`;
    if (s.tendenza_6m != null && !(s.tendenza_6m >= -100)) return `${s.id}: tendenza non valida (${s.tendenza_6m})`;
  }
  return true;
});

console.log("\nConfronto fra date (compare.js e istantanee)");

const cmp = await import(pathToFileURL(path.join(ROOT, "src/utils/compare.js")).href);
const SNAP_DIR = path.join(ROOT, "src/data/snapshots");
const istantanee = fs.readdirSync(SNAP_DIR).filter((f) => cmp.dataIstantanea(f)).sort();

check("un modello confrontato con se stesso non ha differenze", () => {
  const r = cmp.compareModels(DATA, DATA);
  const vuote = ["entiAggiunti", "entiRimossi", "esAggiunti", "esRimossi", "legamiAggiunti", "legamiRimossi", "sessioni"].every((k) => r[k].length === 0);
  return vuote || "differenze trovate confrontando il dato con se stesso";
});

check("aggiunte e rimozioni sono coerenti con i totali", () => {
  const prec = istantanee.filter((f) => f !== "pdnd-data.2026-05-02.json").at(-1);
  if (!prec) return "nessuna istantanea mensile in src/data/snapshots";
  const A = JSON.parse(fs.readFileSync(path.join(SNAP_DIR, prec), "utf8"));
  const r = cmp.compareModels(A, DATA);
  const [la, lb] = r.totali.legami;
  if (lb - la !== r.legamiAggiunti.length - r.legamiRimossi.length) return `legami: ${la}→${lb} ma +${r.legamiAggiunti.length} −${r.legamiRimossi.length}`;
  return true;
});

check("ogni istantanea è un modello valido con la sua data", () => {
  for (const f of istantanee) {
    const d = JSON.parse(fs.readFileSync(path.join(SNAP_DIR, f), "utf8"));
    if (!d.enti?.length || !d.eservices?.length) return `${f}: vuota`;
    const ids = new Set(d.enti.map((e) => e.id));
    const rotto = d.eservices.find((s) => !ids.has(s.erogatore) || s.fruitori.some((x) => !ids.has(x)));
    if (rotto) return `${f}: riferimento a un ente inesistente in ${rotto.id}`;
  }
  return true;
});

console.log("\nDisposizione della mappa (layout.js)");

const lay = await import(pathToFileURL(path.join(ROOT, "src/utils/layout.js")).href);

check("la disposizione è compatta e senza nodi scagliati lontano", () => {
  const g = buildGraph(DATA);
  const cx = 480, cy = 350;
  g.nodes.forEach((n) => { const [u, v] = lay.posizioneDaId(n.id); n.x = cx + (u - .5) * 500; n.y = cy + (v - .5) * 400; });
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  const links = g.links.map((l) => ({ ...l, source: byId.get(l.source), target: byId.get(l.target) }));
  const sim = lay.mkSim(g.nodes, links, cx, cy);
  for (let i = 0; i < 320; i++) sim.tick();
  const dist = g.nodes.map((n) => Math.hypot(n.x - cx, n.y - cy)).sort((a, b) => a - b);
  const mediana = dist[Math.floor(dist.length / 2)], massima = dist.at(-1);
  if (g.nodes.some((n) => !Number.isFinite(n.x) || !Number.isFinite(n.y))) return "posizioni non finite";
  return massima < mediana * 3 || `nodo a ${Math.round(massima)} dal centro, mediana ${Math.round(mediana)}`;
});

check("le posizioni iniziali sono stabili e distribuite", () => {
  const a = lay.posizioneDaId("inps"), b = lay.posizioneDaId("inps");
  if (a[0] !== b[0] || a[1] !== b[1]) return "posizione non deterministica";
  const tutte = DATA.enti.map((e) => lay.posizioneDaId(e.id));
  return tutte.every(([u, v]) => u >= 0 && u < 1 && v >= 0 && v < 1) || "valori fuori da [0, 1)";
});

console.log("\nFormattazione (format.js)");

const fmtMod = await import(pathToFileURL(path.join(ROOT, "src/utils/format.js")).href);

check("numeri con separatore delle migliaia anche a 4 cifre", () => {
  const casi = [[9826, "9.826"], [15291, "15.291"], [7, "7"], [null, "—"]];
  const ko = casi.filter(([n, atteso]) => fmtMod.numero(n) !== atteso);
  return ko.length === 0 || ko.map(([n]) => `${n} → ${fmtMod.numero(n)}`).join(", ");
});

check("abbreviazioni e date in italiano", () => {
  const casi = [
    [fmtMod.breve(861909182), "861,9 M"], [fmtMod.compatto(1872260806), "1,87 mld"],
    [fmtMod.compatto(76308615), "76,3 mln"], [fmtMod.dataLunga("2026-11-24"), "24 novembre 2026"],
    [fmtMod.meseAnno("2026-06-24"), "giu 2026"],
  ];
  const ko = casi.filter(([a, b]) => a !== b);
  return ko.length === 0 || ko.map(([a, b]) => `${a} invece di ${b}`).join(", ");
});

console.log("\nRotte (useUrlState.js)");

const rotte = await import(pathToFileURL(path.join(ROOT, "src/utils/useUrlState.js")).href);

check("le rotte si leggono e si riscrivono senza perdite", () => {
  const casi = ["/", "/esplora", "/statistiche", "/ente/inps", `/eservice/${DATA.eservices[0].id}`];
  for (const p of casi) {
    const back = rotte.buildPath(rotte.parseLocation(p));
    if (back !== p) return `${p} → ${back}`;
  }
  return true;
});

check("la rotta di un e-service porta l'id e la scheda giusta", () => {
  const s = rotte.parseLocation("/eservice/pagopa_cfc8a94d");
  return (s.tab === "eservice" && s.eserviceId === "pagopa_cfc8a94d" && s.entityId === null) || JSON.stringify(s);
});

check("ogni e-service ha un id utilizzabile come rotta", () => {
  const rotti = DATA.eservices.filter((s) => rotte.parseLocation(rotte.buildPath({ tab: "eservice", eserviceId: s.id })).eserviceId !== s.id);
  return rotti.length === 0 || rotti.map((s) => s.id).slice(0, 5).join(", ");
});

const totale = passed + failures.length;
console.log(
  `\n${failures.length === 0 ? "Tutti i test superati" : "Test falliti"}: ${passed}/${totale}\n`
);
process.exit(failures.length === 0 ? 0 : 1);
