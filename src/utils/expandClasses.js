/**
 * Apertura delle classi di enti nella mappa.
 *
 * Una classe aperta resta nel grafo e accanto compaiono i suoi tipi di ente
 * (sottotipi di pipeline/classi.json). Si spostano sui tipi solo gli archi che
 * il catalogo abilita a una parte della classe: archi 'certificata' il cui
 * campo `sottotipi` non copre tutti i tipi. Tutto il resto resta sulla classe:
 * l'uso osservato, perché le statistiche ufficiali sono per categoria e non
 * per tipo di ente, e le abilitazioni rivolte a tutta la classe (per esempio
 * l'attributo generico «Pubbliche Amministrazioni»).
 *
 * È una trasformazione della sola vista: densità, comunità e le altre misure
 * restano calcolate sul modello con le classi chiuse.
 */

/** Classi del modello che si possono aprire: quelle con almeno due tipi di ente. */
export function classiApribili(data) {
  return data.enti.filter((e) => e.aggregato && e.sottotipi?.length > 1).map((e) => e.id);
}

/** Il modello con le classi indicate aperte nei loro tipi di ente. */
export function apriClassi(data, aperte) {
  const tipiDi = new Map();
  for (const e of data.enti) if (aperte.has(e.id) && e.sottotipi?.length > 1) tipiDi.set(e.id, e);
  if (!tipiDi.size) return data;

  const enti = [...data.enti];
  for (const classe of tipiDi.values()) {
    const nomeClasse = classe.name.replace(" (aggregati)", "");
    for (const t of classe.sottotipi) {
      enti.push({
        id: t.id,
        name: t.nome,
        tipo: "Fruitore",
        categoria: classe.categoria,
        descrizione: `Tipo di ente della classe ${nomeClasse}: compare perché la classe è aperta. Riceve solo gli e-service che il catalogo abilita a questo tipo e non a tutta la classe.`,
        aggregato: true,
        aderenti: t.aderenti,
        aderenti_fonte: "conteggio per attributo certificato",
        sottotipo_di: classe.id,
      });
    }
  }

  const eservices = data.eservices.map((s) => {
    let cambiato = false;
    const archi = (s.archi || []).flatMap((a) => {
      const classe = tipiDi.get(a.fruitore);
      if (!classe || a.origine !== "certificata" || !a.sottotipi?.length || a.sottotipi.length >= classe.sottotipi.length) return [a];
      cambiato = true;
      return a.sottotipi.map((t) => ({ fruitore: t, origine: a.origine }));
    });
    return cambiato ? { ...s, archi, fruitori: [...new Set(archi.map((a) => a.fruitore))] } : s;
  });

  return { ...data, enti, eservices };
}

/** Legami di appartenenza classe → tipo di ente, solo per la vista. */
export function legamiAppartenenza(data) {
  return data.enti.filter((e) => e.sottotipo_di).map((e) => ({ source: e.sottotipo_di, target: e.id, origine: "appartenenza" }));
}
