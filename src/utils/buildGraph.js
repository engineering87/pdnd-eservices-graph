// src/utils/buildGraph.js
// Versione provenance-aware: legge il campo `archi` (con origine) se presente,
// altrimenti ricade su `fruitori` (retrocompatibile). Ogni link porta `origine`:
// "documentata" | "certificata" | "inferita".

export function buildGraph(data) {
  const nodes = data.enti.map((e) => {
    const er = data.eservices.filter((s) => s.erogatore === e.id);
    const fr = data.eservices.filter((s) => s.fruitori.includes(e.id));
    return {
      ...e,
      erogati: er.length,
      fruiti: fr.length,
      totalConnections:
        er.reduce((a, s) => a + s.fruitori.length, 0) + fr.length,
      servizi_erogati: er,
      servizi_fruiti: fr,
    };
  });

  const links = [];
  const linkCounts = {};

  data.eservices.forEach((es) => {
    // Usa `archi` (con provenienza) se presente, altrimenti `fruitori` (legacy)
    const archi = es.archi || es.fruitori.map((f) => ({ fruitore: f, origine: "certificata" }));
    archi.forEach(({ fruitore, origine }) => {
      links.push({
        source: es.erogatore,
        target: fruitore,
        eservice: es.nome,
        eserviceId: es.id,
        versione: es.versione,
        stato: es.stato,
        descrizione: es.descrizione,
        origine: origine || "certificata",
      });
      const key = [es.erogatore, fruitore].sort().join("--");
      linkCounts[key] = (linkCounts[key] || 0) + 1;
    });
  });

  links.forEach((l) => {
    const key = [
      typeof l.source === "object" ? l.source.id : l.source,
      typeof l.target === "object" ? l.target.id : l.target,
    ]
      .sort()
      .join("--");
    l.weight = linkCounts[key] || 1;
  });

  return { nodes, links, linkCounts };
}
