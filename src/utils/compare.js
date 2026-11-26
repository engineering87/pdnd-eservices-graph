/**
 * Confronto fra due versioni del modello (istantanee o dato live): enti,
 * e-service e legami aggiunti o rimossi, e i servizi con più nuove sessioni.
 *
 * Gli e-service si abbinano per id del catalogo PDND quando c'è, altrimenti per
 * id del modello (i tipi di servizio del v1). I legami sono le coppie distinte
 * erogatore → fruitore, come nel resto del progetto.
 */

const chiaveEs = (s) => s.catalogId || `modello:${s.id}`;

function legami(data) {
  const out = new Map();
  for (const s of data.eservices) {
    for (const f of s.fruitori || []) {
      if (f === s.erogatore) continue;
      const k = `${s.erogatore}->${f}`;
      if (!out.has(k)) out.set(k, { erogatore: s.erogatore, fruitore: f });
    }
  }
  return out;
}

const relazioni = (data) => data.eservices.reduce((a, s) => a + (s.archi || s.fruitori || []).length, 0);
// Righe del catalogo scaricato, dove la pipeline le registra. Il v1 riporta un
// conteggio diverso (solo le API pubblicate): non è confrontabile e resta nullo.
const righeCatalogo = (data) => Number((data.meta?.snapshot_catalogo || "").match(/^(\d+) righe nel catalogo/)?.[1]) || null;

/** Differenze da `prima` a `dopo`. Le liste sono già ordinate per la lettura. */
export function compareModels(prima, dopo) {
  const nomi = new Map([...prima.enti, ...dopo.enti].map((e) => [e.id, e.name]));
  const nome = (id) => nomi.get(id) || id;

  const entiA = new Set(prima.enti.map((e) => e.id)), entiB = new Set(dopo.enti.map((e) => e.id));
  const esA = new Map(prima.eservices.map((s) => [chiaveEs(s), s]));
  const esB = new Map(dopo.eservices.map((s) => [chiaveEs(s), s]));
  const lA = legami(prima), lB = legami(dopo);

  const perNome = (a, b) => a.erogatoreNome.localeCompare(b.erogatoreNome, "it") || a.nome.localeCompare(b.nome, "it");
  const vistaEs = (s) => ({ id: s.id, nome: s.nome, erogatore: s.erogatore, erogatoreNome: nome(s.erogatore) });
  const vistaLegame = (l) => ({ ...l, erogatoreNome: nome(l.erogatore), fruitoreNome: nome(l.fruitore) });

  const sessioni = [];
  for (const [k, b] of esB) {
    const a = esA.get(k);
    if (a && a.sessioni_min && b.sessioni_min && b.sessioni_min > a.sessioni_min) {
      sessioni.push({ ...vistaEs(b), prima: a.sessioni_min, dopo: b.sessioni_min, nuove: b.sessioni_min - a.sessioni_min });
    }
  }
  sessioni.sort((x, y) => y.nuove - x.nuove);

  return {
    totali: {
      enti: [prima.enti.length, dopo.enti.length],
      eservice: [prima.eservices.length, dopo.eservices.length],
      relazioni: [relazioni(prima), relazioni(dopo)],
      legami: [lA.size, lB.size],
      catalogo: [righeCatalogo(prima), righeCatalogo(dopo)],
    },
    entiAggiunti: [...entiB].filter((id) => !entiA.has(id)).map((id) => ({ id, nome: nome(id) })),
    entiRimossi: [...entiA].filter((id) => !entiB.has(id)).map((id) => ({ id, nome: nome(id) })),
    esAggiunti: [...esB].filter(([k]) => !esA.has(k)).map(([, s]) => vistaEs(s)).sort(perNome),
    esRimossi: [...esA].filter(([k]) => !esB.has(k)).map(([, s]) => vistaEs(s)).sort(perNome),
    legamiAggiunti: [...lB].filter(([k]) => !lA.has(k)).map(([, l]) => vistaLegame(l)).sort((a, b) => a.erogatoreNome.localeCompare(b.erogatoreNome, "it") || a.fruitoreNome.localeCompare(b.fruitoreNome, "it")),
    legamiRimossi: [...lA].filter(([k]) => !lB.has(k)).map(([, l]) => vistaLegame(l)).sort((a, b) => a.erogatoreNome.localeCompare(b.erogatoreNome, "it") || a.fruitoreNome.localeCompare(b.fruitoreNome, "it")),
    sessioni,
  };
}

/** Data AAAA-MM-GG dal nome di un file di istantanea. */
export function dataIstantanea(percorso) {
  return percorso.match(/pdnd-data\.(\d{4}-\d{2}-\d{2})\.json$/)?.[1] || null;
}
