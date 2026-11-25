/**
 * Misure di rete sul grafo degli archi distinti erogatore → fruitore, la stessa
 * definizione usata per la densità e nel report.
 *
 * Vanno lette sul modello: i nodi di classe rappresentano molti enti, quindi le
 * misure non sono confrontabili con quelle di un grafo in cui ogni ente è un
 * nodo. Per questo le funzioni accettano di escludere i nodi aggregati.
 */

/** Archi distinti del modello, come mappa id → insieme dei successori. */
export function distinctAdjacency(data, { escludiAggregati = false } = {}) {
  const agg = new Set(data.enti.filter((e) => e.aggregato).map((e) => e.id));
  const ids = data.enti.map((e) => e.id).filter((id) => !(escludiAggregati && agg.has(id)));
  const keep = new Set(ids);
  const adj = new Map(ids.map((id) => [id, new Set()]));
  for (const es of data.eservices) {
    if (!keep.has(es.erogatore)) continue;
    for (const f of es.fruitori) {
      if (f !== es.erogatore && keep.has(f)) adj.get(es.erogatore).add(f);
    }
  }
  return adj;
}

/** Grado in uscita e in entrata di ogni nodo. */
export function degrees(adj) {
  const out = new Map(), inn = new Map();
  for (const id of adj.keys()) { out.set(id, 0); inn.set(id, 0); }
  for (const [a, succ] of adj) {
    out.set(a, succ.size);
    for (const b of succ) inn.set(b, inn.get(b) + 1);
  }
  return { out, inn };
}

/** Quota di archi a→b per cui esiste anche b→a. */
export function reciprocity(adj) {
  let tot = 0, rec = 0;
  for (const [a, succ] of adj) {
    for (const b of succ) {
      tot++;
      if (adj.get(b)?.has(a)) rec++;
    }
  }
  return tot ? rec / tot : 0;
}

/**
 * Centralità di intermediazione (betweenness) sui cammini minimi diretti, non
 * pesati, con l'algoritmo di Brandes. Normalizzata su (n-1)(n-2), il massimo
 * per un grafo diretto: 1 significa che il nodo sta su tutti i cammini minimi
 * fra ogni altra coppia.
 */
export function betweenness(adj) {
  const nodes = [...adj.keys()];
  const cb = new Map(nodes.map((v) => [v, 0]));
  for (const s of nodes) {
    const stack = [];
    const pred = new Map(nodes.map((v) => [v, []]));
    const sigma = new Map(nodes.map((v) => [v, 0]));
    const dist = new Map(nodes.map((v) => [v, -1]));
    sigma.set(s, 1);
    dist.set(s, 0);
    const queue = [s];
    for (let i = 0; i < queue.length; i++) {
      const v = queue[i];
      stack.push(v);
      for (const w of adj.get(v)) {
        if (dist.get(w) < 0) { dist.set(w, dist.get(v) + 1); queue.push(w); }
        if (dist.get(w) === dist.get(v) + 1) { sigma.set(w, sigma.get(w) + sigma.get(v)); pred.get(w).push(v); }
      }
    }
    const delta = new Map(nodes.map((v) => [v, 0]));
    while (stack.length) {
      const w = stack.pop();
      for (const v of pred.get(w)) delta.set(v, delta.get(v) + (sigma.get(v) / sigma.get(w)) * (1 + delta.get(w)));
      if (w !== s) cb.set(w, cb.get(w) + delta.get(w));
    }
  }
  const n = nodes.length;
  const norm = n > 2 ? (n - 1) * (n - 2) : 1;
  for (const v of nodes) cb.set(v, cb.get(v) / norm);
  return cb;
}

/** Istogramma dei gradi: array di [grado, numero di nodi], per classi di ampiezza `passo`. */
export function degreeHistogram(degreeMap, passo = 5) {
  const max = Math.max(0, ...degreeMap.values());
  const bins = Array.from({ length: Math.floor(max / passo) + 1 }, (_, i) => [i * passo, 0]);
  for (const d of degreeMap.values()) bins[Math.floor(d / passo)][1]++;
  return bins;
}

/**
 * Matrice erogatore × fruitore aggregata per colonne: per ogni erogatore e ogni
 * colonna, il numero di e-service distinti e la somma delle sessioni osservate.
 * `colonnaDi(id)` assegna un fruitore a una colonna (o null per escluderlo).
 */
export function providerMatrix(data, erogatori, colonnaDi) {
  const m = new Map(erogatori.map((id) => [id, new Map()]));
  for (const es of data.eservices) {
    const riga = m.get(es.erogatore);
    if (!riga) continue;
    const archi = es.archi || es.fruitori.map((f) => ({ fruitore: f }));
    const visti = new Set();
    for (const a of archi) {
      const col = colonnaDi(a.fruitore);
      if (col == null) continue;
      if (!riga.has(col)) riga.set(col, { eservice: 0, sessioni: 0 });
      const cella = riga.get(col);
      if (!visti.has(col)) { cella.eservice++; visti.add(col); }
      if (a.sessioni) cella.sessioni += a.sessioni;
    }
  }
  return m;
}
