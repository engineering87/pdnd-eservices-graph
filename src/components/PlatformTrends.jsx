/**
 * Andamento della PDND: totali ufficiali con la variazione dell'ultimo mese e
 * due serie mensili dal 2022, enti aderenti (cumulati) e sessioni di scambio
 * nel mese. Riguardano l'intera piattaforma, non la selezione della mappa.
 *
 * Un grafico per misura, mai due scale sullo stesso asse. Ogni grafico ha un
 * fumetto al passaggio del puntatore e una tabella con i dati.
 */

import { useMemo, useRef, useState } from "react";
import PDND_DATA from "../data/pdnd-data.json";
import { useIsMobile } from "../utils/useIsMobile";

const P = PDND_DATA.meta?.piattaforma;
const COLORE = "#4d94ff";
const MESI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
const meseAnno = (iso) => { const [a, m] = iso.split("-"); return `${MESI[+m - 1]} ${a}`; };
// Separatore delle migliaia anche a 4 cifre (9.826), coerente con gli altri numeri.
const intero = (n) => Math.round(n).toLocaleString("it-IT", { useGrouping: "always" });
const compatto = (n) =>
  n >= 1e9 ? `${(n / 1e9).toLocaleString("it-IT", { maximumFractionDigits: 2 })} mld`
  : n >= 1e6 ? `${(n / 1e6).toLocaleString("it-IT", { maximumFractionDigits: 1 })} mln`
  : n >= 1e3 ? `${(n / 1e3).toLocaleString("it-IT", { maximumFractionDigits: 1 })} mila`
  : intero(n);

/** Tacche "tonde" per l'asse verticale. */
function tacche(max, n = 4) {
  const grezzo = max / n, p = 10 ** Math.floor(Math.log10(grezzo || 1));
  const passo = [1, 2, 2.5, 5, 10].map((k) => k * p).find((k) => k >= grezzo) || p * 10;
  const quante = Math.ceil(max / passo);
  return Array.from({ length: quante + 1 }, (_, i) => i * passo);
}
const MESI_LUNGHI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const dataLunga = (iso) => { const [a, m, g] = iso.split("-"); return `${+g} ${MESI_LUNGHI[+m - 1]} ${a}`; };

function Tile({ etichetta, valore, delta, nota }) {
  return (
    <div style={{ flex: "1 1 140px", minWidth: 0, padding: "14px 16px", background: "rgba(15,20,35,.6)", border: "1px solid rgba(100,160,220,.08)", borderRadius: 10 }}>
      <div style={{ fontSize: 11, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: .6, marginBottom: 6 }}>{etichetta}</div>
      <div className="tabular" style={{ fontSize: 26, fontWeight: 700, color: "var(--ink)", lineHeight: 1.1 }}>{valore}</div>
      {delta != null && <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 4 }}>{delta}</div>}
      {nota && <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2 }}>{nota}</div>}
    </div>
  );
}

/**
 * Grafico mensile: area (valori cumulati) o barre (valori del mese).
 * Coordinate in un viewBox fisso; il disegno si adatta alla larghezza.
 */
function Grafico({ titolo, sottotitolo, serie, forma, formato }) {
  const m = useIsMobile();
  const svgRef = useRef(null);
  const [attivo, setAttivo] = useState(null);
  const W = 760, H = m ? 240 : 220, sx = 56, dx = 12, alto = 14, basso = 28;
  const max = Math.max(...serie.map(([, v]) => v));
  const yt = tacche(max);
  const ymax = yt[yt.length - 1] || 1;
  const n = serie.length;
  const larghezza = W - sx - dx, altezza = H - alto - basso;
  const banda = larghezza / n;
  const X = (i) => sx + banda * (i + .5);
  const Y = (v) => alto + altezza * (1 - v / ymax);

  // Etichette dell'asse orizzontale: solo gennaio di ogni anno, più il primo mese.
  const etichetteX = serie.map(([d], i) => [d, i]).filter(([d], i) => i === 0 || d.slice(5, 7) === "01");

  const daPuntatore = (e) => {
    const svg = svgRef.current; if (!svg) return;
    const r = svg.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const i = Math.max(0, Math.min(n - 1, Math.floor((x - sx) / banda)));
    setAttivo(i);
  };

  const area = useMemo(() => {
    if (forma !== "area") return null;
    const pts = serie.map(([, v], i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`);
    return { linea: `M${pts.join("L")}`, riempimento: `M${X(0)},${Y(0)}L${pts.join("L")}L${X(n - 1)},${Y(0)}Z` };
    // X e Y dipendono solo da costanti e dalla serie.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serie, forma, H]);

  const ultimo = serie[n - 1];
  const sel = attivo != null ? serie[attivo] : null;

  return (
    <figure style={{ flex: "1 1 420px", minWidth: 0, margin: 0, background: "rgba(15,20,35,.6)", border: "1px solid rgba(100,160,220,.08)", borderRadius: 10, padding: "16px 18px 12px" }}>
      <figcaption style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{titolo}</div>
        <div style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 2 }}>{sottotitolo}</div>
      </figcaption>
      <div style={{ position: "relative" }}>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" role="img"
          aria-label={`${titolo}: da ${meseAnno(serie[0][0])} a ${meseAnno(ultimo[0])}, ultimo valore ${formato(ultimo[1])}`}
          style={{ display: "block", touchAction: "pan-y" }}
          onPointerMove={daPuntatore} onPointerDown={daPuntatore} onPointerLeave={() => setAttivo(null)}>
          {yt.map((t) => (
            <g key={t}>
              <line x1={sx} x2={W - dx} y1={Y(t)} y2={Y(t)} stroke="rgba(120,160,210,.12)" strokeWidth="1" />
              <text x={sx - 8} y={Y(t)} textAnchor="end" dominantBaseline="middle" fontSize="11" fill="#8b9bb0" fontFamily="inherit">{compatto(t)}</text>
            </g>
          ))}
          {etichetteX.map(([d, i]) => (
            <text key={d} x={X(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="#8b9bb0" fontFamily="inherit">{i === 0 ? meseAnno(d) : d.slice(0, 4)}</text>
          ))}
          {forma === "area" && area && (
            <>
              <path d={area.riempimento} fill={COLORE} fillOpacity=".14" />
              <path d={area.linea} fill="none" stroke={COLORE} strokeWidth="2" strokeLinejoin="round" />
            </>
          )}
          {forma === "barre" && serie.map(([d, v], i) => {
            const w = Math.max(1, banda - 2), h = Math.max(0, Y(0) - Y(v));
            return <rect key={d} x={X(i) - w / 2} y={Y(v)} width={w} height={h} rx={Math.min(2, w / 2)} fill={COLORE} fillOpacity={attivo == null || attivo === i ? .9 : .45} />;
          })}
          {sel && (
            <g pointerEvents="none">
              <line x1={X(attivo)} x2={X(attivo)} y1={alto} y2={Y(0)} stroke="rgba(220,230,245,.45)" strokeWidth="1" strokeDasharray="3 3" />
              {forma === "area" && <circle cx={X(attivo)} cy={Y(sel[1])} r="5" fill={COLORE} stroke="#0a0e1a" strokeWidth="2" />}
            </g>
          )}
          {/* Etichetta diretta solo sull'ultimo valore. */}
          {!sel && (
            <text x={X(n - 1)} y={Y(ultimo[1]) - 8} textAnchor="end" fontSize="12" fontWeight="600" fill="var(--ink)" fontFamily="inherit">{formato(ultimo[1])}</text>
          )}
        </svg>
        {sel && (
          <div role="status" style={{
            position: "absolute", top: 0, pointerEvents: "none",
            left: `${(X(attivo) / W) * 100}%`, transform: `translateX(${attivo > n * .6 ? "calc(-100% - 10px)" : "10px"})`,
            background: "#16203a", border: "1px solid var(--border-strong)", borderRadius: 6, padding: "6px 10px", whiteSpace: "nowrap",
            boxShadow: "0 6px 18px rgba(0,0,0,.4)",
          }}>
            <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>{meseAnno(sel[0])}</div>
            <div className="tabular" style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{intero(sel[1])}</div>
          </div>
        )}
      </div>
      <details style={{ marginTop: 6 }}>
        <summary style={{ fontSize: 11.5, color: "var(--ink-faint)", cursor: "pointer" }}>Mostra i dati in tabella</summary>
        <div style={{ maxHeight: 220, overflowY: "auto", marginTop: 6 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr><th style={{ textAlign: "left", color: "var(--ink-faint)", fontWeight: 600, padding: "4px 6px" }}>Mese</th><th style={{ textAlign: "right", color: "var(--ink-faint)", fontWeight: 600, padding: "4px 6px" }}>Valore</th></tr></thead>
            <tbody>
              {[...serie].reverse().map(([d, v]) => (
                <tr key={d}><td style={{ padding: "3px 6px", color: "var(--ink-muted)" }}>{meseAnno(d)}</td><td className="tabular" style={{ padding: "3px 6px", textAlign: "right", color: "var(--ink)" }}>{intero(v)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

export default function PlatformTrends() {
  if (!P?.aderenti?.serie?.length || !P?.sessioni?.serie?.length) return null;
  const al = P.aderenti.serie[P.aderenti.serie.length - 1][0];
  const piu = (x) => (x?.ultimo_mese != null ? `+${intero(x.ultimo_mese)} nell'ultimo mese${x.variazione != null ? ` (+${x.variazione.toLocaleString("it-IT")}%)` : ""}` : null);

  return (
    <section style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap", marginBottom: 12 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>Andamento della PDND</h2>
        <span style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>
          Intera piattaforma, dati ufficiali PagoPA al {dataLunga(al)}. Non dipendono dalla selezione della mappa.
        </span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <Tile etichetta="Enti aderenti" valore={intero(P.aderenti.totale ?? P.aderenti.serie.at(-1)[1])} delta={piu(P.aderenti)} />
        <Tile etichetta="E-service pubblicati" valore={intero(P.eservice.totale)} delta={piu(P.eservice)} />
        <Tile etichetta="Connessioni attive" valore={intero(P.connessioni.totale)} delta={piu(P.connessioni)} />
        <Tile etichetta="Sessioni di scambio" valore={compatto(P.sessioni.totale)} delta={piu(P.sessioni)} nota="dall'avvio della piattaforma" />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        <Grafico titolo="Enti aderenti" sottotitolo="Totale cumulato, mese per mese" serie={P.aderenti.serie} forma="area" formato={intero} />
        <Grafico titolo="Sessioni di scambio al mese" sottotitolo="Scambi di dati avvenuti nel mese" serie={P.sessioni.serie} forma="barre" formato={compatto} />
      </div>
    </section>
  );
}
