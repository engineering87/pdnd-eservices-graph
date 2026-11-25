/**
 * Esportazione del modello in formati di interscambio standard.
 *
 * Il grafo è pubblicato come JSON specifico del progetto, che va interpretato
 * prima di poter essere analizzato. Queste funzioni lo traducono in GraphML,
 * GEXF e CSV, così può essere aperto direttamente in Gephi, NetworkX, igraph,
 * R o un foglio di calcolo.
 *
 * Criterio: l'esportazione porta con sé la provenienza e le avvertenze. Ogni
 * arco conserva il campo `origine`, ogni nodo dichiara se è aggregato, e i
 * metadati di grafo riportano fonte, licenze, data dello snapshot e il limite
 * dell'aggregazione. Un file che perdesse queste informazioni permetterebbe di
 * calcolare distribuzioni di grado e pubblicarle come misure dirette, che è
 * esattamente ciò che il modello non autorizza a fare.
 */

const AVVERTENZA =
  "Le coppie puntuali erogatore-fruitore non sono pubblicate come open data: gli " +
  "archi sono ricostruiti da documentazione pubblica, dal catalogo e dalle " +
  "statistiche ufficiali aggregate per categoria di ente. Il campo origine di " +
  "ogni arco ne dichiara la provenienza; connessioni e sessioni, dove presenti, " +
  "sono minimi garantiti. I nodi marcati aggregato=true rappresentano classi di " +
  "enti (per esempio circa 7.650 Comuni in un solo nodo, con il numero di " +
  "aderenti nel campo aderenti): le misure di grado su questo grafo non sono " +
  "confrontabili con quelle di un grafo non aggregato.";

const FONTE = "https://github.com/engineering87/pdnd-eservices-graph";
const DOI = "10.5281/zenodo.19989954";
const LICENZA = "Codice AGPL-3.0, dati di origine CC0 1.0 (italia/pdnd-opendata)";

/**
 * Data dello snapshot. Non ricade mai sull'ora corrente: una data variabile
 * renderebbe l'esportazione diversa a ogni esecuzione, e la riproducibilità
 * byte per byte è una proprietà che questo progetto deve poter garantire.
 */
function snapshot(data) {
  const m = data.meta || {};
  return m.ultimo_aggiornamento || m.snapshot_catalogo || m.generato || "non dichiarata";
}

/** Nodi dichiaratamente aggregati, da segnalare in ogni esportazione. */
const AGGREGATI = new Set(["comuni_agg", "regioni_agg"]);

/**
 * Riduce il modello a nodi e archi diretti pesati.
 * Il peso è il numero di e-service distinti che vanno da erogatore a fruitore,
 * coerente con la definizione del report pubblicato.
 */
export function toEdgeList(data) {
  const nodes = data.enti.map((e) => ({
    id: e.id,
    label: e.name,
    categoria: e.categoria || "",
    tipo: e.tipo || "",
    descrizione: e.descrizione || "",
    aggregato: Boolean(e.aggregato) || AGGREGATI.has(e.id),
    // Numero di aderenti della classe, solo per i nodi aggregati che lo dichiarano.
    aderenti: e.aderenti ?? "",
  }));

  const acc = new Map();
  for (const s of data.eservices) {
    const archi = s.archi || (s.fruitori || []).map((f) => ({ fruitore: f, origine: "ricostruita" }));
    for (const a of archi) {
      const key = `${s.erogatore}\u0000${a.fruitore}`;
      if (!acc.has(key)) {
        acc.set(key, { source: s.erogatore, target: a.fruitore, weight: 0, origini: new Set(), servizi: [], connessioni: 0, sessioni: 0 });
      }
      const e = acc.get(key);
      e.weight += 1;
      e.origini.add(a.origine || "ricostruita");
      e.servizi.push(s.nome);
      // Connessioni osservate: massimo fra gli e-service della coppia, perché lo
      // stesso ente fruitore può usarne più d'uno. Sessioni: si sommano.
      e.connessioni = Math.max(e.connessioni, a.connessioni || 0);
      e.sessioni += a.sessioni || 0;
    }
  }

  const edges = [...acc.values()].map((e, i) => ({
    id: `e${i}`,
    source: e.source,
    target: e.target,
    weight: e.weight,
    // Se una coppia è sostenuta da archi di provenienza diversa, le origini
    // sono elencate tutte: appiattirle su una sola perderebbe informazione.
    origine: [...e.origini].sort().join("|"),
    servizi: e.servizi.join("; "),
    connessioni: e.connessioni || "",
    sessioni: e.sessioni || "",
  }));

  return { nodes, edges };
}

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** GraphML: leggibile da Gephi, NetworkX, igraph, yEd. */
export function toGraphML(data) {
  const { nodes, edges } = toEdgeList(data);
  const generato = snapshot(data);
  const attrNodo = [
    ["n_label", "label", "string"],
    ["n_categoria", "categoria", "string"],
    ["n_tipo", "tipo", "string"],
    ["n_aggregato", "aggregato", "boolean"],
    ["n_aderenti", "aderenti", "long"],
    ["n_descrizione", "descrizione", "string"],
  ];
  const attrArco = [
    ["e_weight", "weight", "int"],
    ["e_origine", "origine", "string"],
    ["e_servizi", "servizi", "string"],
    ["e_connessioni", "connessioni", "long"],
    ["e_sessioni", "sessioni", "long"],
  ];

  const righe = [];
  righe.push('<?xml version="1.0" encoding="UTF-8"?>');
  righe.push('<graphml xmlns="http://graphml.graphdrawing.org/xmlns"');
  righe.push('         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
  righe.push('         xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns');
  righe.push('         http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd">');
  righe.push(`  <!-- PDND E-Services Graph. Fonte: ${FONTE} -->`);
  righe.push(`  <!-- DOI: ${DOI}. ${LICENZA}. Snapshot: ${generato} -->`);
  righe.push(`  <!-- ${AVVERTENZA} -->`);
  for (const [id, name, type] of attrNodo)
    righe.push(`  <key id="${id}" for="node" attr.name="${name}" attr.type="${type}"/>`);
  for (const [id, name, type] of attrArco)
    righe.push(`  <key id="${id}" for="edge" attr.name="${name}" attr.type="${type}"/>`);
  righe.push('  <key id="g_avvertenza" for="graph" attr.name="avvertenza" attr.type="string"/>');
  righe.push('  <key id="g_fonte" for="graph" attr.name="fonte" attr.type="string"/>');
  righe.push('  <key id="g_doi" for="graph" attr.name="doi" attr.type="string"/>');
  righe.push('  <graph id="PDND" edgedefault="directed">');
  righe.push(`    <data key="g_avvertenza">${esc(AVVERTENZA)}</data>`);
  righe.push(`    <data key="g_fonte">${esc(FONTE)}</data>`);
  righe.push(`    <data key="g_doi">${esc(DOI)}</data>`);
  for (const n of nodes) {
    righe.push(`    <node id="${esc(n.id)}">`);
    righe.push(`      <data key="n_label">${esc(n.label)}</data>`);
    righe.push(`      <data key="n_categoria">${esc(n.categoria)}</data>`);
    righe.push(`      <data key="n_tipo">${esc(n.tipo)}</data>`);
    righe.push(`      <data key="n_aggregato">${n.aggregato}</data>`);
    if (n.aderenti !== "") righe.push(`      <data key="n_aderenti">${n.aderenti}</data>`);
    righe.push(`      <data key="n_descrizione">${esc(n.descrizione)}</data>`);
    righe.push("    </node>");
  }
  for (const e of edges) {
    righe.push(`    <edge id="${e.id}" source="${esc(e.source)}" target="${esc(e.target)}">`);
    righe.push(`      <data key="e_weight">${e.weight}</data>`);
    righe.push(`      <data key="e_origine">${esc(e.origine)}</data>`);
    righe.push(`      <data key="e_servizi">${esc(e.servizi)}</data>`);
    if (e.connessioni !== "") righe.push(`      <data key="e_connessioni">${e.connessioni}</data>`);
    if (e.sessioni !== "") righe.push(`      <data key="e_sessioni">${e.sessioni}</data>`);
    righe.push("    </edge>");
  }
  righe.push("  </graph>");
  righe.push("</graphml>");
  return righe.join("\n");
}

/** GEXF: formato nativo di Gephi. */
export function toGEXF(data) {
  const { nodes, edges } = toEdgeList(data);
  const generato = String(snapshot(data)).slice(0, 10);
  const righe = [];
  righe.push('<?xml version="1.0" encoding="UTF-8"?>');
  righe.push('<gexf xmlns="http://gexf.net/1.3" version="1.3">');
  righe.push("  <meta lastmodifieddate=\"" + generato + "\">");
  righe.push("    <creator>PDND E-Services Graph</creator>");
  righe.push(`    <description>${esc(AVVERTENZA)}</description>`);
  righe.push("  </meta>");
  righe.push('  <graph mode="static" defaultedgetype="directed">');
  righe.push('    <attributes class="node">');
  righe.push('      <attribute id="0" title="categoria" type="string"/>');
  righe.push('      <attribute id="1" title="tipo" type="string"/>');
  righe.push('      <attribute id="2" title="aggregato" type="boolean"/>');
  righe.push('      <attribute id="3" title="aderenti" type="long"/>');
  righe.push("    </attributes>");
  righe.push('    <attributes class="edge">');
  righe.push('      <attribute id="0" title="origine" type="string"/>');
  righe.push('      <attribute id="1" title="servizi" type="string"/>');
  righe.push('      <attribute id="2" title="connessioni" type="long"/>');
  righe.push('      <attribute id="3" title="sessioni" type="long"/>');
  righe.push("    </attributes>");
  righe.push("    <nodes>");
  for (const n of nodes) {
    righe.push(`      <node id="${esc(n.id)}" label="${esc(n.label)}">`);
    righe.push("        <attvalues>");
    righe.push(`          <attvalue for="0" value="${esc(n.categoria)}"/>`);
    righe.push(`          <attvalue for="1" value="${esc(n.tipo)}"/>`);
    righe.push(`          <attvalue for="2" value="${n.aggregato}"/>`);
    if (n.aderenti !== "") righe.push(`          <attvalue for="3" value="${n.aderenti}"/>`);
    righe.push("        </attvalues>");
    righe.push("      </node>");
  }
  righe.push("    </nodes>");
  righe.push("    <edges>");
  for (const e of edges) {
    righe.push(`      <edge id="${e.id}" source="${esc(e.source)}" target="${esc(e.target)}" weight="${e.weight}">`);
    righe.push("        <attvalues>");
    righe.push(`          <attvalue for="0" value="${esc(e.origine)}"/>`);
    righe.push(`          <attvalue for="1" value="${esc(e.servizi)}"/>`);
    if (e.connessioni !== "") righe.push(`          <attvalue for="2" value="${e.connessioni}"/>`);
    if (e.sessioni !== "") righe.push(`          <attvalue for="3" value="${e.sessioni}"/>`);
    righe.push("        </attvalues>");
    righe.push("      </edge>");
  }
  righe.push("    </edges>");
  righe.push("  </graph>");
  righe.push("</gexf>");
  return righe.join("\n");
}

const csvCampo = (v) => {
  const s = String(v ?? "");
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csvRiga = (campi) => campi.map(csvCampo).join(",");

/** CSV dei nodi, con intestazione. */
export function toNodesCSV(data) {
  const { nodes } = toEdgeList(data);
  const righe = [csvRiga(["id", "label", "categoria", "tipo", "aggregato", "aderenti", "descrizione"])];
  for (const n of nodes)
    righe.push(csvRiga([n.id, n.label, n.categoria, n.tipo, n.aggregato, n.aderenti, n.descrizione]));
  return righe.join("\n");
}

/** CSV degli archi, con intestazione compatibile con Gephi (Source/Target/Weight). */
export function toEdgesCSV(data) {
  const { edges } = toEdgeList(data);
  const righe = [csvRiga(["Source", "Target", "Weight", "Type", "origine", "connessioni", "sessioni", "servizi"])];
  for (const e of edges)
    righe.push(csvRiga([e.source, e.target, e.weight, "Directed", e.origine, e.connessioni, e.sessioni, e.servizi]));
  return righe.join("\n");
}

/** Formati disponibili, usati sia dall'interfaccia sia dallo script di build. */
export const FORMATI = [
  { id: "graphml", etichetta: "GraphML", estensione: "graphml", mime: "application/xml", nota: "Gephi, NetworkX, igraph", genera: toGraphML },
  { id: "gexf", etichetta: "GEXF", estensione: "gexf", mime: "application/xml", nota: "Formato nativo di Gephi", genera: toGEXF },
  { id: "nodi-csv", etichetta: "CSV nodi", estensione: "csv", mime: "text/csv", nota: "Fogli di calcolo, R, pandas", genera: toNodesCSV },
  { id: "archi-csv", etichetta: "CSV archi", estensione: "csv", mime: "text/csv", nota: "Fogli di calcolo, R, pandas", genera: toEdgesCSV },
  { id: "json", etichetta: "JSON", estensione: "json", mime: "application/json", nota: "Modello canonico del progetto", genera: (d) => JSON.stringify(d, null, 2) },
];
