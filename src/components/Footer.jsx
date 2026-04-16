import { useIsMobile } from "../utils/useIsMobile";

export default function Footer() {
  const m = useIsMobile();

  return (
    <footer style={{ background: "rgba(8,11,20,.9)", borderTop: "1px solid rgba(100,160,220,.1)", padding: m ? "10px 14px" : "14px 28px", display: "flex", flexDirection: m ? "column" : "row", justifyContent: "space-between", alignItems: m ? "flex-start" : "center", gap: m ? 6 : 12, zIndex: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: m ? 10 : 20, fontSize: m ? 10 : 11, color: "#64748b", flexWrap: "wrap" }}>
        <span>Progetto di <span style={{ color: "#94a3b8", fontWeight: 600 }}>Francesco Del Re</span></span>
        <span style={{ opacity: .3 }}>|</span>
        <a href="https://github.com/engineering87/pdnd-eservices-graph" target="_blank" rel="noopener" style={{ color: "#64b5f6", textDecoration: "none" }}>GitHub</a>
        <span style={{ opacity: .3 }}>|</span>
        <a href="https://github.com/engineering87/pdnd-eservices-graph/blob/main/METODOLOGIA.md" target="_blank" rel="noopener" style={{ color: "#64b5f6", textDecoration: "none" }}>Metodologia</a>
        <span style={{ opacity: .3 }}>|</span>
        <span>AGPL-3.0</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: m ? 9 : 10, color: "#475569" }}>
        <span>Dati:</span>
        <a href="https://github.com/italia/pdnd-opendata" target="_blank" rel="noopener" style={{ color: "#64b5f6", textDecoration: "none" }}>italia/pdnd-opendata</a>
        <span style={{ padding: "1px 6px", borderRadius: 3, background: "rgba(6,214,160,.1)", color: "#06d6a0", fontSize: 9, fontWeight: 600 }}>CC0 1.0</span>
      </div>
    </footer>
  );
}
