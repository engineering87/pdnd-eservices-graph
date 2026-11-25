/**
 * Scheda di un e-service: chi lo eroga, chi lo fruisce e con quale prova,
 * quanto è usato secondo le statistiche ufficiali, gli altri servizi dello
 * stesso erogatore. Ha un indirizzo proprio, /eservice/<id>.
 */

import { useMemo, useState } from "react";
import PDND_DATA from "../data/pdnd-data.json";
import { ORIGINI } from "../utils/relations";
import { CATEGORY_COLORS, ORIGIN_STYLES } from "../constants/colors";
import { useIsMobile } from "../utils/useIsMobile";

const ENTI = new Map(PDND_DATA.enti.map((e) => [e.id, e]));
const SNAPSHOT = PDND_DATA.meta?.ultimo_aggiornamento
  ? new Date(`${PDND_DATA.meta.ultimo_aggiornamento}T12:00:00`).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })
  : "—";
const fmt = (n) => (n == null ? "—" : n.toLocaleString("it-IT"));
const breve = (n) => n == null ? "—" : n >= 1e6 ? `${(n / 1e6).toLocaleString("it-IT", { maximumFractionDigits: 1 })} M` : fmt(n);

const link = { background: "none", border: "none", padding: 0, color: "var(--ink)", cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", textAlign: "left", textDecoration: "underline", textDecorationColor: "rgba(120,160,210,.35)", textUnderlineOffset: 3 };
const box = { background: "rgba(15,20,35,.6)", border: "1px solid rgba(100,160,220,.08)", borderRadius: 10, padding: "18px 20px", marginBottom: 16 };
const h3 = { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: .8, marginBottom: 12 };
const td = { padding: "7px 10px", fontSize: 12, borderBottom: "1px solid rgba(100,160,220,.06)", verticalAlign: "top" };
const th = { textAlign: "left", padding: "6px 10px", fontSize: 10, fontWeight: 700, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: .5, borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" };

function Badge({ children, colore = "var(--ink-faint)", title }) {
  return (
    <span title={title} style={{ display: "inline-block", padding: "2px 9px", borderRadius: 10, fontSize: 10.5, fontWeight: 600, color: colore, border: `1px solid ${colore}55`, background: `${colore}14`, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function Tile({ label, value, sub, colore = "var(--ink)" }) {
  return (
    <div style={{ flex: "1 1 140px", padding: "12px", background: "rgba(15,20,35,.6)", border: "1px solid rgba(100,160,220,.08)", borderRadius: 8, textAlign: "center" }}>
      <div className="tabular" style={{ fontSize: 22, fontWeight: 700, color: colore }}>{value}</div>
      <div style={{ fontSize: 9.5, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: .5, marginTop: 3 }}>{label}</div>
      {sub && <div style={{ fontSize: 9.5, color: "var(--ink-faint)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function EServiceView({ eserviceId, onOpenEntity, onOpenEservice, onExplore, onBack }) {
  const m = useIsMobile();
  const [copiato, setCopiato] = useState(false);
  const es = PDND_DATA.eservices.find((s) => s.id === eserviceId);

  const archi = useMemo(() => {
    if (!es) return [];
    const lista = es.archi || es.fruitori.map((f) => ({ fruitore: f, origine: "ricostruita" }));
    return lista.map((a) => ({ ...a, ente: ENTI.get(a.fruitore) }));
  }, [es]);

  const perOrigine = useMemo(() => ORIGINI
    .map((o) => [o, archi.filter((a) => a.origine === o)
      .sort((a, b) => (b.sessioni ?? -1) - (a.sessioni ?? -1) || (b.ente?.aderenti ?? 0) - (a.ente?.aderenti ?? 0) || (a.ente?.name || "").localeCompare(b.ente?.name || "", "it"))])
    .filter(([, lista]) => lista.length), [archi]);

  const altri = useMemo(() => !es ? [] : PDND_DATA.eservices
    .filter((s) => s.erogatore === es.erogatore && s.id !== es.id)
    .sort((a, b) => (b.sessioni_min ?? 0) - (a.sessioni_min ?? 0) || (b.enti_abilitati_min ?? 0) - (a.enti_abilitati_min ?? 0) || a.nome.localeCompare(b.nome, "it")), [es]);

  if (!es) {
    return (
      <div style={{ flex: 1, padding: "40px 28px", textAlign: "center", color: "var(--ink-muted)" }}>
        <div style={{ fontSize: 16, color: "var(--ink)", marginBottom: 8 }}>E-service non trovato</div>
        <div style={{ fontSize: 12.5, marginBottom: 16 }}>L'identificativo «{eserviceId}» non corrisponde a nessun e-service del modello pubblicato.</div>
        <button type="button" onClick={() => onExplore("")} style={{ ...link, color: "var(--pa-blue)" }}>Cerca fra le relazioni in Esplora</button>
      </div>
    );
  }

  const erog = ENTI.get(es.erogatore);
  const classi = archi.filter((a) => a.ente?.aggregato).length;
  const copia = () => {
    navigator.clipboard?.writeText(es.catalogId).then(() => { setCopiato(true); setTimeout(() => setCopiato(false), 1500); }).catch(() => {});
  };
  const esploraQuery = new URLSearchParams({ erogatore: es.erogatore, q: es.nome, per: "fruitore" }).toString();

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: m ? "16px 14px" : "24px 28px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <button type="button" onClick={onBack} style={{ ...link, color: "var(--ink-faint)", fontSize: 12, textDecoration: "none", marginBottom: 12 }}>← Indietro</button>

        <div style={{ fontSize: 10, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>E-service</div>
        <h2 style={{ fontSize: m ? 18 : 23, fontWeight: 700, color: "#f1f5f9", marginBottom: 8, wordBreak: "break-word" }}>{es.nome}</h2>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 14, fontSize: 12.5, color: "var(--ink-muted)" }}>
          <span>Erogato da</span>
          <button type="button" style={{ ...link, fontWeight: 600 }} onClick={() => onOpenEntity(es.erogatore)} title="Apri nel grafo">{erog?.name || es.erogatore}</button>
          {erog && <Badge colore={CATEGORY_COLORS[erog.categoria]}>{erog.categoria}</Badge>}
          <Badge colore={es.stato === "Attivo" ? "#06d6a0" : "#ffd166"}>{es.stato}</Badge>
          {es.versione && <Badge>v{es.versione}</Badge>}
          {!es.catalogId && <Badge colore="#c49a9a" title="Record del modello v1 che rappresenta un tipo di servizio, non un singolo e-service del catalogo">tipo di servizio (v1)</Badge>}
        </div>
        {es.descrizione && <p style={{ fontSize: 13.5, color: "#cbd5e1", lineHeight: 1.65, maxWidth: 820, marginBottom: 18 }}>{es.descrizione}</p>}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
          <Tile label="Fruitori nel modello" value={fmt(archi.length)} sub={classi ? `di cui ${classi} classi di enti` : null} />
          <Tile label="Enti abilitati" value={fmt(es.enti_abilitati_min)} sub={es.enti_abilitati_min ? "almeno, dato ufficiale" : "non nelle classifiche"} colore={es.enti_abilitati_min ? "#4fc3f7" : "var(--ink-faint)"} />
          <Tile label="Sessioni di scambio" value={breve(es.sessioni_min)} sub={es.sessioni_min ? "almeno, dato ufficiale" : "non nelle classifiche"} colore={es.sessioni_min ? "#8338ec" : "var(--ink-faint)"} />
        </div>

        <div style={box}>
          <div style={{ ...h3, color: "var(--pa-blue)" }}>Chi lo fruisce</div>
          {perOrigine.map(([origine, lista]) => {
            const st = ORIGIN_STYLES[origine];
            return (
              <div key={origine} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <Badge colore={st.colore}>{st.nome}</Badge>
                  <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>{lista.length} {lista.length === 1 ? "fruitore" : "fruitori"}</span>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 460 }}>
                    <thead>
                      <tr>
                        <th style={th}>Fruitore</th>
                        <th style={{ ...th, textAlign: "right" }}>Aderenti</th>
                        <th style={{ ...th, textAlign: "right" }}>Enti abilitati</th>
                        <th style={{ ...th, textAlign: "right" }}>Sessioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lista.map((a) => (
                        <tr key={a.fruitore}>
                          <td style={td}>
                            <button type="button" style={link} onClick={() => onOpenEntity(a.fruitore)} title="Apri nel grafo">{a.ente?.name || a.fruitore}</button>
                            {a.ente?.aggregato && <span style={{ marginLeft: 6, fontSize: 9.5, color: "var(--ink-faint)" }}>classe</span>}
                          </td>
                          <td className="tabular" style={{ ...td, textAlign: "right", color: "var(--ink-faint)" }}>{a.ente?.aderenti ? fmt(a.ente.aderenti) : ""}</td>
                          <td className="tabular" style={{ ...td, textAlign: "right", color: a.connessioni != null ? "var(--ink)" : "var(--ink-faint)" }}>{fmt(a.connessioni)}</td>
                          <td className="tabular" style={{ ...td, textAlign: "right", color: a.sessioni != null ? "#4fc3f7" : "var(--ink-faint)" }}>{breve(a.sessioni)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
          {archi.length === 0 && <div style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>Nessun fruitore: il catalogo non dichiara categorie di enti e l'e-service non compare nelle classifiche ufficiali.</div>}
          <div style={{ fontSize: 10.5, color: "var(--ink-faint)", lineHeight: 1.55, marginTop: 4 }}>
            Un fruitore che è una classe di enti indica che almeno un ente della classe è abilitato o usa il servizio, non tutti.
            Enti abilitati e sessioni sono minimi garantiti: le classifiche ufficiali elencano i primi 10 e-service per categoria.
          </div>
          <button type="button" onClick={() => onExplore(esploraQuery)} style={{ ...link, color: "var(--pa-blue)", fontSize: 12, marginTop: 12 }}>
            Apri queste relazioni in Esplora
          </button>
        </div>

        <div style={box}>
          <div style={{ ...h3, color: "var(--ink-muted)" }}>Identificativi</div>
          <div style={{ display: "grid", gridTemplateColumns: m ? "1fr" : "180px 1fr", gap: "8px 16px", fontSize: 12.5 }}>
            <span style={{ color: "var(--ink-faint)" }}>Id nel catalogo PDND</span>
            <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {es.catalogId
                ? <>
                    <code className="tabular" style={{ fontSize: 11.5, color: "var(--ink)", wordBreak: "break-all" }}>{es.catalogId}</code>
                    <button type="button" onClick={copia} style={{ ...link, color: "var(--pa-blue)", fontSize: 11, textDecoration: "none" }}>{copiato ? "Copiato" : "Copia"}</button>
                  </>
                : <span style={{ color: "var(--ink-faint)" }}>nessuno: è un tipo di servizio del modello v1</span>}
            </span>
            <span style={{ color: "var(--ink-faint)" }}>Id nel modello</span>
            <code className="tabular" style={{ fontSize: 11.5, color: "var(--ink)" }}>{es.id}</code>
            <span style={{ color: "var(--ink-faint)" }}>Fonte</span>
            <span>
              <a href="https://github.com/italia/pdnd-opendata" target="_blank" rel="noopener" style={{ color: "var(--pa-blue)" }}>italia/pdnd-opendata</a>
              <span style={{ color: "var(--ink-faint)" }}> · catalogo e statistiche ufficiali, CC0 1.0</span>
            </span>
          </div>
        </div>

        {altri.length > 0 && (
          <div style={box}>
            <div style={{ ...h3, color: "#06d6a0" }}>Altri e-service di {erog?.name || es.erogatore} ({altri.length})</div>
            {altri.map((s) => (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0", borderBottom: "1px solid rgba(100,160,220,.05)", fontSize: 12.5 }}>
                <button type="button" style={{ ...link, color: "#cbd5e1" }} onClick={() => onOpenEservice(s.id)}>{s.nome}</button>
                <span className="tabular" style={{ fontSize: 11, color: "var(--ink-faint)", whiteSpace: "nowrap" }}>
                  {s.sessioni_min ? `≥ ${breve(s.sessioni_min)} sessioni` : s.enti_abilitati_min ? `≥ ${fmt(s.enti_abilitati_min)} enti` : `${s.fruitori.length} fruitori`}
                </span>
              </div>
            ))}
          </div>
        )}

        <p style={{ fontSize: 10.5, color: "var(--ink-faint)", lineHeight: 1.6 }}>
          Dati del modello v2, snapshot del {SNAPSHOT}. Se usi questi dati, cita il progetto: DOI 10.5281/zenodo.19989954.
        </p>
      </div>
    </div>
  );
}
