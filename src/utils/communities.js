/**
 * Comunità del grafo: gruppi di enti che si scambiano dati soprattutto fra loro.
 *
 * Metodo di Louvain (Blondel et al., 2008) sul grafo non orientato e pesato:
 * il peso di una coppia di enti è il numero di e-service che li collegano, in
 * una direzione o nell'altra. L'ordine di visita dei nodi è fisso (per id),
 * quindi lo stesso dato dà sempre le stesse comunità.
 *
 * La modularità Q misura quanto le comunità sono separate: 0 vuol dire nessuna
 * struttura oltre il caso, valori sopra 0,3 indicano gruppi netti.
 */

/** Pesi non orientati fra coppie di enti: numero di e-service che le collegano. */
export function pesiNonOrientati(data, { escludiAggregati = false } = {}) {
  const agg = new Set(data.enti.filter((e) => e.aggregato).map((e) => e.id));
  const ids = data.enti.map((e) => e.id).filter((id) => !(escludiAggregati && agg.has(id))).sort();
  const keep = new Set(ids);
  const pesi = new Map();
  for (const es of data.eservices) {
    if (!keep.has(es.erogatore)) continue;
    for (const f of new Set(es.fruitori)) {
      if (f === es.erogatore || !keep.has(f)) continue;
      const k = es.erogatore < f ? `${es.erogatore}\u0000${f}` : `${f}\u0000${es.erogatore}`;
      pesi.set(k, (pesi.get(k) || 0) + 1);
    }
  }
  const archi = [...pesi].map(([k, w]) => [...k.split("\u0000"), w]);
  return { nodi: ids, archi };
}

/** Modularità di una partizione (Map nodo → comunità) sul grafo dato. */
export function modularita(nodi, archi, comunita) {
  const m = archi.reduce((s, [, , w]) => s + w, 0);
  if (!m) return 0;
  const interni = new Map(), tot = new Map();
  for (const [a, b, w] of archi) {
    const ca = comunita.get(a), cb = comunita.get(b);
    tot.set(ca, (tot.get(ca) || 0) + w);
    tot.set(cb, (tot.get(cb) || 0) + w);
    if (ca === cb) interni.set(ca, (interni.get(ca) || 0) + w);
  }
  let q = 0;
  for (const [c, t] of tot) q += (interni.get(c) || 0) / m - (t / (2 * m)) ** 2;
  return q;
}

/**
 * Louvain: spostamenti locali che aumentano la modularità, poi aggregazione
 * delle comunità in nodi, finché nulla migliora. Restituisce la comunità di
 * ogni nodo (0 = la più numerosa) e la modularità finale. I nodi isolati
 * restano comunità a sé.
 */
export function louvain(nodi, archi) {
  // Grafo corrente: adiacenza con pesi, cappi a parte (peso interno).
  let adj = new Map(nodi.map((v) => [v, new Map()]));
  let cappio = new Map(nodi.map((v) => [v, 0]));
  for (const [a, b, w] of archi) {
    if (a === b) { cappio.set(a, cappio.get(a) + w); continue; }
    adj.get(a).set(b, (adj.get(a).get(b) || 0) + w);
    adj.get(b).set(a, (adj.get(b).get(a) || 0) + w);
  }
  const m2 = 2 * archi.reduce((s, [, , w]) => s + w, 0);
  // Membro originale → nodo del livello corrente.
  const appartiene = new Map(nodi.map((v) => [v, v]));
  if (!m2) return { comunita: new Map(nodi.map((v, i) => [v, i])), q: 0 };

  for (let livello = 0; livello < 20; livello++) {
    const vertici = [...adj.keys()];
    const grado = new Map(vertici.map((v) => [v, [...adj.get(v).values()].reduce((s, w) => s + w, 0) + 2 * cappio.get(v)]));
    const com = new Map(vertici.map((v) => [v, v]));
    const tot = new Map(vertici.map((v) => [v, grado.get(v)]));
    let mosso = false, migliora = true, giri = 0;
    while (migliora && giri++ < 100) {
      migliora = false;
      for (const v of vertici) {
        const cv = com.get(v), kv = grado.get(v);
        // Peso da v verso ciascuna comunità vicina.
        const verso = new Map();
        for (const [u, w] of adj.get(v)) verso.set(com.get(u), (verso.get(com.get(u)) || 0) + w);
        tot.set(cv, tot.get(cv) - kv);
        const guadagno = (c) => (verso.get(c) || 0) - (tot.get(c) * kv) / m2;
        let migliore = cv, best = guadagno(cv);
        for (const c of verso.keys()) {
          const g = guadagno(c);
          if (g > best + 1e-12) { best = g; migliore = c; }
        }
        tot.set(migliore, tot.get(migliore) + kv);
        if (migliore !== cv) { com.set(v, migliore); migliora = true; mosso = true; }
      }
    }
    if (!mosso) break;
    // Aggregazione: ogni comunità diventa un nodo.
    const nuovoAdj = new Map(), nuovoCappio = new Map();
    for (const c of new Set(com.values())) { nuovoAdj.set(c, new Map()); nuovoCappio.set(c, 0); }
    for (const v of vertici) {
      const cv = com.get(v);
      nuovoCappio.set(cv, nuovoCappio.get(cv) + cappio.get(v));
      for (const [u, w] of adj.get(v)) {
        const cu = com.get(u);
        if (cu === cv) nuovoCappio.set(cv, nuovoCappio.get(cv) + w / 2);
        else nuovoAdj.get(cv).set(cu, (nuovoAdj.get(cv).get(cu) || 0) + w);
      }
    }
    for (const [orig, v] of appartiene) appartiene.set(orig, com.get(v));
    adj = nuovoAdj;
    cappio = nuovoCappio;
  }

  // Comunità numerate per dimensione decrescente, a parità per primo id.
  const gruppi = new Map();
  for (const v of nodi) {
    const c = appartiene.get(v);
    if (!gruppi.has(c)) gruppi.set(c, []);
    gruppi.get(c).push(v);
  }
  const ordinati = [...gruppi.values()].sort((a, b) => b.length - a.length || a[0].localeCompare(b[0]));
  const comunita = new Map();
  ordinati.forEach((membri, i) => membri.forEach((v) => comunita.set(v, i)));
  return { comunita, q: modularita(nodi, archi, comunita) };
}

/** Comunità del modello, con i membri e il peso interno di ciascuna. */
export function comunitaDelModello(data, opzioni) {
  const { nodi, archi } = pesiNonOrientati(data, opzioni);
  const { comunita, q } = louvain(nodi, archi);
  const gruppi = [];
  for (const [v, c] of comunita) (gruppi[c] ||= { membri: [], interni: 0, esterni: 0 }).membri.push(v);
  for (const [a, b, w] of archi) {
    if (comunita.get(a) === comunita.get(b)) gruppi[comunita.get(a)].interni += w;
    else { gruppi[comunita.get(a)].esterni += w; gruppi[comunita.get(b)].esterni += w; }
  }
  return { comunita, q, gruppi };
}
