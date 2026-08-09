/**
 * Palette delle categorie.
 *
 * Due criteri governano l'assegnazione.
 *
 * 1. La tonalità raggruppa per famiglia istituzionale: blu per l'amministrazione
 *    centrale, verde per previdenza e lavoro, neutri freddi per le regioni,
 *    neutri caldi per i comuni, mattone per il fisco, prugna e indaco per
 *    cultura e ordini. Il colore porta quindi un'informazione sul tipo di ente.
 *
 * 2. Il peso visivo è INVERSO alla numerosità della categoria. Le regioni sono
 *    21 nodi su 51 e i comuni 6: se avessero i colori più saturi il grafo
 *    leggerebbe come un campo uniforme e gli hub sparirebbero. Ricevono quindi
 *    tinte a croma contenuta (circa 20) che fanno da tessuto di fondo, mentre i
 *    ministeri, che sono i veri hub della rete, stanno a croma 44.9.
 *
 * Ogni valore è verificato su tre vincoli misurabili, sul fondo #0a0e1a:
 *  - contrasto >= 3:1, così ogni nodo si stacca dallo sfondo;
 *  - distanza percettiva (Delta E, CIE76) >= 15 da ogni altra categoria;
 *  - croma contenuta per le categorie numerose, ma non azzerata: sotto circa 15
 *    un colore smette di leggersi come sobrio e inizia a leggersi come
 *    "disattivato", convenzione che nelle interfacce significa non disponibile.
 * Le coppie individuale/aggregato (Regione e Comune) condividono la tonalità e
 * si distinguono per luminosità, così la parentela resta leggibile.
 */
export const CATEGORY_COLORS = {
  // Territorio: numeroso, volutamente recessivo
  Regione: "#7089ad",
  "Regioni Aggregate": "#b6c6dd",
  Comune: "#978565",
  "Comuni Aggregati": "#d0c2a6",

  // Amministrazione centrale: pochi nodi ma hub della rete
  Ministero: "#3d8ad4",
  Anticorruzione: "#8c5820",
  Digitale: "#74b0e8",
  Trasporti: "#3f97ab",

  // Previdenza, lavoro, statistica
  Previdenza: "#25a894",
  Lavoro: "#57b06d",
  Statistica: "#8fae91",

  // Fisco e imprese
  Fisco: "#c2564a",
  Imprese: "#c9932f",

  // Cultura, società, ordini
  Cultura: "#b3648f",
  "Società pubblica": "#ad8dc9",
  Ordini: "#6f6bb0",

  // Tecnologia
  Tecnologia: "#7c8735",
};
