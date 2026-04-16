import { useIsMobile } from "../utils/useIsMobile";

const TABS = [
  { id: "grafo", label: "Grafo", icon: "◉" },
  { id: "statistiche", label: "Statistiche", icon: "◧" },
  { id: "metodologia", label: "Metodologia", icon: "◪" },
  { id: "guida", label: "Guida", icon: "◈" },
];

export default function Header({ stats, activeTab, onTabChange, onAbout }) {
  const m = useIsMobile();

  return (
    <header style={{ background: "rgba(10,14,26,.85)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(100,160,220,.12)", zIndex: 20, position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: m ? "10px 14px 8px" : "16px 28px 12px", flexWrap: "wrap", gap: m ? 10 : 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: m ? 10 : 14, flex: m ? "1 1 auto" : undefined }}>
          <div style={{ width: m ? 32 : 42, height: m ? 32 : 42, borderRadius: m ? 8 : 10, background: "linear-gradient(135deg,#06d6a0,#118ab2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: m ? 15 : 20, fontWeight: 800, color: "#fff", letterSpacing: -1, flexShrink: 0 }}>P</div>
          <div>
            <div style={{ fontSize: m ? 14 : 19, fontWeight: 700, letterSpacing: -.4, color: "#f1f5f9" }}>PDND E-Services Graph</div>
            {!m && <div style={{ fontSize: 12, color: "#64748b", marginTop: 2, lineHeight: 1.4, maxWidth: 420 }}>Mappa interattiva dell'interoperabilità tra le Pubbliche Amministrazioni italiane</div>}
          </div>
          {m && <button onClick={onAbout} style={{ marginLeft: "auto", padding: "4px 10px", borderRadius: 6, background: "rgba(30,40,60,.4)", border: "1px solid rgba(100,160,220,.12)", color: "#64748b", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Info</button>}
        </div>

        <div style={{ display: "flex", gap: m ? 6 : 10, alignItems: "center", ...(m ? { width: "100%", justifyContent: "center" } : {}) }}>
          {[["Enti", stats.enti, "#06d6a0"], ["E-Services", stats.es, "#ffd166"], ["Connessioni", stats.conn, "#ef476f"]].map(([label, value, color]) => (
            <div key={label} style={{ textAlign: "center", padding: m ? "5px 10px" : "8px 16px", background: "rgba(30,40,60,.4)", borderRadius: m ? 6 : 8, border: `1px solid ${color}15`, flex: m ? 1 : undefined, minWidth: m ? 0 : 80 }}>
              <div style={{ fontSize: m ? 16 : 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
              <div style={{ color: "#64748b", fontSize: m ? 8 : 9, letterSpacing: .6, textTransform: "uppercase", marginTop: m ? 2 : 4 }}>{label}</div>
            </div>
          ))}
          {!m && <button onClick={onAbout} title="Informazioni sull'applicazione" style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(30,40,60,.4)", border: "1px solid rgba(100,160,220,.12)", color: "#64748b", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", letterSpacing: .3 }}>Info</button>}
        </div>
      </div>

      <div style={{ display: "flex", padding: m ? "0 10px" : "0 28px", gap: 0, overflowX: m ? "auto" : undefined, WebkitOverflowScrolling: "touch" }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => onTabChange(tab.id)} style={{
            padding: m ? "8px 14px" : "9px 20px", fontSize: m ? 11 : 12, fontWeight: 600, cursor: "pointer",
            background: activeTab === tab.id ? "rgba(100,160,220,.1)" : "transparent",
            color: activeTab === tab.id ? "#e2e8f0" : "#64748b",
            border: "none", borderBottom: activeTab === tab.id ? "2px solid #06d6a0" : "2px solid transparent",
            letterSpacing: .3, whiteSpace: "nowrap", flexShrink: 0,
          }}>
            {!m && <span style={{ marginRight: 6, opacity: .6 }}>{tab.icon}</span>}{tab.label}
          </button>
        ))}
      </div>
    </header>
  );
}
