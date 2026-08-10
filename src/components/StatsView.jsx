/**
 * Statistiche del modello: densità, conteggi per ruolo, classifiche di
 * erogatori e fruitori, distribuzione per categoria.
 *
 * La densità è calcolata sugli archi distinti erogatore->fruitore, coerente con
 * la definizione del report. Non usa il conteggio delle istanze per e-service,
 * che è più alto perché una stessa coppia di enti può condividere più servizi.
 */

import { useMemo } from "react";
import PDND_DATA from "../data/pdnd-data.json";
import { CATEGORY_COLORS } from "../constants/colors";

function Card({ title, color, children }) {
  return (
    <div style={{ background: "rgba(15,20,35,.6)", border: "1px solid rgba(100,160,220,.08)", borderRadius: 10, padding: "20px 22px", flex: "1 1 340px", minWidth: 300 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: .8, marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );
}

function Bar({ label, value, max, color, sub }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
        <span style={{ color: "#cbd5e1" }}>{label}</span>
        <span style={{ color, fontWeight: 700 }}>{value}</span>
      </div>
      <div style={{ height: 6, background: "rgba(30,40,60,.6)", borderRadius: 3 }}>
        <div style={{ height: "100%", width: `${(value / max) * 100}%`, background: `linear-gradient(90deg, ${color}, ${color}88)`, borderRadius: 3, transition: "width .6s ease" }} />
      </div>
      {sub && <div style={{ fontSize: 9, color: "var(--ink-faint)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function StatsView({ graphData }) {
  const { nodes } = graphData;

  const catStats = useMemo(() => {
    const map = {};
    nodes.forEach(n => { map[n.categoria] = (map[n.categoria] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [nodes]);

  const topErogatori = useMemo(() =>
    [...nodes].filter(n => n.erogati > 0).sort((a, b) => b.erogati - a.erogati).slice(0, 10), [nodes]);

  const topFruitori = useMemo(() =>
    [...nodes].filter(n => n.fruiti > 0).sort((a, b) => b.fruiti - a.fruiti).slice(0, 10), [nodes]);

  const topEservices = useMemo(() =>
    [...PDND_DATA.eservices].sort((a, b) => b.fruitori.length - a.fruitori.length).slice(0, 10), []);

  // Densità calcolata sugli archi DISTINTI erogatore→fruitore, coerente con la
  // definizione del paper (|E| = coppie dirette distinte, non istanze per e-service).
  const density = useMemo(() => {
    const n = nodes.length;
    const distinct = new Set();
    PDND_DATA.eservices.forEach((es) =>
      (es.fruitori || []).forEach((f) => distinct.add(`${es.erogatore}->${f}`))
    );
    return (distinct.size / (n * (n - 1))).toFixed(4);
  }, [nodes]);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
      <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: 8, background: "rgba(255,209,102,.04)", border: "1px solid rgba(255,209,102,.14)", display: "flex", gap: 12 }}>
        <div style={{ fontSize: 18, color: "var(--cite)", flexShrink: 0, lineHeight: 1 }}>ⓘ</div>
        <div style={{ fontSize: 12, color: "var(--ink-muted)", lineHeight: 1.6 }}>
          I numeri qui sotto si riferiscono al modello a <strong style={{ color: "var(--ink)" }}>tipi di servizio</strong>, non agli endpoint del catalogo PDND.
          Un servizio come <em>Albo Pretorio</em> è un singolo nodo nel grafo ma corrisponde a circa 1.450 endpoint reali, uno per Comune che lo pubblica.
          Il catalogo ufficiale conta 14.102 API pubblicate; il modello copre ~89% del catalogo via mapping diretto e aggregazione.
          Per il dettaglio vedi la sezione <span style={{ color: "var(--cite)" }}>Metodologia</span>.
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        {[
          ["Densità del grafo", density, "#8338ec", "ρ = |E| / (|V| × (|V|-1))"],
          ["Enti erogatori", nodes.filter(n => n.erogati > 0).length, "#06d6a0", "Enti che pubblicano almeno 1 e-service"],
          ["Enti fruitori", nodes.filter(n => n.fruiti > 0).length, "var(--pa-blue)", "Enti che fruiscono almeno 1 e-service"],
          ["Categorie", Object.keys(CATEGORY_COLORS).length, "var(--cite)", "Categorie di enti rappresentate"],
        ].map(([label, val, color, tooltip]) => (
          <div key={label} title={tooltip} style={{ flex: "1 1 160px", textAlign: "center", padding: "14px 10px", background: "rgba(15,20,35,.6)", border: "1px solid rgba(100,160,220,.08)", borderRadius: 10 }}>
            <div style={{ fontSize: 26, fontWeight: 800, color }}>{val}</div>
            <div style={{ fontSize: 10, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: .5, marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        <Card title="Top erogatori" color="#06d6a0">
          {topErogatori.map(n => <Bar key={n.id} label={n.name} value={n.erogati} max={topErogatori[0]?.erogati || 1} color="#06d6a0" sub={n.categoria} />)}
        </Card>
        <Card title="Top fruitori" color="var(--pa-blue)">
          {topFruitori.map(n => <Bar key={n.id} label={n.name} value={n.fruiti} max={topFruitori[0]?.fruiti || 1} color="var(--pa-blue)" sub={n.categoria} />)}
        </Card>
        <Card title="E-services più fruiti" color="var(--cite)">
          {topEservices.map(es => {
            const erog = PDND_DATA.enti.find(e => e.id === es.erogatore);
            return <Bar key={es.id} label={es.nome} value={es.fruitori.length} max={topEservices[0]?.fruitori.length || 1} color="var(--cite)" sub={`Erogato da ${erog?.name}`} />;
          })}
        </Card>
        <Card title="Distribuzione per categoria" color="#8338ec">
          {catStats.map(([cat, count]) => <Bar key={cat} label={cat} value={count} max={catStats[0]?.[1] || 1} color={CATEGORY_COLORS[cat] || "#667"} />)}
        </Card>
      </div>
    </div>
  );
}
