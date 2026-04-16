function ContactLink({ href, icon, children, ...props }) {
  return (
    <a href={href} {...props}
      style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#94a3b8", textDecoration: "none", padding: "8px 12px", borderRadius: 6, background: "rgba(30,40,60,.4)", border: "1px solid rgba(100,160,220,.06)", transition: "all .2s" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(100,160,220,.2)"; e.currentTarget.style.color = "#e2e8f0"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(100,160,220,.06)"; e.currentTarget.style.color = "#94a3b8"; }}
    >
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span>{children}</span>
    </a>
  );
}

function Badge({ color, children }) {
  return (
    <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 4, background: `${color}18`, color, fontWeight: 600 }}>
      {children}
    </span>
  );
}

export default function AboutModal({ onClose }) {
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.6)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div style={{ background: "linear-gradient(145deg,#131a2e,#0f1623)", border: "1px solid rgba(100,160,220,.2)", borderRadius: 16, padding: "32px 36px", maxWidth: 460, width: "92%", position: "relative" }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 16, background: "none", border: "none", color: "#64748b", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>✕</button>

        {/* App identity */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "linear-gradient(135deg,#06d6a0,#118ab2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "#fff", flexShrink: 0 }}>P</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9" }}>PDND E-Services Graph</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Mappa interattiva dell'interoperabilità tra le PA italiane</div>
          </div>
        </div>

        {/* Version badges */}
        <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
          <Badge color="#06d6a0">v1.0.0</Badge>
          <Badge color="#8338ec">Open Source</Badge>
          <Badge color="#ef476f">AGPL-3.0</Badge>
        </div>

        {/* Author */}
        <Section label="Autore">
          <div style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", marginBottom: 12 }}>Francesco Del Re</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <ContactLink href="mailto:francesco.delre.87@gmail.com" icon="✉">
              francesco.delre.87@gmail.com
            </ContactLink>
            <ContactLink href="https://github.com/engineering87" target="_blank" rel="noopener" icon="⌂">
              github.com/engineering87
            </ContactLink>
            <ContactLink href="https://www.linkedin.com/in/francesco-delre/" target="_blank" rel="noopener" icon="in">
              LinkedIn
            </ContactLink>
          </div>
        </Section>

        {/* Repository */}
        <Section label="Repository">
          <a href="https://github.com/engineering87/pdnd-eservices-graph" target="_blank" rel="noopener" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#64b5f6", textDecoration: "none", padding: "8px 12px", borderRadius: 6, background: "rgba(30,40,60,.4)", border: "1px solid rgba(100,160,220,.06)" }}>
            <span style={{ fontSize: 16 }}>📂</span>
            <span style={{ wordBreak: "break-all" }}>github.com/engineering87/pdnd-eservices-graph</span>
          </a>
        </Section>

        {/* Data source */}
        <div style={{ borderTop: "1px solid rgba(100,160,220,.1)", paddingTop: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: .8, marginBottom: 10 }}>Dati</div>
          <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
            Enti e e-services da{" "}
            <a href="https://github.com/italia/pdnd-opendata" target="_blank" rel="noopener" style={{ color: "#64b5f6", textDecoration: "none" }}>italia/pdnd-opendata</a>{" "}
            <span style={{ padding: "1px 6px", borderRadius: 3, background: "rgba(6,214,160,.1)", color: "#06d6a0", fontSize: 9, fontWeight: 600 }}>CC0 1.0</span>
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>
            Connessioni ricostruite tramite modelli AI da documentazione ufficiale pubblica.
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div style={{ borderTop: "1px solid rgba(100,160,220,.1)", paddingTop: 18, marginBottom: 18 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: .8, marginBottom: 10 }}>{label}</div>
      {children}
    </div>
  );
}
