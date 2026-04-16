import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import PDND_DATA from "../data/pdnd-data.json";

const CATEGORY_COLORS = {
  Ministero: "#118ab2", Previdenza: "#06d6a0", Fisco: "#ef476f",
  Digitale: "#8338ec", Lavoro: "#ff6b35", Imprese: "#3d405b",
  Anticorruzione: "#e63946", Trasporti: "#457b9d", Cultura: "#d4a373",
  Statistica: "#81b29a", Tecnologia: "#f2cc8f", Regione: "#3a86a8",
  Comune: "#26547c", "Comuni Aggregati": "#4a7c91",
};

function buildGraph(data) {
  const nodes = data.enti.map((e) => {
    const er = data.eservices.filter((s) => s.erogatore === e.id);
    const fr = data.eservices.filter((s) => s.fruitori.includes(e.id));
    return { ...e, erogati: er.length, fruiti: fr.length, totalConnections: er.reduce((a, s) => a + s.fruitori.length, 0) + fr.length, servizi_erogati: er, servizi_fruiti: fr };
  });
  const links = [], lc = {};
  data.eservices.forEach((es) => es.fruitori.forEach((f) => {
    links.push({ source: es.erogatore, target: f, eservice: es.nome, eserviceId: es.id, versione: es.versione, stato: es.stato, descrizione: es.descrizione });
    const k = [es.erogatore, f].sort().join("--"); lc[k] = (lc[k] || 0) + 1;
  }));
  links.forEach((l) => { const k = [typeof l.source === "object" ? l.source.id : l.source, typeof l.target === "object" ? l.target.id : l.target].sort().join("--"); l.weight = lc[k] || 1; });
  return { nodes, links, linkCounts: lc };
}

// ═══════════════════════════════════════════════════════════════
// HEADER
// ═══════════════════════════════════════════════════════════════
function Header({ stats, activeTab, onTabChange, onAbout }) {
  const tabs = [
    { id: "grafo", label: "Grafo", icon: "◉" },
    { id: "statistiche", label: "Statistiche", icon: "◧" },
    { id: "metodologia", label: "Metodologia", icon: "◪" },
    { id: "guida", label: "Guida", icon: "◈" },
  ];
  return (
    <header style={{ background: "rgba(10,14,26,.85)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(100,160,220,.12)", zIndex: 20, position: "relative" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 28px 12px", flexWrap: "wrap", gap: 16 }}>
        {/* Logo + title */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: "linear-gradient(135deg,#06d6a0,#118ab2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: -1, flexShrink: 0 }}>P</div>
          <div>
            <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: -.4, color: "#f1f5f9" }}>PDND E-Services Graph</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2, lineHeight: 1.4, maxWidth: 420 }}>
              Mappa interattiva dell'interoperabilità tra le Pubbliche Amministrazioni italiane
            </div>
          </div>
        </div>
        {/* Stat cards + About */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {[
            ["Enti", stats.enti, "#06d6a0", "Enti aderenti rappresentati"],
            ["E-Services", stats.es, "#ffd166", "Servizi digitali mappati"],
            ["Connessioni", stats.conn, "#ef476f", "Relazioni erogatore–fruitore"],
          ].map(([label, value, color, tooltip]) => (
            <div key={label} title={tooltip} style={{ textAlign: "center", padding: "8px 16px", background: "rgba(30,40,60,.4)", borderRadius: 8, border: `1px solid ${color}15`, minWidth: 80 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
              <div style={{ color: "#64748b", fontSize: 9, letterSpacing: .6, textTransform: "uppercase", marginTop: 4 }}>{label}</div>
            </div>
          ))}
          <button onClick={onAbout} title="Informazioni sull'applicazione" style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(30,40,60,.4)", border: "1px solid rgba(100,160,220,.12)", color: "#64748b", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", letterSpacing: .3, transition: "all .2s" }}
            onMouseEnter={e => { e.target.style.color = "#e2e8f0"; e.target.style.borderColor = "rgba(100,160,220,.3)"; }}
            onMouseLeave={e => { e.target.style.color = "#64748b"; e.target.style.borderColor = "rgba(100,160,220,.12)"; }}
          >Info</button>
        </div>
      </div>
      {/* Tab navigation */}
      <div style={{ display: "flex", padding: "0 28px", gap: 2 }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => onTabChange(tab.id)}
            style={{
              padding: "9px 20px", fontSize: 12, fontWeight: 600, cursor: "pointer",
              background: activeTab === tab.id ? "rgba(100,160,220,.1)" : "transparent",
              color: activeTab === tab.id ? "#e2e8f0" : "#64748b",
              border: "none", borderBottom: activeTab === tab.id ? "2px solid #06d6a0" : "2px solid transparent",
              letterSpacing: .3, transition: "all .2s",
            }}
            onMouseEnter={e => { if (activeTab !== tab.id) e.target.style.color = "#94a3b8"; }}
            onMouseLeave={e => { if (activeTab !== tab.id) e.target.style.color = "#64748b"; }}
          >
            <span style={{ marginRight: 6, opacity: .6 }}>{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>
    </header>
  );
}

// ═══════════════════════════════════════════════════════════════
// FOOTER
// ═══════════════════════════════════════════════════════════════
function Footer() {
  return (
    <footer style={{ background: "rgba(8,11,20,.9)", borderTop: "1px solid rgba(100,160,220,.1)", padding: "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, zIndex: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 11, color: "#64748b" }}>
        <span>Progetto di <span style={{ color: "#94a3b8", fontWeight: 600 }}>Francesco Del Re</span></span>
        <span style={{ opacity: .3 }}>|</span>
        <a href="https://github.com/engineering87/pdnd-eservices-graph" target="_blank" rel="noopener" style={{ color: "#64b5f6", textDecoration: "none" }}>GitHub</a>
        <span style={{ opacity: .3 }}>|</span>
        <a href="https://github.com/engineering87/pdnd-eservices-graph/blob/main/METODOLOGIA.md" target="_blank" rel="noopener" style={{ color: "#64b5f6", textDecoration: "none" }}>Metodologia</a>
        <span style={{ opacity: .3 }}>|</span>
        <span>Licenza AGPL-3.0</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, color: "#475569" }}>
        <span>Dati:</span>
        <a href="https://github.com/italia/pdnd-opendata" target="_blank" rel="noopener" style={{ color: "#64b5f6", textDecoration: "none" }}>italia/pdnd-opendata</a>
        <span style={{ padding: "1px 6px", borderRadius: 3, background: "rgba(6,214,160,.1)", color: "#06d6a0", fontSize: 9, fontWeight: 600 }}>CC0 1.0</span>
      </div>
    </footer>
  );
}

// ═══════════════════════════════════════════════════════════════
// STATS VIEW
// ═══════════════════════════════════════════════════════════════
function StatsView({ graphData }) {
  const { nodes } = graphData;

  const catStats = useMemo(() => {
    const map = {};
    nodes.forEach(n => { map[n.categoria] = (map[n.categoria] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [nodes]);

  const topErogatori = useMemo(() =>
    [...nodes].filter(n => n.erogati > 0).sort((a, b) => b.erogati - a.erogati).slice(0, 10),
    [nodes]);

  const topFruitori = useMemo(() =>
    [...nodes].filter(n => n.fruiti > 0).sort((a, b) => b.fruiti - a.fruiti).slice(0, 10),
    [nodes]);

  const topEservices = useMemo(() =>
    [...PDND_DATA.eservices].sort((a, b) => b.fruitori.length - a.fruitori.length).slice(0, 10),
    []);

  const density = useMemo(() => {
    const n = nodes.length;
    const e = PDND_DATA.eservices.reduce((a, es) => a + es.fruitori.length, 0);
    return (e / (n * (n - 1))).toFixed(3);
  }, [nodes]);

  const Card = ({ title, color, children }) => (
    <div style={{ background: "rgba(15,20,35,.6)", border: "1px solid rgba(100,160,220,.08)", borderRadius: 10, padding: "20px 22px", flex: "1 1 340px", minWidth: 300 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: .8, marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );

  const Bar = ({ label, value, max, color, sub }) => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
        <span style={{ color: "#cbd5e1" }}>{label}</span>
        <span style={{ color, fontWeight: 700 }}>{value}</span>
      </div>
      <div style={{ height: 6, background: "rgba(30,40,60,.6)", borderRadius: 3 }}>
        <div style={{ height: "100%", width: `${(value / max) * 100}%`, background: `linear-gradient(90deg, ${color}, ${color}88)`, borderRadius: 3, transition: "width .6s ease" }} />
      </div>
      {sub && <div style={{ fontSize: 9, color: "#475569", marginTop: 2 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
      {/* Summary row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        {[
          ["Densità del grafo", density, "#8338ec", "ρ = |E| / (|V| × (|V|-1))"],
          ["Enti erogatori", nodes.filter(n => n.erogati > 0).length, "#06d6a0", "Enti che pubblicano almeno 1 e-service"],
          ["Enti fruitori", nodes.filter(n => n.fruiti > 0).length, "#118ab2", "Enti che fruiscono almeno 1 e-service"],
          ["Categorie", Object.keys(CATEGORY_COLORS).length, "#ffd166", "Categorie di enti rappresentate"],
        ].map(([label, val, color, tooltip]) => (
          <div key={label} title={tooltip} style={{ flex: "1 1 160px", textAlign: "center", padding: "14px 10px", background: "rgba(15,20,35,.6)", border: "1px solid rgba(100,160,220,.08)", borderRadius: 10 }}>
            <div style={{ fontSize: 26, fontWeight: 800, color }}>{val}</div>
            <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: .5, marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>
      {/* Cards grid */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        <Card title="Top erogatori" color="#06d6a0">
          {topErogatori.map(n => (
            <Bar key={n.id} label={n.name} value={n.erogati} max={topErogatori[0]?.erogati || 1} color="#06d6a0" sub={n.categoria} />
          ))}
        </Card>
        <Card title="Top fruitori" color="#118ab2">
          {topFruitori.map(n => (
            <Bar key={n.id} label={n.name} value={n.fruiti} max={topFruitori[0]?.fruiti || 1} color="#118ab2" sub={n.categoria} />
          ))}
        </Card>
        <Card title="E-services più fruiti" color="#ffd166">
          {topEservices.map(es => {
            const erog = PDND_DATA.enti.find(e => e.id === es.erogatore);
            return <Bar key={es.id} label={es.nome} value={es.fruitori.length} max={topEservices[0]?.fruitori.length || 1} color="#ffd166" sub={`Erogato da ${erog?.name}`} />;
          })}
        </Card>
        <Card title="Distribuzione per categoria" color="#8338ec">
          {catStats.map(([cat, count]) => (
            <Bar key={cat} label={cat} value={count} max={catStats[0]?.[1] || 1} color={CATEGORY_COLORS[cat] || "#667"} />
          ))}
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// METHODOLOGY VIEW
// ═══════════════════════════════════════════════════════════════
function MethodologyView() {
  const Section = ({ title, children }) => (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", marginBottom: 10, paddingBottom: 8, borderBottom: "1px solid rgba(100,160,220,.08)" }}>{title}</div>
      <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.75 }}>{children}</div>
    </div>
  );

  const Source = ({ name, url, desc, type }) => (
    <div style={{ padding: "10px 14px", marginBottom: 6, borderRadius: 6, background: "rgba(30,40,60,.4)", border: "1px solid rgba(100,160,220,.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{name}</span>
        <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 3, fontWeight: 600, background: type === "ufficiale" ? "rgba(6,214,160,.1)" : "rgba(255,209,102,.1)", color: type === "ufficiale" ? "#06d6a0" : "#ffd166" }}>
          {type === "ufficiale" ? "✓ Dato ufficiale" : "⚠ Ricostruzione"}
        </span>
      </div>
      <div style={{ fontSize: 11, color: "#64748b" }}>{desc}</div>
      {url && <a href={url} target="_blank" rel="noopener" style={{ fontSize: 11, color: "#64b5f6", textDecoration: "none" }}>{url}</a>}
    </div>
  );

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", maxWidth: 800 }}>
      <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Trasparenza metodologica</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", marginBottom: 6 }}>Come sono stati costruiti i dati</div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 28, lineHeight: 1.6 }}>
        Questo progetto si basa esclusivamente su informazioni già pubbliche, rielaborate e messe in relazione.
        Di seguito sono documentate le fonti, le scelte di rappresentazione e le limitazioni note.
      </div>

      <Section title="Fonti dati ufficiali">
        <Source name="Catalogo e-service" url="https://github.com/italia/pdnd-opendata" desc="Elenco completo degli e-service pubblicati sulla PDND con erogatore, attributi di accesso e stato — aggiornamento quotidiano su dati.gov.it" type="ufficiale" />
        <Source name="Aderenti PDND" url="https://github.com/italia/pdnd-opendata" desc="Lista di tutti gli enti aderenti alla piattaforma con codice IPA e attributi certificati" type="ufficiale" />
        <Source name="Numeri della PDND" url="https://www.interop.pagopa.it/numeri" desc="Statistiche aggregate su enti, e-service, connessioni e sessioni di scambio" type="ufficiale" />
      </Section>

      <Section title="Ricostruzione delle connessioni">
        <div style={{ padding: "12px 16px", borderRadius: 8, background: "rgba(255,209,102,.04)", border: "1px solid rgba(255,209,102,.12)", marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: "#ffd166", fontWeight: 600, marginBottom: 6 }}>⚠ Nota importante</div>
          <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
            I dataset open data della PDND <strong style={{ color: "#e2e8f0" }}>non pubblicano</strong> le coppie puntuali erogatore–fruitore.
            Le relazioni (archi) rappresentate nel grafo sono state ricostruite tramite modelli AI,
            incrociando le seguenti fonti documentali pubbliche:
          </div>
        </div>
        <Source name="Campo 'attributes' del catalogo" desc="Ogni e-service contiene le categorie di enti autorizzati a fruire (es. 'Pubbliche Amministrazioni', 'Comuni')" type="ricostruzione" />
        <Source name="Circolari ANPR" desc="Circolare DAIT n.73/2023 (Comuni) e n.61/2025 (Regioni) — casi d'uso e finalità approvate" type="ricostruzione" />
        <Source name="Presentazione ANCI/DTD" url="https://www.anci.it/wp-content/uploads/Presentazione-PDND_ANPR_ANCI_sett.2023.pdf" desc="26 casi d'uso documentati con flussi erogatore–fruitore espliciti" type="ricostruzione" />
        <Source name="Manuale SSU Unioncamere" url="https://catalogo.impresainungiorno.gov.it/assets/config/files/manuale_operativo_Eservice_CatalogoSSU.pdf" desc="6 e-service del Catalogo SSU con erogatore e fruitori documentati" type="ricostruzione" />
      </Section>

      <Section title="Aggregazione dei Comuni">
        <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.75 }}>
          Il catalogo PDND contiene 2.000+ API, la maggior parte delle quali sono servizi standard replicati
          da ciascuno dei ~7.500 Comuni aderenti (Albo Pretorio, Pratiche SUAP, Numerazione Civica, ecc.).
          Rappresentarli tutti avrebbe prodotto un grafo illeggibile.
        </div>
        <div style={{ margin: "14px 0", padding: "12px 16px", borderRadius: 8, background: "rgba(30,40,60,.4)", border: "1px solid rgba(100,160,220,.06)" }}>
          <div style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 600, marginBottom: 8 }}>Scelta adottata</div>
          <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
            I Comuni minori sono aggregati in un <strong style={{ color: "#4a7c91" }}>unico nodo</strong> chiamato "Comuni (aggregati)".
            6 grandi Comuni (Milano, Roma, Napoli, Bologna, Genova, Padova) sono mantenuti come nodi individuali
            perché erogano anche servizi specifici non standard.
          </div>
        </div>
      </Section>

      <Section title="Utilizzo di modelli AI">
        <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.75 }}>
          I modelli AI sono stati utilizzati come strumento per incrociare le fonti documentali, estrarre informazioni
          da documenti non strutturati e collegare il campo <code style={{ fontSize: 11, padding: "1px 5px", borderRadius: 3, background: "rgba(30,40,60,.6)", color: "#e2e8f0" }}>attributes</code> del catalogo con la documentazione istituzionale.
          I modelli non hanno generato informazioni autonomamente: ogni connessione è riconducibile a fonti pubbliche verificabili.
        </div>
      </Section>

      <Section title="Limitazioni note">
        {[
          "Le connessioni rappresentano relazioni documentate o inferite, non necessariamente accordi di interoperabilità attivi e verificati sulla piattaforma.",
          "I Comuni aggregati non indicano che tutti i 7.500 Comuni fruiscono effettivamente di ogni servizio.",
          "Le Regioni incluse sono un campione rappresentativo, non l'intero insieme.",
          "Le versioni degli e-service potrebbero non corrispondere all'ultima versione attiva nel catalogo.",
        ].map((text, i) => (
          <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: 12 }}>
            <span style={{ color: "#ef476f", flexShrink: 0, marginTop: 2 }}>•</span>
            <span>{text}</span>
          </div>
        ))}
      </Section>

      <div style={{ padding: "14px 16px", borderRadius: 8, background: "rgba(100,160,220,.04)", border: "1px solid rgba(100,160,220,.1)" }}>
        <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
          La documentazione completa è disponibile nel file{" "}
          <a href="https://github.com/engineering87/pdnd-eservices-graph/blob/main/METODOLOGIA.md" target="_blank" rel="noopener" style={{ color: "#64b5f6", textDecoration: "none", fontWeight: 600 }}>METODOLOGIA.md</a> del repository.
          Per segnalare correzioni o contribuire con dati più precisi, apri una{" "}
          <a href="https://github.com/engineering87/pdnd-eservices-graph/issues" target="_blank" rel="noopener" style={{ color: "#64b5f6", textDecoration: "none" }}>Issue su GitHub</a>.
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// GUIDE VIEW
// ═══════════════════════════════════════════════════════════════
function GuideView() {
  const Shortcut = ({ icon, label, desc }) => (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "14px 0", borderBottom: "1px solid rgba(100,160,220,.06)" }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(30,40,60,.5)", border: "1px solid rgba(100,160,220,.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>{desc}</div>
      </div>
    </div>
  );

  const LegendItem = ({ color, label, desc }) => (
    <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 0" }}>
      <div style={{ width: 12, height: 12, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <div>
        <span style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 600 }}>{label}</span>
        {desc && <span style={{ fontSize: 11, color: "#64748b" }}> — {desc}</span>}
      </div>
    </div>
  );

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", maxWidth: 720 }}>
      <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Guida all'uso</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", marginBottom: 6 }}>Come navigare il grafo</div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 24, lineHeight: 1.6 }}>
        Il grafo rappresenta la rete dell'interoperabilità tra le Pubbliche Amministrazioni italiane.
        Ogni nodo è un ente, ogni arco è un flusso di dati tramite e-service.
      </div>

      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid rgba(100,160,220,.08)" }}>Interazioni</div>
        <Shortcut icon="🖱" label="Click su un nodo" desc="Apre il pannello dettagli con l'elenco degli e-services erogati e fruiti dall'ente selezionato." />
        <Shortcut icon="✋" label="Trascina un nodo" desc="Sposta il nodo nella posizione desiderata. Gli altri nodi si riadattano automaticamente grazie alla simulazione fisica." />
        <Shortcut icon="🔍" label="Scroll (rotellina)" desc="Zoom avanti e indietro. Lo zoom è centrato sulla posizione del cursore." />
        <Shortcut icon="↔" label="Trascina lo sfondo" desc="Clicca e trascina su un'area vuota per spostare l'intera vista del grafo (pan)." />
        <Shortcut icon="🏷" label="Click sulla legenda" desc="Filtra il grafo per categoria: vengono evidenziati solo gli enti della categoria selezionata. Clicca di nuovo per rimuovere il filtro." />
        <Shortcut icon="🔎" label="Barra di ricerca" desc="Cerca un ente per nome. I nodi non corrispondenti vengono attenuati." />
      </div>

      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid rgba(100,160,220,.08)" }}>Come leggere il grafo</div>

        <div style={{ padding: "14px 16px", borderRadius: 8, background: "rgba(30,40,60,.3)", border: "1px solid rgba(100,160,220,.06)", marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", marginBottom: 8 }}>Nodi</div>
          <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7 }}>
            Ogni nodo rappresenta un ente aderente alla PDND. La <strong style={{ color: "#e2e8f0" }}>dimensione</strong> è proporzionale
            al numero totale di connessioni (e-services erogati + fruiti). Il <strong style={{ color: "#e2e8f0" }}>colore</strong> indica
            la categoria dell'ente. Il <strong style={{ color: "#e2e8f0" }}>badge numerico</strong> in alto a destra mostra il conteggio delle connessioni.
          </div>
        </div>

        <div style={{ padding: "14px 16px", borderRadius: 8, background: "rgba(30,40,60,.3)", border: "1px solid rgba(100,160,220,.06)", marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", marginBottom: 8 }}>Archi</div>
          <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7 }}>
            Ogni arco rappresenta una relazione erogatore→fruitore. La <strong style={{ color: "#e2e8f0" }}>freccia</strong> indica
            la direzione del flusso dati. Lo <strong style={{ color: "#e2e8f0" }}>spessore</strong> è proporzionale al numero
            di e-services condivisi tra i due enti. Gli archi <strong style={{ color: "#e2e8f0" }}>curvi</strong> indicano
            connessioni multiple.
          </div>
        </div>

        <div style={{ padding: "14px 16px", borderRadius: 8, background: "rgba(30,40,60,.3)", border: "1px solid rgba(100,160,220,.06)" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", marginBottom: 8 }}>Layout force-directed</div>
          <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7 }}>
            I nodi si dispongono automaticamente tramite una simulazione fisica: gli enti collegati si attraggono,
            quelli non collegati si respingono. Questo fa emergere naturalmente la struttura della rete —
            hub centrali, cluster tematici, periferia — senza posizionamento manuale.
          </div>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid rgba(100,160,220,.08)" }}>Categorie degli enti</div>
        {Object.entries(CATEGORY_COLORS).map(([cat, col]) => (
          <LegendItem key={cat} color={col} label={cat}
            desc={{
              Ministero: "Ministeri e dipartimenti della PCM",
              Previdenza: "INPS",
              Fisco: "Agenzia delle Entrate, AdE Riscossione",
              Digitale: "AgID, PagoPA",
              Lavoro: "INAIL",
              Imprese: "Unioncamere",
              Anticorruzione: "ANAC",
              Trasporti: "MIT – DG Motorizzazione",
              Cultura: "Ministero della Cultura (I.PaC)",
              Statistica: "ISTAT",
              Tecnologia: "Sogei, Cineca",
              Regione: "Regioni, Province Autonome",
              Comune: "Grandi Comuni individuali",
              "Comuni Aggregati": "~7.500 Comuni minori aggregati",
            }[cat]}
          />
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// GRAPH VIEW (canvas logic preserved)
// ═══════════════════════════════════════════════════════════════
function GraphView() {
  const canvasRef = useRef(null);
  const [dim, setDim] = useState({ w: 960, h: 700 });
  const [selNode, setSelNode] = useState(null);
  const [hovNode, setHovNode] = useState(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("Tutte");
  const simRef = useRef(null);
  const nodesRef = useRef([]);
  const linksRef = useRef([]);
  const tRef = useRef({ x: 0, y: 0, k: 1.5 });
  const dragRef = useRef(null);
  const panRef = useRef(null);
  const afRef = useRef(null);
  const lcRef = useRef({});
  const graph = useRef(buildGraph(PDND_DATA));
  const cats = useMemo(() => ["Tutte", ...new Set(PDND_DATA.enti.map(e => e.categoria))], []);

  useEffect(() => {
    const { nodes, links, linkCounts } = graph.current;
    lcRef.current = linkCounts;
    const cx = dim.w / 2, cy = dim.h / 2;
    nodes.forEach(n => { n.x = cx + (Math.random() - .5) * 500; n.y = cy + (Math.random() - .5) * 400; });
    nodesRef.current = nodes;
    linksRef.current = links.map(l => ({ ...l, source: nodes.find(n => n.id === l.source) || l.source, target: nodes.find(n => n.id === l.target) || l.target }));
    // Center the initial zoom on the graph
    const k = tRef.current.k;
    tRef.current.x = (dim.w * 2) / 2 - cx * k;
    tRef.current.y = (dim.h * 2) / 2 - cy * k;
    simRef.current = mkSim(nodesRef.current, linksRef.current, cx, cy);
    draw();
    return () => { simRef.current.stop(); cancelAnimationFrame(afRef.current); };
  }, []);

  function mkSim(nodes, links, cx, cy) {
    const a = { current: 1 };
    function tick() {
      a.current *= .985; if (a.current < .001) a.current = 0;
      nodes.forEach(n => { n.vx = (n.vx || 0) + (cx - n.x) * .005 * a.current; n.vy = (n.vy || 0) + (cy - n.y) * .005 * a.current; });
      links.forEach(l => { const dx = l.target.x - l.source.x, dy = l.target.y - l.source.y, d = Math.sqrt(dx * dx + dy * dy) || 1, f = (d - 220) * .003 * a.current; l.source.vx += dx / d * f; l.source.vy += dy / d * f; l.target.vx -= dx / d * f; l.target.vy -= dy / d * f; });
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) { const dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y, d = Math.sqrt(dx * dx + dy * dy) || 1, f = -3500 / (d * d) * a.current; nodes[i].vx += dx / d * f; nodes[i].vy += dy / d * f; nodes[j].vx -= dx / d * f; nodes[j].vy -= dy / d * f; }
      nodes.forEach(n => { if (n.fx != null) { n.x = n.fx; n.vx = 0; } else { n.vx *= .55; n.x += n.vx; } if (n.fy != null) { n.y = n.fy; n.vy = 0; } else { n.vy *= .55; n.y += n.vy; } });
    }
    return { alpha: a, tick, stopped: false, reheat() { a.current = .3; }, stop() { this.stopped = true; } };
  }

  const draw = useCallback(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d"), t = tRef.current;
    if (simRef.current && !simRef.current.stopped) simRef.current.tick();
    ctx.clearRect(0, 0, cv.width, cv.height);

    // Subtle radial background gradient
    const bgGrad = ctx.createRadialGradient(cv.width / 2, cv.height / 2, 0, cv.width / 2, cv.height / 2, cv.width * .6);
    bgGrad.addColorStop(0, "rgba(20,28,50,.3)");
    bgGrad.addColorStop(1, "rgba(10,14,26,0)");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, cv.width, cv.height);

    ctx.save(); ctx.translate(t.x, t.y); ctx.scale(t.k, t.k);
    const nodes = nodesRef.current, links = linksRef.current;
    const isFilt = filterCat !== "Tutte" || search;
    const vis = new Set();
    nodes.forEach(n => { if ((filterCat === "Tutte" || n.categoria === filterCat) && (!search || n.name.toLowerCase().includes(search.toLowerCase()))) vis.add(n.id); });

    // Draw links
    links.forEach(l => {
      const s = l.source, tg = l.target; if (!s.x || !tg.x) return;
      if (isFilt && !vis.has(s.id) && !vis.has(tg.id)) return;
      const k = [s.id, tg.id].sort().join("--"), w = lcRef.current[k] || 1;
      const hl = (selNode && (s.id === selNode.id || tg.id === selNode.id)) || (hovNode && (s.id === hovNode.id || tg.id === hovNode.id));
      const dim2 = isFilt && (!vis.has(s.id) || !vis.has(tg.id));

      // Curved links for better readability
      const mx = (s.x + tg.x) / 2, my = (s.y + tg.y) / 2;
      const dx = tg.x - s.x, dy = tg.y - s.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const curvature = w > 1 ? 12 : 0;
      const cx2 = mx + (-dy / dist) * curvature, cy2 = my + (dx / dist) * curvature;

      ctx.beginPath();
      if (curvature > 0) {
        ctx.moveTo(s.x, s.y); ctx.quadraticCurveTo(cx2, cy2, tg.x, tg.y);
      } else {
        ctx.moveTo(s.x, s.y); ctx.lineTo(tg.x, tg.y);
      }

      if (hl) {
        ctx.strokeStyle = `rgba(200,220,255,${.4 + w * .06})`;
        ctx.lineWidth = 1.5 + w * .5;
        ctx.shadowColor = "rgba(100,180,255,.3)";
        ctx.shadowBlur = 6;
      } else if (dim2) {
        ctx.strokeStyle = "rgba(100,120,140,.04)";
        ctx.lineWidth = .3;
      } else {
        ctx.strokeStyle = `rgba(100,160,220,${.08 + w * .03})`;
        ctx.lineWidth = .5 + w * .3;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Arrow
      if (hl) {
        const angle = curvature > 0 ? Math.atan2(tg.y - cy2, tg.x - cx2) : Math.atan2(tg.y - s.y, tg.x - s.x);
        const nr = gR(tg);
        const ax = tg.x - Math.cos(angle) * (nr + 5), ay = tg.y - Math.sin(angle) * (nr + 5);
        ctx.beginPath(); ctx.moveTo(ax, ay);
        ctx.lineTo(ax - Math.cos(angle - .35) * 8, ay - Math.sin(angle - .35) * 8);
        ctx.lineTo(ax - Math.cos(angle + .35) * 8, ay - Math.sin(angle + .35) * 8);
        ctx.closePath(); ctx.fillStyle = "rgba(200,220,255,.5)"; ctx.fill();
      }
    });

    // Draw nodes
    nodes.forEach(n => {
      if (!n.x) return;
      if (isFilt && !vis.has(n.id)) { const r = gR(n) * .35; ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.fillStyle = "rgba(40,50,65,.15)"; ctx.fill(); return; }
      const r = gR(n), col = CATEGORY_COLORS[n.categoria] || "#667", isSel = selNode?.id === n.id, isHov = hovNode?.id === n.id;

      // Outer glow
      if (isSel || isHov) {
        const g = ctx.createRadialGradient(n.x, n.y, r * .5, n.x, n.y, r * 4);
        g.addColorStop(0, col + "55");
        g.addColorStop(.5, col + "18");
        g.addColorStop(1, col + "00");
        ctx.beginPath(); ctx.arc(n.x, n.y, r * 4, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
      }

      // Subtle ambient glow for all nodes
      const ambGlow = ctx.createRadialGradient(n.x, n.y, r, n.x, n.y, r * 2);
      ambGlow.addColorStop(0, col + "12");
      ambGlow.addColorStop(1, col + "00");
      ctx.beginPath(); ctx.arc(n.x, n.y, r * 2, 0, Math.PI * 2); ctx.fillStyle = ambGlow; ctx.fill();

      // Node body with inner light
      ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      const g2 = ctx.createRadialGradient(n.x - r * .35, n.y - r * .35, 0, n.x, n.y, r);
      g2.addColorStop(0, lgt(col, 60));
      g2.addColorStop(.7, col);
      g2.addColorStop(1, lgt(col, -20));
      ctx.fillStyle = g2; ctx.fill();

      // Ring
      ctx.strokeStyle = isSel ? "#fff" : isHov ? "rgba(255,255,255,.8)" : col + "40";
      ctx.lineWidth = isSel ? 2.5 : isHov ? 2 : 1;
      ctx.stroke();

      // Inner highlight arc (top-left shine)
      ctx.beginPath();
      ctx.arc(n.x, n.y, r * .75, Math.PI * 1.1, Math.PI * 1.7);
      ctx.strokeStyle = "rgba(255,255,255,.12)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label with background
      const fs = Math.max(8, Math.min(12, r * .6));
      ctx.font = `600 ${fs}px 'DM Sans',-apple-system,sans-serif`;
      const labelText = n.name;
      const textW = ctx.measureText(labelText).width;
      const labelY = n.y + r + fs + 4;

      // Label background pill
      ctx.fillStyle = "rgba(10,14,26,.75)";
      const pillPad = 5;
      ctx.beginPath();
      ctx.roundRect(n.x - textW / 2 - pillPad, labelY - fs / 2 - 2, textW + pillPad * 2, fs + 4, 4);
      ctx.fill();

      // Label text
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = isSel || isHov ? "#fff" : "#cbd5e1";
      ctx.fillText(labelText, n.x, labelY);

      // Connection badge
      if (n.totalConnections > 5) {
        const bx = n.x + r * .7, by = n.y - r * .7;
        ctx.beginPath(); ctx.arc(bx, by, 8, 0, Math.PI * 2);
        const badgeCol = n.erogati > 0 ? "#06d6a0" : "#118ab2";
        ctx.fillStyle = badgeCol; ctx.fill();
        ctx.strokeStyle = "rgba(10,14,26,.6)"; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.font = "bold 8px 'DM Sans',sans-serif"; ctx.fillStyle = "#fff";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(n.totalConnections, bx, by + .5);
      }
    });
    ctx.restore();
    afRef.current = requestAnimationFrame(draw);
  }, [selNode, hovNode, filterCat, search]);

  useEffect(() => { cancelAnimationFrame(afRef.current); draw(); }, [draw]);

  function gR(n) { return 14 + Math.sqrt(n.totalConnections) * 4.5; }
  function lgt(h, p) { const n = parseInt(h.replace("#", ""), 16); return `rgb(${Math.max(0, Math.min(255, (n >> 16) + p))},${Math.max(0, Math.min(255, ((n >> 8) & 0xff) + p))},${Math.max(0, Math.min(255, (n & 0xff) + p))})`; }
  function s2w(sx, sy) { const t = tRef.current; return { x: (sx - t.x) / t.k, y: (sy - t.y) / t.k }; }
  function findN(wx, wy) { for (let i = nodesRef.current.length - 1; i >= 0; i--) { const n = nodesRef.current[i], r = gR(n) + 4; if ((n.x - wx) ** 2 + (n.y - wy) ** 2 < r ** 2) return n; } return null; }

  const getXY = (e) => { const rc = canvasRef.current.getBoundingClientRect(); return { sx: (e.clientX - rc.left) * (canvasRef.current.width / rc.width), sy: (e.clientY - rc.top) * (canvasRef.current.height / rc.height) }; };
  const onMD = e => { const { sx, sy } = getXY(e); const { x: wx, y: wy } = s2w(sx, sy), nd = findN(wx, wy); if (nd) { dragRef.current = { node: nd, ox: wx - nd.x, oy: wy - nd.y }; nd.fx = nd.x; nd.fy = nd.y; setSelNode(nd); simRef.current?.reheat(); } else { panRef.current = { sx: e.clientX, sy: e.clientY, tx: tRef.current.x, ty: tRef.current.y }; setSelNode(null); } };
  const onMM = e => { const { sx, sy } = getXY(e); const { x: wx, y: wy } = s2w(sx, sy); if (dragRef.current) { dragRef.current.node.fx = wx - dragRef.current.ox; dragRef.current.node.fy = wy - dragRef.current.oy; simRef.current?.reheat(); } else if (panRef.current) { tRef.current.x = panRef.current.tx + e.clientX - panRef.current.sx; tRef.current.y = panRef.current.ty + e.clientY - panRef.current.sy; } else { const nd = findN(wx, wy); setHovNode(nd); canvasRef.current.style.cursor = nd ? "pointer" : "grab"; } };
  const onMU = () => { if (dragRef.current) { dragRef.current.node.fx = null; dragRef.current.node.fy = null; dragRef.current = null; simRef.current?.reheat(); } panRef.current = null; };
  const onWh = e => { e.preventDefault(); const { sx: mx, sy: my } = getXY(e); const t = tRef.current, f = e.deltaY < 0 ? 1.08 : .93, nk = Math.max(.15, Math.min(5, t.k * f)); t.x = mx - (mx - t.x) * (nk / t.k); t.y = my - (my - t.y) * (nk / t.k); t.k = nk; };

  useEffect(() => {
    const rs = () => { const c = canvasRef.current?.parentElement; if (!c) return; setDim({ w: c.clientWidth, h: c.clientHeight }); if (canvasRef.current) { canvasRef.current.width = c.clientWidth * 2; canvasRef.current.height = c.clientHeight * 2; } };
    rs(); window.addEventListener("resize", rs); return () => window.removeEventListener("resize", rs);
  }, []);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 20px", background: "rgba(15,20,35,.5)", borderBottom: "1px solid rgba(100,160,220,.06)", flexWrap: "wrap", zIndex: 10 }}>
        <input type="text" placeholder="Cerca ente..." value={search} onChange={e => setSearch(e.target.value)} style={{ background: "rgba(30,40,60,.8)", border: "1px solid rgba(100,160,220,.2)", borderRadius: 6, padding: "5px 10px", color: "#e2e8f0", fontSize: 12, outline: "none", width: 160 }} />
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ background: "rgba(30,40,60,.8)", border: "1px solid rgba(100,160,220,.2)", borderRadius: 6, padding: "5px 8px", color: "#e2e8f0", fontSize: 12, outline: "none" }}>{cats.map(c => <option key={c} value={c}>{c}</option>)}</select>
      </div>
      {/* Canvas + Legend + Detail */}
      <div style={{ flex: 1, position: "relative" }}>
        <canvas ref={canvasRef} width={dim.w * 2} height={dim.h * 2} style={{ width: "100%", height: "100%", cursor: "grab" }} onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU} onWheel={onWh} />
        {/* Legend */}
        <div style={{ position: "absolute", bottom: 12, left: 12, background: "rgba(10,14,26,.88)", borderRadius: 8, border: "1px solid rgba(100,160,220,.1)", padding: "8px 12px", display: "flex", flexWrap: "wrap", gap: "4px 12px", maxWidth: 380 }}>
          {Object.entries(CATEGORY_COLORS).map(([cat, col]) => (<div key={cat} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, cursor: "pointer", opacity: filterCat === "Tutte" || filterCat === cat ? 1 : .4 }} onClick={() => setFilterCat(filterCat === cat ? "Tutte" : cat)}><div style={{ width: 7, height: 7, borderRadius: "50%", background: col }} /><span style={{ color: "#94a3b8" }}>{cat}</span></div>))}
        </div>
        {/* Detail panel — overlay, doesn't affect canvas layout */}
        {selNode && (
          <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 330, background: "rgba(10,14,26,.94)", borderLeft: "1px solid rgba(100,160,220,.1)", padding: 16, overflowY: "auto", backdropFilter: "blur(14px)", zIndex: 10 }}>
            <button onClick={() => setSelNode(null)} style={{ position: "absolute", top: 10, right: 12, background: "none", border: "none", color: "#64748b", fontSize: 16, cursor: "pointer", lineHeight: 1, zIndex: 1 }}>✕</button>
            {(() => { const col = CATEGORY_COLORS[selNode.categoria] || "#667"; return (<div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: `linear-gradient(135deg,${col},${col}88)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, flexShrink: 0 }}>{selNode.name[0]}</div>
                <div><div style={{ fontWeight: 700, fontSize: 14 }}>{selNode.name}</div><div style={{ fontSize: 10, color: "#64748b" }}>{selNode.categoria} · {selNode.tipo}</div></div>
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 14 }}>{selNode.descrizione}</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                {[["Erogati", selNode.erogati, "#06d6a0"], ["Fruiti", selNode.fruiti, "#118ab2"], ["Conn.", selNode.totalConnections, "#ef476f"]].map(([l, v, c]) => (
                  <div key={l} style={{ flex: 1, textAlign: "center", padding: "6px 2px", background: "rgba(30,40,60,.5)", borderRadius: 6, border: `1px solid ${c}22` }}><div style={{ fontSize: 16, fontWeight: 800, color: c }}>{v}</div><div style={{ fontSize: 8, color: "#64748b", textTransform: "uppercase", letterSpacing: .5 }}>{l}</div></div>
                ))}
              </div>
              {selNode.servizi_erogati?.length > 0 && <div style={{ marginBottom: 14 }}><div style={{ fontSize: 10, fontWeight: 700, color: "#06d6a0", textTransform: "uppercase", letterSpacing: .8, marginBottom: 6 }}>E-Services Erogati ({selNode.servizi_erogati.length})</div>{selNode.servizi_erogati.map(es => (
                <div key={es.id} style={{ padding: "6px 8px", marginBottom: 3, borderRadius: 5, background: "rgba(6,214,160,.05)", border: "1px solid rgba(6,214,160,.08)", fontSize: 11 }}><div style={{ fontWeight: 600 }}>{es.nome}</div>{es.descrizione && <div style={{ color: "#64748b", fontSize: 9, marginTop: 1 }}>{es.descrizione}</div>}<div style={{ color: "#4a6a5a", fontSize: 9, marginTop: 2 }}>v{es.versione} · {es.stato} · {es.fruitori.length} fruitori</div></div>
              ))}</div>}
              {selNode.servizi_fruiti?.length > 0 && <div><div style={{ fontSize: 10, fontWeight: 700, color: "#118ab2", textTransform: "uppercase", letterSpacing: .8, marginBottom: 6 }}>E-Services Fruiti ({selNode.servizi_fruiti.length})</div>{selNode.servizi_fruiti.map(es => { const er = PDND_DATA.enti.find(e => e.id === es.erogatore); return (
                <div key={es.id + selNode.id} style={{ padding: "6px 8px", marginBottom: 3, borderRadius: 5, background: "rgba(17,138,178,.05)", border: "1px solid rgba(17,138,178,.08)", fontSize: 11 }}><div style={{ fontWeight: 600 }}>{es.nome}</div><div style={{ color: "#64748b", fontSize: 9, marginTop: 1 }}>da {er?.name} · v{es.versione}</div></div>
              ); })}</div>}
            </div>); })()}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════
export default function PDNDGraph() {
  const [activeTab, setActiveTab] = useState("grafo");
  const [showAbout, setShowAbout] = useState(false);
  const graphData = useMemo(() => buildGraph(PDND_DATA), []);
  const stats = useMemo(() => ({
    enti: PDND_DATA.enti.length,
    es: PDND_DATA.eservices.length,
    conn: PDND_DATA.eservices.reduce((a, e) => a + e.fruitori.length, 0),
  }), []);

  return (
    <div style={{ width: "100%", height: "100vh", background: "linear-gradient(145deg,#0a0e1a 0%,#111827 40%,#0d1525 100%)", fontFamily: "'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color: "#e2e8f0", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <Header stats={stats} activeTab={activeTab} onTabChange={setActiveTab} onAbout={() => setShowAbout(true)} />
      {activeTab === "grafo" && <GraphView />}
      {activeTab === "statistiche" && <StatsView graphData={graphData} />}
      {activeTab === "metodologia" && <MethodologyView />}
      {activeTab === "guida" && <GuideView />}
      <Footer />
      {/* About modal */}
      {showAbout && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.6)", backdropFilter: "blur(8px)" }} onClick={() => setShowAbout(false)}>
          <div style={{ background: "linear-gradient(145deg,#131a2e,#0f1623)", border: "1px solid rgba(100,160,220,.2)", borderRadius: 16, padding: "32px 36px", maxWidth: 460, width: "92%", position: "relative" }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowAbout(false)} style={{ position: "absolute", top: 14, right: 16, background: "none", border: "none", color: "#64748b", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>✕</button>

            {/* App identity */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "linear-gradient(135deg,#06d6a0,#118ab2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "#fff", flexShrink: 0 }}>P</div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9" }}>PDND E-Services Graph</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Mappa interattiva dell'interoperabilità tra le PA italiane</div>
              </div>
            </div>

            {/* Version */}
            <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
              <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 4, background: "rgba(6,214,160,.1)", color: "#06d6a0", fontWeight: 600 }}>v1.0.0</span>
              <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 4, background: "rgba(131,56,236,.1)", color: "#8338ec", fontWeight: 600 }}>Open Source</span>
              <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 4, background: "rgba(239,71,111,.1)", color: "#ef476f", fontWeight: 600 }}>AGPL-3.0</span>
            </div>

            {/* Author */}
            <div style={{ borderTop: "1px solid rgba(100,160,220,.1)", paddingTop: 18, marginBottom: 18 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: .8, marginBottom: 10 }}>Autore</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", marginBottom: 12 }}>Francesco Del Re</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <a href="mailto:francesco.delre.87@gmail.com" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#94a3b8", textDecoration: "none", padding: "8px 12px", borderRadius: 6, background: "rgba(30,40,60,.4)", border: "1px solid rgba(100,160,220,.06)", transition: "all .2s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(100,160,220,.2)"; e.currentTarget.style.color = "#e2e8f0"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(100,160,220,.06)"; e.currentTarget.style.color = "#94a3b8"; }}
                >
                  <span style={{ fontSize: 16 }}>✉</span>
                  <span>francesco.delre.87@gmail.com</span>
                </a>
                <a href="https://github.com/engineering87" target="_blank" rel="noopener" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#94a3b8", textDecoration: "none", padding: "8px 12px", borderRadius: 6, background: "rgba(30,40,60,.4)", border: "1px solid rgba(100,160,220,.06)", transition: "all .2s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(100,160,220,.2)"; e.currentTarget.style.color = "#e2e8f0"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(100,160,220,.06)"; e.currentTarget.style.color = "#94a3b8"; }}
                >
                  <span style={{ fontSize: 16 }}>⌂</span>
                  <span>github.com/engineering87</span>
                </a>
                <a href="https://www.linkedin.com/in/francesco-delre/" target="_blank" rel="noopener" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#94a3b8", textDecoration: "none", padding: "8px 12px", borderRadius: 6, background: "rgba(30,40,60,.4)", border: "1px solid rgba(100,160,220,.06)", transition: "all .2s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(100,160,220,.2)"; e.currentTarget.style.color = "#e2e8f0"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(100,160,220,.06)"; e.currentTarget.style.color = "#94a3b8"; }}
                >
                  <span style={{ fontSize: 16 }}>in</span>
                  <span>LinkedIn</span>
                </a>
              </div>
            </div>

            {/* Repository */}
            <div style={{ borderTop: "1px solid rgba(100,160,220,.1)", paddingTop: 18, marginBottom: 18 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: .8, marginBottom: 10 }}>Repository</div>
              <a href="https://github.com/engineering87/pdnd-eservices-graph" target="_blank" rel="noopener" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#64b5f6", textDecoration: "none", padding: "8px 12px", borderRadius: 6, background: "rgba(30,40,60,.4)", border: "1px solid rgba(100,160,220,.06)" }}>
                <span style={{ fontSize: 16 }}>📂</span>
                <span style={{ wordBreak: "break-all" }}>github.com/engineering87/pdnd-eservices-graph</span>
              </a>
            </div>

            {/* Data source */}
            <div style={{ borderTop: "1px solid rgba(100,160,220,.1)", paddingTop: 18 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: .8, marginBottom: 10 }}>Dati</div>
              <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
                Enti e e-services da <a href="https://github.com/italia/pdnd-opendata" target="_blank" rel="noopener" style={{ color: "#64b5f6", textDecoration: "none" }}>italia/pdnd-opendata</a>{" "}
                <span style={{ padding: "1px 6px", borderRadius: 3, background: "rgba(6,214,160,.1)", color: "#06d6a0", fontSize: 9, fontWeight: 600 }}>CC0 1.0</span>
              </div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>
                Connessioni ricostruite tramite modelli AI da documentazione ufficiale pubblica.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
