/**
 * La rete nel tempo: misure di rete per ogni istantanea mensile e per il grafo
 * attuale, da src/data/network-history.json (generato da npm run export). Le
 * istantanee sono ricostruite con le regole di oggi, quindi le variazioni
 * riflettono la PDND e non cambi di metodo.
 */

import STORIA from "../data/network-history.json";
import PDND_DATA from "../data/pdnd-data.json";
import { numero, meseAnno, dataLunga } from "../utils/format";
import { useIsMobile } from "../utils/useIsMobile";

const NOMI = new Map(PDND_DATA.enti.map((e) => [e.id, e.name]));
const SERIE = STORIA.serie;
const pct = (x) => `${(x * 100).toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`;
const dec = (x) => x.toLocaleString("it-IT", { maximumFractionDigits: 3, minimumFractionDigits: 3 });

const MISURE = [
  { chiave: "archi", etichetta: "Relazioni distinte", fmt: numero, spiega: "Coppie erogatore → fruitore collegate da almeno un e-service." },
  { chiave: "densita", etichetta: "Densità", fmt: dec, spiega: "Relazioni presenti sul massimo possibile fra i nodi." },
  { chiave: "reciprocita", etichetta: "Reciprocità", fmt: pct, spiega: "Relazioni A → B per cui esiste anche B → A." },
  { chiave: "quota_primi_3", etichetta: "Quota dei primi 3 erogatori", fmt: pct, spiega: "Concentrazione: parte delle relazioni che partono dai tre erogatori più collegati." },
  { chiave: "ponte", etichetta: "Intermediazione massima", fmt: (p) => (p ? dec(p.valore) : "—"), valore: (r) => r.ponte?.valore ?? 0, spiega: "Betweenness dell'ente più centrale come ponte." },
  { chiave: "modularita", etichetta: "Modularità delle comunità", fmt: dec, spiega: "Quanto sono separati i gruppi trovati con il metodo di Louvain." },
];

function Linea({ valori, colore, w = 120 }) {
  const min = Math.min(...valori), max = Math.max(...valori);
  const h = 28, span = max - min || 1;
  const punti = valori.map((v, i) => `${(i / Math.max(1, valori.length - 1)) * w},${h - 3 - ((v - min) / span) * (h - 6)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" style={{ display: "block", flex: "none" }}>
      <polyline points={punti} fill="none" stroke={colore} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export default function NetworkHistory() {
  const m = useIsMobile();
  if (SERIE.length < 2) return null;
  const primo = SERIE[0], ultimo = SERIE[SERIE.length - 1];
  const stessiPrimi = SERIE.every((r) => r.primi_3.join() === ultimo.primi_3.join());
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: m ? "16px 14px" : "20px 22px", flex: "1 1 100%", minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--acc-green)", textTransform: "uppercase", letterSpacing: .8, marginBottom: 6 }}>La rete nel tempo</div>
      <p style={{ fontSize: 12.5, color: "var(--ink-muted)", lineHeight: 1.6, marginBottom: 14, maxWidth: 760 }}>
        Le stesse misure calcolate su ogni istantanea mensile, dal {dataLunga(primo.data)} al {dataLunga(ultimo.data)}.
        {stessiPrimi && <> I tre erogatori più collegati restano sempre {ultimo.primi_3.map((id) => NOMI.get(id) || id).join(", ")}.</>}
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
        <caption style={{ position: "absolute", left: -9999 }}>Misure di rete per data</caption>
        <thead>
          <tr style={{ fontSize: 10.5, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: .5, textAlign: "left" }}>
            <th scope="col" style={{ padding: "4px 8px 6px 0", fontWeight: 600 }}>Misura</th>
            <th scope="col" style={{ padding: "4px 8px 6px", fontWeight: 600, textAlign: "right" }}>{meseAnno(primo.data)}</th>
            <th scope="col" style={{ padding: "4px 8px 6px", fontWeight: 600 }}>Andamento</th>
            <th scope="col" style={{ padding: "4px 0 6px 8px", fontWeight: 600, textAlign: "right" }}>{ultimo.attuale ? "Oggi" : meseAnno(ultimo.data)}</th>
          </tr>
        </thead>
        <tbody>
          {MISURE.map((mi) => {
            const valori = SERIE.map((r) => (mi.valore ? mi.valore(r) : r[mi.chiave]));
            return (
              <tr key={mi.chiave} style={{ borderTop: "1px solid var(--line)" }}>
                <th scope="row" style={{ padding: "8px 8px 8px 0", fontWeight: 400, textAlign: "left", color: "var(--ink-soft)" }}>
                  {mi.etichetta}
                  {!m && <span style={{ display: "block", fontSize: 10.5, color: "var(--ink-faint)", lineHeight: 1.4 }}>{mi.spiega}</span>}
                </th>
                <td className="tabular" style={{ padding: 8, textAlign: "right", color: "var(--ink-muted)", whiteSpace: "nowrap" }}>{mi.fmt(primo[mi.chiave])}</td>
                <td style={{ padding: 8 }}><Linea valori={valori} colore="var(--acc-green)" w={m ? 56 : 120} /></td>
                <td className="tabular" style={{ padding: "8px 0 8px 8px", textAlign: "right", color: "var(--ink)", fontWeight: 700, whiteSpace: "nowrap" }}>{mi.fmt(ultimo[mi.chiave])}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 10, lineHeight: 1.5 }}>
        Istantanee ricostruite dai dati aperti di ogni data con le regole di oggi; il modello v1 del report (maggio 2026) è escluso
        perché costruito con regole diverse. Ogni linea usa una scala propria, per rendere visibili anche piccole variazioni. Ente ponte: {ultimo.ponte ? NOMI.get(ultimo.ponte.id) || ultimo.ponte.id : "—"}.
      </div>
    </div>
  );
}
