/**
 * Piè di pagina: attribuzione, licenze e collegamento al report pubblicato.
 *
 * Attribuzione obbligatoria (AGPL-3.0 sezione 7(b), vedi ADDITIONAL-TERMS.md):
 * il nome dell'autore e il collegamento al report devono restare visibili in
 * ogni versione, anche modificata, dell'interfaccia.
 * Le licenze vanno tenute distinte: AGPL-3.0-or-later per il codice, CC BY 4.0
 * per il modello dei dati,
 * CC0 1.0 per i dati di origine, che appartengono alla Presidenza del Consiglio
 * dei Ministri – Dipartimento per la Trasformazione Digitale e sono rielaborati
 * dal progetto: il credito alla fonte segue la dicitura chiesta dal dataset.
 */

import { useIsMobile } from "../utils/useIsMobile";

export default function Footer({ onPrivacy }) {
  const m = useIsMobile();

  return (
    <footer style={{ background: "var(--footer-bg)", borderTop: "1px solid var(--border)", padding: m ? "10px 14px" : "14px 28px", display: "flex", flexDirection: m ? "column" : "row", justifyContent: "space-between", alignItems: m ? "flex-start" : "center", gap: m ? 6 : 12, zIndex: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: m ? 10 : 20, fontSize: m ? 10 : 11, color: "var(--ink-muted)", flexWrap: "wrap" }}>
        <span>Progetto di <span style={{ color: "var(--ink)", fontWeight: 600 }}>Francesco Del Re</span></span>
        <span style={{ opacity: .3 }}>|</span>
        <a href="https://github.com/engineering87/pdnd-eservices-graph" target="_blank" rel="noopener" style={{ color: "var(--pa-blue)", textDecoration: "none" }}>GitHub</a>
        <span style={{ opacity: .3 }}>|</span>
        <a href="https://github.com/engineering87/pdnd-eservices-graph/blob/main/METODOLOGIA.md" target="_blank" rel="noopener" style={{ color: "var(--pa-blue)", textDecoration: "none" }}>Metodologia</a>
        <span style={{ opacity: .3 }}>|</span>
        <a href="https://doi.org/10.5281/zenodo.19989954" target="_blank" rel="noopener" style={{ color: "var(--cite)", textDecoration: "none", fontWeight: 600 }} title="The PDND E-Service Network — Zenodo, 2026">Paper</a>
        <span style={{ opacity: .3 }}>|</span>
        <span title="GNU AGPL versione 3 o successiva">AGPL-3.0-or-later</span>
        <span style={{ opacity: .3 }}>|</span>
        <a href="/privacy" onClick={(e) => { if (onPrivacy) { e.preventDefault(); onPrivacy(); } }} style={{ color: "var(--pa-blue)", textDecoration: "none" }}>Privacy</a>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: m ? 9 : 10, color: "var(--ink-faint)" }}>
        <span>Dati:</span>
        <a href="https://github.com/italia/pdnd-opendata" target="_blank" rel="noopener" style={{ color: "var(--pa-blue)", textDecoration: "none" }} title="Dati dai Numeri del portale PDND — CC0 Presidenza del Consiglio dei Ministri — Dipartimento per la Trasformazione Digitale">PDND Open Data · PCM – Dip. Trasformazione Digitale</a>
        <span style={{ padding: "1px 6px", borderRadius: 3, background: "var(--pa-blue-soft)", color: "var(--pa-blue)", fontSize: 9, fontWeight: 600 }}>CC0 1.0</span>
        <span>rielaborati</span>
      </div>
    </footer>
  );
}
