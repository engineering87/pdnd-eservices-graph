/**
 * Statistiche del modello: densità, conteggi per ruolo, classifiche di
 * erogatori e fruitori, distribuzione per categoria.
 *
 * La densità è calcolata sugli archi distinti erogatore->fruitore, coerente con
 * la definizione del report. Non usa il conteggio delle istanze per e-service,
 * che è più alto perché una stessa coppia di enti può condividere più servizi.
 */

import { useMemo, useState } from "react";
import PDND_DATA from "../data/pdnd-data.json";
import { FORMATI } from "../utils/exportGraph";
import { CATEGORY_COLORS } from "../constants/colors";
import NetworkAnalysis from "./NetworkAnalysis";
import CommunitiesCard from "./CommunitiesCard";
import NetworkHistory from "./NetworkHistory";
import PlatformTrends from "./PlatformTrends";
import ChangesView from "./ChangesView";
import { numero, breve } from "../utils/format";

const ORIGINI = [
  ["documentata", "Documentata", "var(--acc-green)"],
  ["osservata", "Osservata", "var(--acc-cyan)"],
  ["certificata", "Certificata", "var(--acc-blue2)"],
  ["ricostruita", "Ricostruita (v1)", "#c49a9a"],
  ["inferita", "Inferita (AI)", "#ffd166"],
];
const NOMI = new Map(PDND_DATA.enti.map(e => [e.id, e.name]));
const nomeEnte = (id) => NOMI.get(id) || id;

function Card({ title, color, children }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "20px 22px", flex: "1 1 340px", minWidth: 300 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: .8, marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );
}

function Bar({ label, value, max, color, sub, display, onClick }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
        {onClick
          ? <button type="button" onClick={onClick} title="Apri la scheda dell'e-service" style={{ color: "var(--ink-soft)", background: "none", border: "none", padding: 0, font: "inherit", textAlign: "left", cursor: "pointer", textDecoration: "underline", textDecorationColor: "var(--underline)", textUnderlineOffset: 2 }}>{label}</button>
          : <span style={{ color: "var(--ink-soft)" }}>{label}</span>}
        <span style={{ color, fontWeight: 700 }}>{display ?? value}</span>
      </div>
      <div style={{ height: 6, background: "var(--track)", borderRadius: 3 }}>
        <div style={{ height: "100%", width: `${(value / max) * 100}%`, background: color, borderRadius: 3, transition: "width .6s ease" }} />
      </div>
      {sub && <div style={{ fontSize: 9, color: "var(--ink-faint)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function StatsView({ graphData, onOpenEservice, onOpenEntity }) {
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

  // Dati ufficiali di utilizzo (pdnd-opendata): minimi garantiti, perché le
  // classifiche elencano i primi 10 e-service per coppia di categorie di enti.
  const topAdottati = useMemo(() =>
    PDND_DATA.eservices.filter(s => s.enti_abilitati_min > 0)
      .sort((a, b) => b.enti_abilitati_min - a.enti_abilitati_min).slice(0, 10), []);
  const topUsati = useMemo(() =>
    PDND_DATA.eservices.filter(s => s.sessioni_min > 0)
      .sort((a, b) => b.sessioni_min - a.sessioni_min).slice(0, 10), []);
  // Andamento recente: i servizi con la variazione più ampia nei due versi.
  const tendenze = useMemo(() => {
    const con = PDND_DATA.eservices.filter(s => s.tendenza_6m != null);
    return {
      su: con.filter(s => s.tendenza_6m > 0).sort((a, b) => b.tendenza_6m - a.tendenza_6m).slice(0, 5),
      giu: con.filter(s => s.tendenza_6m < 0).sort((a, b) => a.tendenza_6m - b.tendenza_6m).slice(0, 5),
    };
  }, []);
  const perOrigine = useMemo(() => {
    const conta = {};
    PDND_DATA.eservices.forEach(s => (s.archi || []).forEach(a => { conta[a.origine] = (conta[a.origine] || 0) + 1; }));
    return ORIGINI.filter(([k]) => conta[k]).map(([k, nome, col]) => [nome, conta[k], col]);
  }, []);
  const classi = useMemo(() =>
    PDND_DATA.enti.filter(e => e.aggregato && e.aderenti > 0).sort((a, b) => b.aderenti - a.aderenti), []);

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
      <PlatformTrends />
      <ChangesView onOpenEntity={onOpenEntity} onOpenEservice={onOpenEservice} />
      <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", marginBottom: 12 }}>Il modello rappresentato nella mappa</h2>
      <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: 8, background: "rgba(255,209,102,.04)", border: "1px solid rgba(255,209,102,.14)", display: "flex", gap: 12 }}>
        <div style={{ fontSize: 18, color: "var(--cite)", flexShrink: 0, lineHeight: 1 }}>ⓘ</div>
        <div style={{ fontSize: 12, color: "var(--ink-muted)", lineHeight: 1.6 }}>
          I numeri qui sotto si riferiscono al modello, non all'intero catalogo PDND. Accanto agli e-service puntuali del catalogo,
          alcuni record sono <strong style={{ color: "var(--ink)" }}>tipi di servizio</strong>: <em>Albo Pretorio</em> è un singolo record ma corrisponde a circa 1.450 endpoint reali, uno per Comune che lo pubblica.
          Il modello copre circa l'89% degli e-service pubblicati nel catalogo, tra mapping diretto e aggregazione. Adozione e sessioni vengono dalle statistiche ufficiali di PagoPA e sono minimi garantiti.
          Per il dettaglio vedi la sezione <span style={{ color: "var(--cite)" }}>Metodologia</span>.
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        {[
          ["Densità del grafo", density, "var(--acc-violet)", "ρ = |E| / (|V| × (|V|-1))"],
          ["Enti erogatori", nodes.filter(n => n.erogati > 0).length, "var(--acc-green)", "Enti che pubblicano almeno 1 e-service"],
          ["Enti fruitori", nodes.filter(n => n.fruiti > 0).length, "var(--pa-blue)", "Enti che fruiscono almeno 1 e-service"],
          ["Categorie", Object.keys(CATEGORY_COLORS).length, "var(--cite)", "Categorie di enti rappresentate"],
        ].map(([label, val, color, tooltip]) => (
          <div key={label} title={tooltip} style={{ flex: "1 1 160px", textAlign: "center", padding: "14px 10px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10 }}>
            <div style={{ fontSize: 26, fontWeight: 800, color }}>{val}</div>
            <div style={{ fontSize: 10, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: .5, marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        <Card title="Top erogatori" color="var(--acc-green)">
          {topErogatori.map(n => <Bar key={n.id} label={n.name} value={n.erogati} max={topErogatori[0]?.erogati || 1} color="var(--acc-green)" sub={n.categoria} />)}
        </Card>
        <Card title="Top fruitori" color="var(--pa-blue)">
          {topFruitori.map(n => <Bar key={n.id} label={n.name} value={n.fruiti} max={topFruitori[0]?.fruiti || 1} color="var(--pa-blue)" sub={n.categoria} />)}
        </Card>
        <Card title="E-services più fruiti" color="var(--cite)">
          {topEservices.map(es => {
            const erog = PDND_DATA.enti.find(e => e.id === es.erogatore);
            return <Bar key={es.id} onClick={() => onOpenEservice?.(es.id)} label={es.nome} value={es.fruitori.length} max={topEservices[0]?.fruitori.length || 1} color="var(--cite)" sub={`Erogato da ${erog?.name}`} />;
          })}
        </Card>
        <Card title="E-service più adottati (enti abilitati)" color="var(--acc-cyan)">
          {topAdottati.map(es => <Bar key={es.id} onClick={() => onOpenEservice?.(es.id)} label={es.nome} value={es.enti_abilitati_min} display={numero(es.enti_abilitati_min)} max={topAdottati[0]?.enti_abilitati_min || 1} color="var(--acc-cyan)" sub={`Erogato da ${nomeEnte(es.erogatore)} · almeno`} />)}
        </Card>
        <Card title="E-service più usati (sessioni di scambio)" color="var(--acc-violet)">
          {topUsati.map(es => <Bar key={es.id} onClick={() => onOpenEservice?.(es.id)} label={es.nome} value={es.sessioni_min} display={breve(es.sessioni_min)} max={topUsati[0]?.sessioni_min || 1} color="var(--acc-violet)" sub={`Erogato da ${nomeEnte(es.erogatore)} · almeno`} />)}
        </Card>
        {tendenze.su.length > 0 && (
          <Card title="Andamento negli ultimi 6 mesi" color="var(--acc-cyan)">
            <div style={{ fontSize: 11.5, color: "var(--ink-faint)", lineHeight: 1.5, marginBottom: 12 }}>
              Sessioni degli ultimi 6 mesi rispetto ai 6 precedenti, fra i servizi con almeno 100.000 sessioni nel periodo precedente.
            </div>
            {[["In crescita", tendenze.su], ["In calo", tendenze.giu]].map(([titolo, lista]) => lista.length > 0 && (
              <div key={titolo} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: .5, marginBottom: 6 }}>{titolo}</div>
                {lista.map(es => (
                  <div key={es.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", padding: "4px 0", borderBottom: "1px solid var(--line)" }}>
                    <span style={{ minWidth: 0 }}>
                      <button type="button" onClick={() => onOpenEservice?.(es.id)} title="Apri la scheda dell'e-service"
                        style={{ color: "var(--ink-soft)", background: "none", border: "none", padding: 0, font: "inherit", fontSize: 12, textAlign: "left", cursor: "pointer", textDecoration: "underline", textDecorationColor: "var(--underline)", textUnderlineOffset: 2 }}>{es.nome}</button>
                      <span style={{ display: "block", fontSize: 10, color: "var(--ink-faint)" }}>{nomeEnte(es.erogatore)} · {breve(es.sessioni_6m ?? 0)} negli ultimi 6 mesi</span>
                    </span>
                    <span className="tabular" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink)", whiteSpace: "nowrap" }}>
                      {es.tendenza_6m > 0 ? "▲ +" : "▼ "}{es.tendenza_6m.toLocaleString("it-IT", { maximumFractionDigits: 1 })}%
                    </span>
                  </div>
                ))}
              </div>
            ))}
            <div style={{ fontSize: 10, color: "var(--ink-faint)", lineHeight: 1.5 }}>
              Confronto sulle sole categorie di enti presenti in entrambe le classifiche ufficiali. Uno spostamento fra due servizi simili appare come crescita dell'uno e calo dell'altro.
            </div>
          </Card>
        )}
        <Card title="Archi per provenienza" color="var(--acc-blue2)">
          {perOrigine.map(([nome, n, col]) => <Bar key={nome} label={nome} value={n} display={numero(n)} max={Math.max(...perOrigine.map(x => x[1]))} color={col} />)}
          <div style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 8, lineHeight: 1.5 }}>Osservata: connessioni o sessioni realmente registrate dalla PDND verso una classe di enti. Certificata: classe abilitata nel catalogo. Vedi Metodologia.</div>
        </Card>
        <Card title="Classi di enti aderenti" color="#c49a9a">
          {classi.map(e => <Bar key={e.id} label={e.name.replace(" (aggregati)", "")} value={e.aderenti} display={numero(e.aderenti)} max={classi[0]?.aderenti || 1} color={CATEGORY_COLORS[e.categoria] || "#c49a9a"} sub={e.aderenti_fonte} />)}
        </Card>
        <Card title="Distribuzione per categoria" color="var(--pa-blue)">
          {catStats.map(([cat, count]) => <Bar key={cat} label={cat} value={count} max={catStats[0]?.[1] || 1} color={CATEGORY_COLORS[cat] || "#667"} />)}
        </Card>
      </div>

      <NetworkAnalysis />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 14 }}>
        <CommunitiesCard onOpenEntity={onOpenEntity} />
        <NetworkHistory />
      </div>

      <ExportSection />
    </div>
  );
}

/**
 * Esportazione del modello. I file sono generati nel browser dal dato già
 * caricato: nessuna chiamata di rete e nessun servizio esterno.
 */
function ExportSection() {
  const [fatto, setFatto] = useState(null);

  const scarica = (formato) => {
    const contenuto = formato.genera(PDND_DATA);
    const nome = `pdnd-eservices-graph-${formato.id}.${formato.estensione}`;
    const blob = new Blob([contenuto], { type: `${formato.mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setFatto(formato.id);
    setTimeout(() => setFatto(null), 2000);
  };

  return (
    <div style={{ marginTop: 20, padding: "18px 20px", background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 8 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", letterSpacing: .2, marginBottom: 4 }}>Esporta il modello</h2>
      <p style={{ fontSize: 11.5, color: "var(--ink-muted)", lineHeight: 1.55, maxWidth: 720, marginBottom: 14 }}>
        Il grafo in formati di interscambio standard, pronti per Gephi, NetworkX, igraph, R o un foglio
        di calcolo. Ogni arco conserva il campo <em>origine</em> e i nodi aggregati sono marcati come tali:
        le misure di grado su questo modello non sono confrontabili con quelle di un grafo non aggregato.
        Licenza <a href="https://creativecommons.org/licenses/by/4.0/deed.it" target="_blank" rel="noopener" style={{ color: "var(--pa-blue)" }}>CC BY 4.0</a>:
        riusali citando PDND E-Services Graph e il report.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {FORMATI.map(f => (
          <button
            key={f.id}
            onClick={() => scarica(f)}
            title={f.nota}
            style={{
              padding: "8px 14px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
              background: fatto === f.id ? "var(--pa-blue-soft)" : "transparent",
              border: `1px solid ${fatto === f.id ? "var(--pa-blue)" : "var(--border)"}`,
              color: fatto === f.id ? "var(--pa-blue)" : "var(--ink-muted)",
              fontSize: 11.5, fontWeight: 600, letterSpacing: .2,
            }}
          >
            {fatto === f.id ? "Scaricato" : f.etichetta}
            <span style={{ display: "block", fontSize: 9, fontWeight: 400, color: "var(--ink-faint)", marginTop: 2 }}>{f.nota}</span>
          </button>
        ))}
      </div>
      <p style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 12 }}>
        Dati di origine CC0 1.0 (italia/pdnd-opendata). Se usi questi file, cita il progetto: DOI 10.5281/zenodo.19989954.
      </p>
    </div>
  );
}
