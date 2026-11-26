/**
 * Misure di rete di un'istantanea del modello, per seguirne l'andamento nel
 * tempo. Le calcola scripts/export-graph.mjs su ogni istantanea mensile e sul
 * grafo attuale, e le scrive in src/data/network-history.json: l'applicazione
 * legge quel file piccolo invece di scaricare tutte le istantanee.
 *
 * Tutte le misure usano gli archi distinti erogatore → fruitore, come la
 * densità della scheda Numeri; le comunità usano il grafo non orientato pesato
 * per numero di e-service (src/utils/communities.js).
 */

import { distinctAdjacency, degrees, reciprocity, betweenness } from "./networkMetrics.js";
import { comunitaDelModello } from "./communities.js";

const arrotonda = (x, cifre = 4) => Math.round(x * 10 ** cifre) / 10 ** cifre;

export function misureDiRete(data) {
  const adj = distinctAdjacency(data);
  const n = adj.size;
  const archi = [...adj.values()].reduce((s, x) => s + x.size, 0);
  const { out } = degrees(adj);
  const gradi = [...out.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const primiTre = gradi.slice(0, 3).reduce((s, [, d]) => s + d, 0);
  const cb = [...betweenness(adj).entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const { q, gruppi } = comunitaDelModello(data);
  return {
    nodi: n,
    eservice: data.eservices.length,
    archi,
    densita: arrotonda(n > 1 ? archi / (n * (n - 1)) : 0),
    reciprocita: arrotonda(reciprocity(adj)),
    erogatori: gradi.filter(([, d]) => d > 0).length,
    quota_primi_3: arrotonda(archi ? primiTre / archi : 0),
    primi_3: gradi.slice(0, 3).map(([id]) => id),
    ponte: cb[0] ? { id: cb[0][0], valore: arrotonda(cb[0][1]) } : null,
    comunita: gruppi.filter((g) => g.membri.length > 1).length,
    modularita: arrotonda(q),
  };
}

/**
 * Serie storica: una riga per istantanea, più il grafo attuale se è più
 * recente. `istantanee` è un array di { data, modello }. Il modello v1 del
 * report segue regole diverse e resta fuori dalla serie.
 */
export function serieStorica(istantanee, attuale, { escludi = ["2026-05-02"] } = {}) {
  const righe = istantanee
    .filter((x) => !escludi.includes(x.data))
    .sort((a, b) => a.data.localeCompare(b.data))
    .map((x) => ({ data: x.data, ...misureDiRete(x.modello) }));
  const oggi = attuale.meta?.ultimo_aggiornamento;
  if (oggi && !righe.some((r) => r.data === oggi)) righe.push({ data: oggi, attuale: true, ...misureDiRete(attuale) });
  return { meta: { generato_da: "scripts/export-graph.mjs", nota: "Archi distinti erogatore → fruitore. Il modello v1 (2026-05-02) è escluso: regole diverse." }, serie: righe };
}
