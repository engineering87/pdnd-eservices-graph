const TABS = [
  { id: "grafo", label: "Grafo", icon: "◉" },
  { id: "statistiche", label: "Statistiche", icon: "◧" },
  { id: "metodologia", label: "Metodologia", icon: "◪" },
  { id: "guida", label: "Guida", icon: "◈" },
];

export default function Header({ stats, activeTab, onTabChange, onAbout }) {
  return (
    <header style={{ background: "rgba(10,14,26,.85)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(100,160,220,.12)", zIndex: 20, position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 28px 12px", flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: "linear-gradient(135deg,#06d6a0,#118ab2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: -1, flexShrink: 0 }}>P</div>
          <div>
            <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: -.4, color: "#f1f5f9" }}>PDND E-Services Graph</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2, lineHeight: 1.4, maxWidth: 420 }}>
              Mappa interattiva dell'interoperabilità tra le Pubbliche Amministrazioni italiane
            </div>
          </div>
        </div>

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
          <button
            onClick={onAbout}
            title="Informazioni sull'applicazione"
            style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(30,40,60,.4)", border: "1px solid rgba(100,160,220,.12)", color: "#64748b", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", letterSpacing: .3, transition: "all .2s" }}
            onMouseEnter={e => { e.target.style.color = "#e2e8f0"; e.target.style.borderColor = "rgba(100,160,220,.3)"; }}
            onMouseLeave={e => { e.target.style.color = "#64748b"; e.target.style.borderColor = "rgba(100,160,220,.12)"; }}
          >Info</button>
        </div>
      </div>

      <div style={{ display: "flex", padding: "0 28px", gap: 2 }}>
        {TABS.map(tab => (
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
