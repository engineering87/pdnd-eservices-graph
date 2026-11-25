/**
 * Relazioni erogatore → e-service → fruitore in forma tabellare, con filtri e
 * raggruppamenti. Sono la base della scheda Relazioni.
 *
 * Ogni riga è un arco del modello: un fruitore di un e-service, con la sua
 * provenienza e, se pubblicati dalle statistiche ufficiali, enti abilitati e
 * sessioni osservate. Questi valori sono minimi garantiti, non totali.
 */

export const ORIGINI = ["documentata", "osservata", "certificata", "ricostruita", "inferita"];

/** Appiattisce il modello in righe, una per arco. */
export function flattenRelations(data) {
  const enti = new Map(data.enti.map((e) => [e.id, e]));
  const rows = [];
  for (const es of data.eservices) {
    const archi = es.archi || es.fruitori.map((f) => ({ fruitore: f, origine: "ricostruita" }));
    const erog = enti.get(es.erogatore);
    for (const a of archi) {
      const fr = enti.get(a.fruitore);
      rows.push({
        eserviceId: es.id,
        eservice: es.nome,
        catalogId: es.catalogId || null,
        descrizione: es.descrizione || "",
        erogatore: es.erogatore,
        erogatoreNome: erog?.name || es.erogatore,
        erogatoreCategoria: erog?.categoria || "",
        fruitore: a.fruitore,
        fruitoreNome: fr?.name || a.fruitore,
        fruitoreCategoria: fr?.categoria || "",
        fruitoreAggregato: Boolean(fr?.aggregato),
        origine: a.origine || "ricostruita",
        connessioni: a.connessioni ?? null,
        sessioni: a.sessioni ?? null,
      });
    }
  }
  return rows;
}

/** Normalizza per la ricerca: minuscole, senza accenti. */
const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * Filtra le righe. Campi del filtro, tutti facoltativi:
 *  erogatore, fruitore      id di ente
 *  categoriaErogatore,
 *  categoriaFruitore        nome di categoria
 *  origini                  array di origini ammesse (vuoto = tutte)
 *  q                        testo cercato in e-service, descrizione e nomi
 *  soloUso                  solo righe con connessioni o sessioni osservate
 */
export function filterRelations(rows, f = {}) {
  const q = f.q ? norm(f.q.trim()) : "";
  const origini = f.origini && f.origini.length ? new Set(f.origini) : null;
  return rows.filter((r) =>
    (!f.erogatore || r.erogatore === f.erogatore) &&
    (!f.fruitore || r.fruitore === f.fruitore) &&
    (!f.categoriaErogatore || r.erogatoreCategoria === f.categoriaErogatore) &&
    (!f.categoriaFruitore || r.fruitoreCategoria === f.categoriaFruitore) &&
    (!origini || origini.has(r.origine)) &&
    (!f.soloUso || r.connessioni != null || r.sessioni != null) &&
    (!q || norm(`${r.eservice} ${r.descrizione} ${r.erogatoreNome} ${r.fruitoreNome}`).includes(q))
  );
}

export const RAGGRUPPAMENTI = {
  erogatore: { etichetta: "Erogatore", chiave: (r) => r.erogatore, nome: (r) => r.erogatoreNome },
  fruitore: { etichetta: "Fruitore", chiave: (r) => r.fruitore, nome: (r) => r.fruitoreNome },
  categoriaFruitore: { etichetta: "Categoria del fruitore", chiave: (r) => r.fruitoreCategoria, nome: (r) => r.fruitoreCategoria },
  eservice: { etichetta: "E-service", chiave: (r) => r.eserviceId, nome: (r) => r.eservice },
  origine: { etichetta: "Provenienza", chiave: (r) => r.origine, nome: (r) => r.origine },
};

/**
 * Raggruppa le righe e calcola per ogni gruppo: relazioni, e-service distinti,
 * erogatori e fruitori distinti, connessioni massime e somma delle sessioni.
 */
export function groupRelations(rows, per) {
  const g = RAGGRUPPAMENTI[per];
  if (!g) throw new Error(`raggruppamento sconosciuto: ${per}`);
  const gruppi = new Map();
  for (const r of rows) {
    const k = g.chiave(r);
    if (!gruppi.has(k)) {
      gruppi.set(k, { chiave: k, nome: g.nome(r), relazioni: 0, eservice: new Set(), erogatori: new Set(), fruitori: new Set(), connessioni: null, sessioni: null });
    }
    const x = gruppi.get(k);
    x.relazioni++;
    x.eservice.add(r.eserviceId);
    x.erogatori.add(r.erogatore);
    x.fruitori.add(r.fruitore);
    if (r.connessioni != null) x.connessioni = Math.max(x.connessioni ?? 0, r.connessioni);
    if (r.sessioni != null) x.sessioni = (x.sessioni ?? 0) + r.sessioni;
  }
  return [...gruppi.values()].map((x) => ({
    ...x,
    eservice: x.eservice.size,
    erogatori: x.erogatori.size,
    fruitori: x.fruitori.size,
  }));
}

/** Totali di un insieme di righe, per il riepilogo in testa ai risultati. */
export function summarize(rows) {
  const s = { relazioni: rows.length, eservice: new Set(), erogatori: new Set(), fruitori: new Set(), sessioni: 0 };
  for (const r of rows) {
    s.eservice.add(r.eserviceId);
    s.erogatori.add(r.erogatore);
    s.fruitori.add(r.fruitore);
    if (r.sessioni != null) s.sessioni += r.sessioni;
  }
  return { ...s, eservice: s.eservice.size, erogatori: s.erogatori.size, fruitori: s.fruitori.size };
}

/** CSV delle righe filtrate, con intestazione. */
export function relationsToCSV(rows) {
  const campo = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const cols = ["erogatore", "erogatoreNome", "eservice", "catalogId", "fruitore", "fruitoreNome", "fruitoreCategoria", "origine", "connessioni", "sessioni"];
  return [cols.join(","), ...rows.map((r) => cols.map((c) => campo(r[c])).join(","))].join("\n") + "\n";
}
