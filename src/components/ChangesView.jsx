/**
 * Cosa è cambiato: confronto del grafo attuale con un'istantanea passata.
 *
 * Le istantanee mensili sono ricostruite dai dati aperti di quella data con le
 * regole di oggi (scripts/build-snapshots.mjs), quindi le differenze riflettono
 * la PDND e non il modello. Il modello v1 del report è confrontabile, ma con un
 * avviso: lì cambiano anche le regole. Ogni istantanea si carica solo quando la
 * si sceglie.
 */

import { useEffect, useMemo, useState } from "react";
import PDND_DATA from "../data/pdnd-data.json";
import { compareModels, dataIstantanea } from "../utils/compare";
import { numero, dataLunga } from "../utils/format";

const CARICATORI = import.meta.glob("../data/snapshots/pdnd-data.*.json", { import: "default" });
const V1 = "2026-05-02";
const ISTANTANEE = Object.keys(CARICATORI).map((p) => ({ data: dataIstantanea(p), percorso: p })).filter((x) => x.data).sort((a, b) => b.data.localeCompare(a.data));
const OGGI = PDND_DATA.meta?.ultimo_aggiornamento;

const link = { background: "none", border: "none", padding: 0, color: "var(--ink-soft)", cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", textAlign: "left", textDecoration: "underline", textDecorationColor: "var(--underline)", textUnderlineOffset: 2 };

function Delta({ etichetta, coppia }) {
  const [a, b] = coppia;
  if (a == null || b == null) return null;
  const d = b - a;
  return (
    <div style={{ flex: "1 1 140px", minWidth: 0, padding: "12px 14px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8 }}>
      <div style={{ fontSize: 11, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: .5, marginBottom: 4 }}>{etichetta}</div>
      <div className="tabular" style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)" }}>{d > 0 ? "+" : ""}{numero(d)}</div>
      <div className="tabular" style={{ fontSize: 11.5, color: "var(--ink-muted)" }}>da {numero(a)} a {numero(b)}</div>
    </div>
  );
}

function Lista({ titolo, nota, voci, rendi, vuota }) {
  const [tutte, setTutte] = useState(false);
  const mostrate = tutte ? voci : voci.slice(0, 8);
  return (
    <div style={{ flex: "1 1 320px", minWidth: 0, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>{titolo}</div>
        <div className="tabular" style={{ fontSize: 12, color: "var(--ink-faint)" }}>{voci.length}</div>
      </div>
      {nota && <div style={{ fontSize: 11, color: "var(--ink-faint)", margin: "2px 0 8px", lineHeight: 1.45 }}>{nota}</div>}
      {voci.length === 0 && <div style={{ fontSize: 12, color: "var(--ink-faint)", padding: "6px 0" }}>{vuota}</div>}
      {mostrate.map((v, i) => (
        <div key={i} style={{ fontSize: 12, padding: "5px 0", borderBottom: "1px solid var(--line)", lineHeight: 1.4 }}>{rendi(v)}</div>
      ))}
      {voci.length > 8 && (
        <button type="button" onClick={() => setTutte((t) => !t)} style={{ ...link, color: "var(--pa-blue)", fontSize: 11.5, marginTop: 8, textDecoration: "none" }}>
          {tutte ? "Mostra meno" : `Mostra tutti (${voci.length})`}
        </button>
      )}
    </div>
  );
}

export default function ChangesView({ onOpenEntity, onOpenEservice }) {
  const predefinita = ISTANTANEE.find((x) => x.data !== V1)?.data || ISTANTANEE[0]?.data;
  const [scelta, setScelta] = useState(predefinita);
  const [dati, setDati] = useState(null);
  const [errore, setErrore] = useState(null);

  useEffect(() => {
    const voce = ISTANTANEE.find((x) => x.data === scelta);
    if (!voce) return;
    let vivo = true;
    CARICATORI[voce.percorso]()
      .then((d) => { if (vivo) { setDati({ data: scelta, modello: d }); setErrore(null); } })
      .catch(() => { if (vivo) setErrore("Impossibile caricare l'istantanea scelta."); });
    return () => { vivo = false; };
  }, [scelta]);

  const diff = useMemo(() => (dati && dati.data === scelta ? compareModels(dati.modello, PDND_DATA) : null), [dati, scelta]);
  const nelLive = useMemo(() => new Set(PDND_DATA.eservices.map((s) => s.id)), []);
  const entiLive = useMemo(() => new Set(PDND_DATA.enti.map((e) => e.id)), []);

  if (!ISTANTANEE.length) return null;

  const ente = (id, nome) => (entiLive.has(id) ? <button type="button" style={link} onClick={() => onOpenEntity(id)}>{nome}</button> : nome);
  const es = (v) => (
    <>
      {nelLive.has(v.id) ? <button type="button" style={link} onClick={() => onOpenEservice(v.id)}>{v.nome}</button> : <span style={{ color: "var(--ink-soft)" }}>{v.nome}</span>}
      <span style={{ display: "block", fontSize: 10.5, color: "var(--ink-faint)" }}>{v.erogatoreNome}</span>
    </>
  );
  const leg = (v) => <span style={{ color: "var(--ink-soft)" }}>{ente(v.erogatore, v.erogatoreNome)} <span style={{ color: "var(--ink-faint)" }}>→</span> {ente(v.fruitore, v.fruitoreNome)}</span>;

  return (
    <section style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>Cosa è cambiato</h2>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--ink-muted)" }}>
          dal
          <select value={scelta} onChange={(e) => setScelta(e.target.value)}
            style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--ink)", fontFamily: "inherit", fontSize: 12.5, padding: "5px 8px" }}>
            {ISTANTANEE.map((x) => <option key={x.data} value={x.data}>{dataLunga(x.data)}{x.data === V1 ? " (modello v1 del report)" : ""}</option>)}
          </select>
          {OGGI && <>al {dataLunga(OGGI)}</>}
        </label>
      </div>
      <p style={{ fontSize: 11.5, color: "var(--ink-faint)", lineHeight: 1.55, maxWidth: 900, marginBottom: 14 }}>
        {scelta === V1
          ? "Attenzione: il modello v1 del report usava regole diverse (meno enti, tipi di servizio invece di e-service del catalogo). Le differenze riflettono sia la PDND sia il cambio di modello."
          : "Le istantanee sono ricostruite dai dati aperti ufficiali di quella data con le regole di oggi: le differenze riflettono i cambiamenti della PDND, non del modello. La mappa rappresenta una selezione: un servizio può entrare o uscire perché è nuovo, perché è stato ritirato o perché è cambiato il suo uso."}
      </p>

      {errore && <div style={{ fontSize: 12.5, color: "var(--ink-muted)" }}>{errore}</div>}
      {!diff && !errore && <div role="status" style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>Caricamento…</div>}
      {diff && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
            <Delta etichetta="Righe del catalogo" coppia={diff.totali.catalogo} />
            <Delta etichetta="E-service nella mappa" coppia={diff.totali.eservice} />
            <Delta etichetta="Relazioni" coppia={diff.totali.relazioni} />
            <Delta etichetta="Legami distinti" coppia={diff.totali.legami} />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <Lista titolo="Servizi con più nuove sessioni" nota="Sessioni di scambio registrate nel periodo (differenza dei minimi garantiti)."
              voci={diff.sessioni} vuota="Nessun dato di sessioni confrontabile."
              rendi={(v) => (
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ minWidth: 0 }}>{es(v)}</span>
                  <span className="tabular" style={{ color: "var(--ink)", fontWeight: 600, whiteSpace: "nowrap" }}>+{numero(v.nuove)}</span>
                </div>
              )} />
            <Lista titolo="Nuovi legami" nota="Coppie erogatore → fruitore che prima non c'erano." voci={diff.legamiAggiunti} vuota="Nessuno." rendi={leg} />
            <Lista titolo="Legami scomparsi" voci={diff.legamiRimossi} vuota="Nessuno." rendi={leg} />
            <Lista titolo="E-service entrati nella mappa" voci={diff.esAggiunti} vuota="Nessuno." rendi={es} />
            <Lista titolo="E-service usciti dalla mappa" voci={diff.esRimossi} vuota="Nessuno." rendi={es} />
            {(diff.entiAggiunti.length > 0 || diff.entiRimossi.length > 0) && (
              <Lista titolo="Enti aggiunti o rimossi" voci={[...diff.entiAggiunti.map((e) => ({ ...e, segno: "+" })), ...diff.entiRimossi.map((e) => ({ ...e, segno: "−" }))]}
                vuota="Nessuno." rendi={(v) => <span style={{ color: "var(--ink-soft)" }}>{v.segno} {v.nome}</span>} />
            )}
          </div>
        </>
      )}
    </section>
  );
}
