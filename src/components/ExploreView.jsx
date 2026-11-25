/**
 * Esplora: chi usa cosa.
 *
 * Le relazioni del modello in forma tabellare, filtrabili per erogatore,
 * fruitore, categoria, provenienza e testo, con un riepilogo raggruppato e il
 * dettaglio arco per arco. I filtri vivono nella query string, così ogni vista
 * filtrata è un link condivisibile. Il risultato si scarica in CSV.
 */

import { useEffect, useMemo, useState } from "react";
import PDND_DATA from "../data/pdnd-data.json";
import {
  ORIGINI, RAGGRUPPAMENTI, flattenRelations, filterRelations, groupRelations, summarize, relationsToCSV,
} from "../utils/relations";
import { CATEGORY_COLORS, ORIGIN_STYLES } from "../constants/colors";
import { useIsMobile } from "../utils/useIsMobile";
import Termine from "./Termine";

const ROWS = flattenRelations(PDND_DATA);
const fmt = (n) => (n == null ? "—" : n.toLocaleString("it-IT"));
const breve = (n) => n == null ? "—" : n >= 1e6 ? `${(n / 1e6).toLocaleString("it-IT", { maximumFractionDigits: 1 })} M` : fmt(n);

const ENTI = [...PDND_DATA.enti].sort((a, b) => a.name.localeCompare(b.name, "it"));
const EROGATORI = ENTI.filter((e) => PDND_DATA.eservices.some((s) => s.erogatore === e.id));
const CLASSI = ENTI.filter((e) => e.aggregato);
const INDIVIDUALI = ENTI.filter((e) => !e.aggregato);
const CATEGORIE = [...new Set(PDND_DATA.enti.map((e) => e.categoria))].sort((a, b) => a.localeCompare(b, "it"));

const FILTRI_VUOTI = { erogatore: "", fruitore: "", categoriaFruitore: "", origini: [], q: "", soloUso: false };

const PRESET = [
  { label: "Chi usa i servizi ANPR", f: { erogatore: "min_interno" } },
  { label: "Cosa usano i Comuni", f: { fruitore: "comuni_agg" }, per: "erogatore" },
  { label: "Cosa usano le Scuole", f: { fruitore: "scuole_agg" }, per: "erogatore" },
  { label: "Servizi INPS per classe di enti", f: { erogatore: "inps", categoriaFruitore: "Classi aggregate" }, per: "fruitore" },
  { label: "Solo uso osservato", f: { origini: ["osservata"] }, per: "erogatore" },
  { label: "Relazioni con sessioni registrate", f: { soloUso: true }, per: "eservice" },
];

function leggiQuery() {
  if (typeof window === "undefined") return { f: FILTRI_VUOTI, per: "erogatore" };
  const p = new URLSearchParams(window.location.search);
  return {
    f: {
      erogatore: p.get("erogatore") || "",
      fruitore: p.get("fruitore") || "",
      categoriaFruitore: p.get("categoria") || "",
      origini: (p.get("origine") || "").split(",").filter((o) => ORIGINI.includes(o)),
      q: p.get("q") || "",
      soloUso: p.get("uso") === "1",
    },
    per: RAGGRUPPAMENTI[p.get("per")] ? p.get("per") : "erogatore",
  };
}

function scriviQuery(f, per) {
  const p = new URLSearchParams();
  if (f.erogatore) p.set("erogatore", f.erogatore);
  if (f.fruitore) p.set("fruitore", f.fruitore);
  if (f.categoriaFruitore) p.set("categoria", f.categoriaFruitore);
  if (f.origini.length) p.set("origine", f.origini.join(","));
  if (f.q) p.set("q", f.q);
  if (f.soloUso) p.set("uso", "1");
  if (per !== "erogatore") p.set("per", per);
  const s = p.toString();
  const url = window.location.pathname + (s ? `?${s}` : "");
  if (url !== window.location.pathname + window.location.search) window.history.replaceState({}, "", url);
}

/* ── piccoli componenti di presentazione ─────────────────────────────── */

const ctrl = {
  background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 6,
  color: "var(--ink)", fontFamily: "inherit", fontSize: 12, padding: "7px 10px", minWidth: 0,
};

function Campo({ label, children, grow }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: grow ? "2 1 220px" : "1 1 170px", minWidth: 0 }}>
      <span style={{ fontSize: 10, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: .6 }}>{label}</span>
      {children}
    </label>
  );
}

function OrigineBadge({ origine }) {
  const s = ORIGIN_STYLES[origine] || { nome: origine, colore: "#889" };
  return (
    <span style={{ display: "inline-block", padding: "1px 7px", borderRadius: 10, fontSize: 10, fontWeight: 600, color: s.colore, background: `${s.colore}1a`, border: `1px solid ${s.colore}40`, whiteSpace: "nowrap" }}>
      {s.nome}
    </span>
  );
}

function Tile({ label, value, sub }) {
  return (
    <div style={{ flex: "1 1 120px", padding: "10px 12px", background: "rgba(15,20,35,.6)", border: "1px solid rgba(100,160,220,.08)", borderRadius: 8, textAlign: "center" }}>
      <div className="tabular" style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)" }}>{value}</div>
      <div style={{ fontSize: 9.5, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: .5, marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 9, color: "var(--ink-faint)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Th({ children, col, sort, onSort, align = "left" }) {
  const attivo = sort.col === col;
  return (
    <th
      onClick={col ? () => onSort(col) : undefined}
      aria-sort={attivo ? (sort.dir === 1 ? "ascending" : "descending") : undefined}
      style={{ textAlign: align, padding: "8px 10px", fontSize: 10, fontWeight: 700, color: attivo ? "var(--ink)" : "var(--ink-faint)", textTransform: "uppercase", letterSpacing: .5, cursor: col ? "pointer" : "default", whiteSpace: "nowrap", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, background: "#0f1626", userSelect: "none" }}
    >
      {children}{attivo ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
    </th>
  );
}

const td = { padding: "7px 10px", fontSize: 12, borderBottom: "1px solid rgba(100,160,220,.06)", verticalAlign: "top" };
const link = { background: "none", border: "none", padding: 0, color: "var(--ink)", cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", textAlign: "left", textDecoration: "underline", textDecorationColor: "rgba(120,160,210,.35)", textUnderlineOffset: 3 };

/** Ordina per colonna; i valori mancanti vanno sempre in fondo. */
function ordina(arr, sort) {
  return [...arr].sort((a, b) => {
    const x = a[sort.col], y = b[sort.col];
    if (x == null && y == null) return 0;
    if (x == null) return 1;
    if (y == null) return -1;
    return (typeof x === "string" ? x.localeCompare(y, "it") : x - y) * sort.dir;
  });
}

function useSort(iniziale) {
  const [sort, setSort] = useState(iniziale);
  const onSort = (col) => setSort((s) => (s.col === col ? { col, dir: -s.dir } : { col, dir: -1 }));
  return { sort, onSort };
}

/* ── vista ───────────────────────────────────────────────────────────── */

export default function ExploreView({ onOpenEntity, onOpenEservice }) {
  const m = useIsMobile();
  const [f, setF] = useState(() => leggiQuery().f);
  const [per, setPer] = useState(() => leggiQuery().per);
  const [limiteGruppi, setLimiteGruppi] = useState(12);
  const [limiteRighe, setLimiteRighe] = useState(50);

  useEffect(() => { scriviQuery(f, per); }, [f, per]);

  const aggiorna = (patch) => { setF((x) => ({ ...x, ...patch })); setLimiteRighe(50); setLimiteGruppi(12); };
  const toggleOrigine = (o) => aggiorna({ origini: f.origini.includes(o) ? f.origini.filter((x) => x !== o) : [...f.origini, o] });
  const applicaPreset = (p) => { setF({ ...FILTRI_VUOTI, ...p.f }); if (p.per) setPer(p.per); setLimiteRighe(50); setLimiteGruppi(12); };
  const attivi = JSON.stringify(f) !== JSON.stringify(FILTRI_VUOTI);

  const righe = useMemo(() => filterRelations(ROWS, f), [f]);
  const tot = useMemo(() => summarize(righe), [righe]);
  const gruppiSort = useSort({ col: "relazioni", dir: -1 });
  const gruppi = useMemo(() => ordina(groupRelations(righe, per), gruppiSort.sort), [righe, per, gruppiSort.sort]);
  const maxRelazioni = gruppi.reduce((a, x) => Math.max(a, x.relazioni), 1);
  const righeSort = useSort({ col: "sessioni", dir: -1 });
  const righeOrdinate = useMemo(() => ordina(righe, righeSort.sort), [righe, righeSort.sort]);

  // Cliccare un gruppo restringe il filtro, quando il raggruppamento lo consente.
  const filtraGruppo = (g) => {
    if (per === "erogatore") aggiorna({ erogatore: g.chiave });
    else if (per === "fruitore") aggiorna({ fruitore: g.chiave });
    else if (per === "categoriaFruitore") aggiorna({ categoriaFruitore: g.chiave });
    else if (per === "origine") aggiorna({ origini: [g.chiave] });
    else if (per === "eservice") aggiorna({ q: g.nome });
  };

  const scaricaCSV = () => {
    const blob = new Blob([relationsToCSV(righeOrdinate)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pdnd-eservices-graph-relazioni-filtrate.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const ente = (id, nome) => (
    <button type="button" style={link} onClick={() => onOpenEntity(id)} title="Apri nel grafo">{nome}</button>
  );

  const colonnaConteggio = per === "erogatore" ? ["fruitori", "Fruitori"] : ["erogatori", "Erogatori"];

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: m ? "16px 14px" : "24px 28px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ fontSize: 11, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Relazioni fra enti</div>
        <h2 style={{ fontSize: m ? 18 : 22, fontWeight: 700, color: "#f1f5f9", marginBottom: 6 }}>Chi usa cosa</h2>
        <p style={{ fontSize: 12.5, color: "var(--ink-muted)", lineHeight: 1.6, maxWidth: 820, marginBottom: 16 }}>
          Ogni riga dice quale ente offre un servizio di scambio dati (<Termine id="eservice">e-service</Termine>) e quale ente,
          o <Termine id="classe">classe di enti</Termine>, lo usa. <Termine id="abilitati">Enti abilitati</Termine> e{" "}
          <Termine id="sessioni">sessioni</Termine> vengono dalle statistiche ufficiali PagoPA. Scegli un percorso qui sotto o usa i filtri;
          l'indirizzo della pagina conserva la vista, così puoi condividerla.
        </p>

        {/* Preset */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {PRESET.map((p) => (
            <button key={p.label} type="button" onClick={() => applicaPreset(p)}
              style={{ ...ctrl, padding: "5px 11px", borderRadius: 14, fontSize: 11, color: "var(--ink-muted)", cursor: "pointer" }}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Filtri */}
        <div style={{ padding: "14px 16px", background: "rgba(15,20,35,.6)", border: "1px solid rgba(100,160,220,.08)", borderRadius: 10, marginBottom: 16 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <Campo label="Cerca" grow>
              <input type="search" value={f.q} placeholder="E-service, descrizione o ente" onChange={(e) => aggiorna({ q: e.target.value })} style={ctrl} />
            </Campo>
            <Campo label="Erogatore">
              <select value={f.erogatore} onChange={(e) => aggiorna({ erogatore: e.target.value })} style={ctrl}>
                <option value="">Tutti</option>
                {EROGATORI.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </Campo>
            <Campo label="Fruitore">
              <select value={f.fruitore} onChange={(e) => aggiorna({ fruitore: e.target.value })} style={ctrl}>
                <option value="">Tutti</option>
                <optgroup label="Classi di enti">
                  {CLASSI.map((e) => <option key={e.id} value={e.id}>{e.name.replace(" (aggregati)", "")}</option>)}
                </optgroup>
                <optgroup label="Enti">
                  {INDIVIDUALI.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </optgroup>
              </select>
            </Campo>
            <Campo label="Categoria del fruitore">
              <select value={f.categoriaFruitore} onChange={(e) => aggiorna({ categoriaFruitore: e.target.value })} style={ctrl}>
                <option value="">Tutte</option>
                {CATEGORIE.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Campo>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 12 }}>
            <span style={{ fontSize: 11, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: .6, marginRight: 4 }}><Termine id="provenienza">Provenienza</Termine></span>
            {ORIGINI.map((o) => {
              const s = ORIGIN_STYLES[o];
              const on = f.origini.includes(o);
              return (
                <button key={o} type="button" aria-pressed={on} onClick={() => toggleOrigine(o)}
                  style={{ ...ctrl, padding: "4px 10px", borderRadius: 12, fontSize: 11, cursor: "pointer", color: on ? s.colore : "var(--ink-faint)", borderColor: on ? s.colore : "var(--border)", background: on ? `${s.colore}1a` : "transparent" }}>
                  {s.nome}
                </button>
              );
            })}
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--ink-muted)", marginLeft: m ? 0 : 12, cursor: "pointer" }}>
              <input type="checkbox" checked={f.soloUso} onChange={(e) => aggiorna({ soloUso: e.target.checked })} />
              Solo con dati d'uso
            </label>
            {attivi && (
              <button type="button" onClick={() => applicaPreset({ f: {} })}
                style={{ ...ctrl, marginLeft: "auto", padding: "4px 12px", fontSize: 11, cursor: "pointer", color: "var(--ink-muted)" }}>
                Azzera filtri
              </button>
            )}
          </div>
        </div>

        {/* Riepilogo */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
          <Tile label="Relazioni" value={fmt(tot.relazioni)} />
          <Tile label="E-service" value={fmt(tot.eservice)} />
          <Tile label="Erogatori" value={fmt(tot.erogatori)} />
          <Tile label="Fruitori" value={fmt(tot.fruitori)} />
          <Tile label="Sessioni osservate" value={tot.sessioni ? breve(tot.sessioni) : "—"} sub={tot.sessioni ? "almeno" : null} />
        </div>

        {righe.length === 0 ? (
          <div style={{ padding: 30, textAlign: "center", color: "var(--ink-faint)", fontSize: 13, border: "1px dashed var(--border)", borderRadius: 10 }}>
            Nessuna relazione corrisponde ai filtri.
          </div>
        ) : (
          <>
            {/* Raggruppamento */}
            <section style={{ marginBottom: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>Riepilogo per</h3>
                <select value={per} onChange={(e) => { setPer(e.target.value); setLimiteGruppi(12); }} style={{ ...ctrl, padding: "5px 8px" }} aria-label="Raggruppa per">
                  {Object.entries(RAGGRUPPAMENTI).map(([k, g]) => <option key={k} value={k}>{g.etichetta}</option>)}
                </select>
                <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>{gruppi.length} gruppi · clic su un gruppo per filtrare</span>
              </div>
              <div style={{ overflowX: "auto", border: "1px solid rgba(100,160,220,.08)", borderRadius: 8 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
                  <thead>
                    <tr>
                      <Th col="nome" sort={gruppiSort.sort} onSort={gruppiSort.onSort}>{RAGGRUPPAMENTI[per].etichetta}</Th>
                      <Th col="relazioni" sort={gruppiSort.sort} onSort={gruppiSort.onSort} align="right">Relazioni</Th>
                      <Th col="eservice" sort={gruppiSort.sort} onSort={gruppiSort.onSort} align="right">E-service</Th>
                      <Th col={colonnaConteggio[0]} sort={gruppiSort.sort} onSort={gruppiSort.onSort} align="right">{colonnaConteggio[1]}</Th>
                      <Th col="sessioni" sort={gruppiSort.sort} onSort={gruppiSort.onSort} align="right">Sessioni (min.)</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {gruppi.slice(0, limiteGruppi).map((g) => {
                      const colore = per === "origine" ? ORIGIN_STYLES[g.chiave]?.colore : per === "categoriaFruitore" ? CATEGORY_COLORS[g.chiave] : "var(--pa-blue)";
                      return (
                        <tr key={g.chiave} onClick={() => filtraGruppo(g)} style={{ cursor: "pointer" }} title="Filtra su questo gruppo">
                          <td style={td}>
                            <div style={{ color: "var(--ink)" }}>{per === "origine" ? <OrigineBadge origine={g.chiave} /> : g.nome}</div>
                            <div style={{ height: 3, marginTop: 4, borderRadius: 2, background: "rgba(30,40,60,.6)" }}>
                              <div style={{ height: "100%", width: `${(g.relazioni / maxRelazioni) * 100}%`, borderRadius: 2, background: colore || "var(--pa-blue)" }} />
                            </div>
                          </td>
                          <td className="tabular" style={{ ...td, textAlign: "right" }}>{fmt(g.relazioni)}</td>
                          <td className="tabular" style={{ ...td, textAlign: "right" }}>{fmt(g.eservice)}</td>
                          <td className="tabular" style={{ ...td, textAlign: "right" }}>{fmt(g[colonnaConteggio[0]])}</td>
                          <td className="tabular" style={{ ...td, textAlign: "right", color: g.sessioni ? "#4fc3f7" : "var(--ink-faint)" }}>{breve(g.sessioni)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {gruppi.length > limiteGruppi && (
                <button type="button" onClick={() => setLimiteGruppi(gruppi.length)} style={{ ...ctrl, marginTop: 8, cursor: "pointer", fontSize: 11, color: "var(--ink-muted)" }}>
                  Mostra tutti i {gruppi.length} gruppi
                </button>
              )}
            </section>

            {/* Dettaglio */}
            <section>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>Dettaglio delle relazioni</h3>
                <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>{fmt(righe.length)} righe</span>
                <button type="button" onClick={scaricaCSV} style={{ ...ctrl, marginLeft: "auto", padding: "5px 12px", fontSize: 11, cursor: "pointer", color: "var(--pa-blue)", borderColor: "var(--pa-blue)" }}>
                  Scarica CSV
                </button>
              </div>
              <div style={{ overflowX: "auto", border: "1px solid rgba(100,160,220,.08)", borderRadius: 8 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                  <thead>
                    <tr>
                      <Th col="erogatoreNome" sort={righeSort.sort} onSort={righeSort.onSort}>Erogatore</Th>
                      <Th col="eservice" sort={righeSort.sort} onSort={righeSort.onSort}>E-service</Th>
                      <Th col="fruitoreNome" sort={righeSort.sort} onSort={righeSort.onSort}>Fruitore</Th>
                      <Th col="origine" sort={righeSort.sort} onSort={righeSort.onSort}>Provenienza</Th>
                      <Th col="connessioni" sort={righeSort.sort} onSort={righeSort.onSort} align="right">Enti abilitati</Th>
                      <Th col="sessioni" sort={righeSort.sort} onSort={righeSort.onSort} align="right">Sessioni</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {righeOrdinate.slice(0, limiteRighe).map((r) => (
                      <tr key={`${r.eserviceId}|${r.fruitore}`}>
                        <td style={td}>{ente(r.erogatore, r.erogatoreNome)}</td>
                        <td style={{ ...td, color: "#cbd5e1", maxWidth: 340 }}>
                          <button type="button" style={{ ...link, color: "#cbd5e1" }} onClick={() => onOpenEservice(r.eserviceId)} title="Apri la scheda dell'e-service">{r.eservice}</button>
                          {!r.catalogId && <span title="Tipo di servizio del modello v1, non un singolo e-service del catalogo" style={{ marginLeft: 6, fontSize: 9.5, color: "var(--ink-faint)" }}>tipo</span>}
                        </td>
                        <td style={td}>
                          {ente(r.fruitore, r.fruitoreNome)}
                          {r.fruitoreAggregato && <span style={{ marginLeft: 6, fontSize: 9.5, color: "var(--ink-faint)" }}>classe</span>}
                        </td>
                        <td style={td}><OrigineBadge origine={r.origine} /></td>
                        <td className="tabular" style={{ ...td, textAlign: "right", color: r.connessioni != null ? "var(--ink)" : "var(--ink-faint)" }}>{fmt(r.connessioni)}</td>
                        <td className="tabular" style={{ ...td, textAlign: "right", color: r.sessioni != null ? "#4fc3f7" : "var(--ink-faint)" }}>{breve(r.sessioni)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {righe.length > limiteRighe && (
                <button type="button" onClick={() => setLimiteRighe((n) => n + 100)} style={{ ...ctrl, marginTop: 8, cursor: "pointer", fontSize: 11, color: "var(--ink-muted)" }}>
                  Mostra altre {Math.min(100, righe.length - limiteRighe)} righe ({fmt(righe.length - limiteRighe)} rimanenti)
                </button>
              )}
            </section>
          </>
        )}

        <p style={{ fontSize: 10.5, color: "var(--ink-faint)", marginTop: 18, lineHeight: 1.6 }}>
          Un arco verso una classe di enti non significa che tutti gli enti della classe usino il servizio. Le classifiche ufficiali
          elencano solo i primi 10 e-service per categoria: un servizio senza dati d'uso non è per forza poco usato.
          Se usi questi dati, cita il progetto: DOI 10.5281/zenodo.19989954.
        </p>
      </div>
    </div>
  );
}
