/**
 * Analisi di rete nella scheda Numeri: matrice erogatori × classi di enti,
 * centralità di intermediazione, reciprocità e distribuzione dei gradi.
 *
 * Tutte le misure usano gli archi distinti erogatore → fruitore. Le classi di
 * enti si possono escludere, perché un nodo che rappresenta migliaia di enti
 * altera grado e intermediazione rispetto a un grafo di enti singoli.
 */

import { useMemo, useState } from "react";
import PDND_DATA from "../data/pdnd-data.json";
import {
  distinctAdjacency, degrees, reciprocity, betweenness, degreeHistogram, providerMatrix,
} from "../utils/networkMetrics";
import { useIsMobile } from "../utils/useIsMobile";

const ENTI = new Map(PDND_DATA.enti.map((e) => [e.id, e]));
const nome = (id) => ENTI.get(id)?.name || id;
const fmt = (n) => n.toLocaleString("it-IT");
const breve = (n) => n >= 1e6 ? `${(n / 1e6).toLocaleString("it-IT", { maximumFractionDigits: 1 })} M` : n >= 1e3 ? `${Math.round(n / 1e3)} k` : fmt(n);

// Etichette brevi per le colonne della matrice.
const BREVI = {
  comuni_agg: "Comuni", regioni_agg: "Regioni", province_agg: "Province", scuole_agg: "Scuole",
  universita_agg: "Università", sanita_agg: "Sanità", gestori_agg: "Gestori", privati_agg: "Privati",
  pa_locali_agg: "PA locali", pa_centrali_agg: "PA centrali",
};
const CLASSI = PDND_DATA.enti.filter((e) => e.aggregato).sort((a, b) => (b.aderenti || 0) - (a.aderenti || 0));
const COLONNE = [...CLASSI.map((e) => ({ id: e.id, label: BREVI[e.id] || e.name.replace(" (aggregati)", ""), title: e.name })),
  { id: "__individuali", label: "Enti singoli", title: "Enti rappresentati individualmente" }];
const colonnaDi = (id) => (ENTI.get(id)?.aggregato ? id : "__individuali");

function Card({ title, color, children, wide }) {
  return (
    <div style={{ background: "rgba(15,20,35,.6)", border: "1px solid rgba(100,160,220,.08)", borderRadius: 10, padding: "20px 22px", flex: wide ? "1 1 100%" : "1 1 340px", minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: .8, marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );
}

const nota = { fontSize: 10, color: "var(--ink-faint)", marginTop: 10, lineHeight: 1.5 };

function Istogramma({ bins, colore, titolo }) {
  const max = Math.max(1, ...bins.map((b) => b[1]));
  return (
    <div style={{ flex: "1 1 220px" }}>
      <div style={{ fontSize: 11, color: "var(--ink-muted)", marginBottom: 6 }}>{titolo}</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 90 }}>
        {bins.map(([da, n]) => (
          <div key={da} title={`grado ${da}–${da + 4}: ${n} nodi`} style={{ flex: 1, height: `${(n / max) * 100}%`, minHeight: n ? 2 : 0, background: colore, borderRadius: "2px 2px 0 0", opacity: .85 }} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--ink-faint)", marginTop: 3 }}>
        <span>0</span><span>{bins[bins.length - 1][0] + 4}</span>
      </div>
    </div>
  );
}

export default function NetworkAnalysis() {
  const m = useIsMobile();
  const [escludiClassi, setEscludiClassi] = useState(false);
  const [metrica, setMetrica] = useState("eservice");

  const adj = useMemo(() => distinctAdjacency(PDND_DATA, { escludiAggregati: escludiClassi }), [escludiClassi]);
  const { out, inn } = useMemo(() => degrees(adj), [adj]);
  const bc = useMemo(() => betweenness(adj), [adj]);
  const reciproca = useMemo(() => reciprocity(adj), [adj]);
  const topBc = useMemo(() => [...bc].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 10), [bc]);
  const istOut = useMemo(() => degreeHistogram(out, 5), [out]);
  const istIn = useMemo(() => degreeHistogram(inn, 5), [inn]);

  // La matrice usa sempre il grafo completo: il suo scopo è proprio mostrare
  // quali classi di enti raggiunge ciascun erogatore.
  const erogatori = useMemo(() => {
    const full = degrees(distinctAdjacency(PDND_DATA)).out;
    return [...full].filter(([id, d]) => d > 0 && !ENTI.get(id)?.aggregato).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([id]) => id);
  }, []);
  const matrice = useMemo(() => providerMatrix(PDND_DATA, erogatori, colonnaDi), [erogatori]);
  const maxCella = useMemo(() => {
    let mx = 1;
    for (const riga of matrice.values()) for (const c of riga.values()) mx = Math.max(mx, c[metrica]);
    return mx;
  }, [matrice, metrica]);

  const toggle = (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--ink-muted)", cursor: "pointer" }}>
      <input type="checkbox" checked={escludiClassi} onChange={(e) => setEscludiClassi(e.target.checked)} />
      Escludi le classi di enti
    </label>
  );


  return (
    <section style={{ marginTop: 28 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap", marginBottom: 12 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>Analisi di rete</h2>
        <span style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>Calcolata sugli archi distinti erogatore → fruitore del modello.</span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        <Card title="Chi raggiunge quali enti" color="#4fc3f7" wide>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>I 15 erogatori con più fruitori, per classe di enti raggiunta. Valore:</span>
            {[["eservice", "e-service"], ["sessioni", "sessioni osservate"]].map(([k, l]) => (
              <button key={k} type="button" aria-pressed={metrica === k} onClick={() => setMetrica(k)}
                style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, cursor: "pointer", fontFamily: "inherit", background: metrica === k ? "rgba(79,195,247,.12)" : "transparent", color: metrica === k ? "#4fc3f7" : "var(--ink-faint)", border: `1px solid ${metrica === k ? "#4fc3f7" : "var(--border)"}` }}>
                {l}
              </button>
            ))}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "separate", borderSpacing: 2, minWidth: 720, width: "100%" }}>
              <thead>
                <tr>
                  <th />
                  {COLONNE.map((c) => (
                    <th key={c.id} title={c.title} style={{ fontSize: 9.5, fontWeight: 600, color: "var(--ink-faint)", padding: "0 2px 6px", textAlign: "center", whiteSpace: "nowrap" }}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {erogatori.map((id) => (
                  <tr key={id}>
                    <th scope="row" style={{ fontSize: 11.5, fontWeight: 400, color: "#cbd5e1", textAlign: "left", paddingRight: 8, whiteSpace: "nowrap" }}>{nome(id)}</th>
                    {COLONNE.map((c) => {
                      const cella = matrice.get(id).get(c.id);
                      const v = cella ? cella[metrica] : 0;
                      const a = v ? 0.12 + 0.78 * Math.sqrt(v / maxCella) : 0;
                      return (
                        <td key={c.id} title={cella ? `${nome(id)} → ${c.title}: ${cella.eservice} e-service${cella.sessioni ? `, ${fmt(cella.sessioni)} sessioni osservate` : ""}` : `${nome(id)} → ${c.title}: nessun arco`}
                          className="tabular"
                          style={{ textAlign: "center", fontSize: 10.5, padding: "6px 2px", borderRadius: 3, minWidth: 44, background: v ? `rgba(79,195,247,${a})` : "rgba(30,40,60,.35)", color: a > .55 ? "#0a0e1a" : v ? "var(--ink)" : "var(--ink-faint)" }}>
                          {v ? (metrica === "sessioni" ? breve(v) : v) : "·"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={nota}>
            Una cella conta gli e-service dell'erogatore con almeno un arco verso la classe, di qualunque provenienza; le sessioni sono
            quelle osservate dalle statistiche ufficiali, minimi garantiti. Un arco verso una classe non significa che tutti i suoi enti usino il servizio.
          </div>
        </Card>

        <Card title="Enti ponte (intermediazione)" color="#8338ec">
          <div style={{ marginBottom: 12 }}>{toggle}</div>
          {topBc.length === 0 && <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>Nessun nodo sta su cammini fra altri nodi.</div>}
          {topBc.map(([id, v]) => (
            <div key={id} style={{ marginBottom: 9 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                <span style={{ color: "#cbd5e1" }}>{nome(id)}</span>
                <span className="tabular" style={{ color: "#8338ec", fontWeight: 700 }}>{v.toLocaleString("it-IT", { maximumFractionDigits: 3, minimumFractionDigits: 3 })}</span>
              </div>
              <div style={{ height: 6, background: "rgba(30,40,60,.6)", borderRadius: 3 }}>
                <div style={{ height: "100%", width: `${(v / topBc[0][1]) * 100}%`, background: "#8338ec", borderRadius: 3 }} />
              </div>
            </div>
          ))}
          <div style={nota}>
            Quota dei cammini minimi fra le altre coppie di nodi che passano per l'ente (betweenness normalizzata, da 0 a 1).
            Gli enti in cima collegano parti della rete che altrimenti sarebbero lontane.
          </div>
        </Card>

        <Card title="Struttura della rete" color="#06d6a0">
          <div style={{ marginBottom: 12 }}>{toggle}</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            {[
              ["Nodi", adj.size],
              ["Archi distinti", [...adj.values()].reduce((a, s) => a + s.size, 0)],
              ["Reciprocità", `${(reciproca * 100).toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`],
            ].map(([l, v]) => (
              <div key={l} style={{ flex: "1 1 90px", textAlign: "center", padding: "10px 6px", border: "1px solid rgba(100,160,220,.08)", borderRadius: 8 }}>
                <div className="tabular" style={{ fontSize: 18, fontWeight: 700, color: "#06d6a0" }}>{typeof v === "number" ? fmt(v) : v}</div>
                <div style={{ fontSize: 9.5, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: .5, marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: m ? 14 : 20, flexWrap: "wrap" }}>
            <Istogramma bins={istOut} colore="#06d6a0" titolo="Grado in uscita (a quanti nodi eroga)" />
            <Istogramma bins={istIn} colore="var(--pa-blue)" titolo="Grado in entrata (da quanti nodi fruisce)" />
          </div>
          <div style={nota}>
            Reciprocità: quota di archi A → B per cui esiste anche B → A. Gli istogrammi raggruppano i nodi per classi di grado di ampiezza 5.
          </div>
        </Card>
      </div>
    </section>
  );
}
