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

  data.eservices.forEach((es) =>
    es.fruitori.forEach((f) => {
      links.push({
        source: es.erogatore,
        target: f,
        eservice: es.nome,
        eserviceId: es.id,
        versione: es.versione,
        stato: es.stato,
        descrizione: es.descrizione,
      });
      const key = [es.erogatore, f].sort().join("--");
      linkCounts[key] = (linkCounts[key] || 0) + 1;
    })
  );

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
