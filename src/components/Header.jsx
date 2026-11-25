/**
 * Intestazione: marchio, indicatori sintetici del modello e navigazione fra le
 * viste. Gli indicatori sono deliberatamente uniformi fra loro: la gerarchia
 * passa da posizione e divisori, non dal colore.
 */

import { useIsMobile } from "../utils/useIsMobile";
import Termine from "./Termine";

const TABS = [
  { id: "grafo", label: "Mappa" },
  { id: "esplora", label: "Chi usa cosa" },
  { id: "statistiche", label: "Numeri" },
  { id: "metodologia", label: "Metodologia" },
  { id: "guida", label: "Guida" },
];

export default function Header({ stats, activeTab, onTabChange, onAbout }) {
  const m = useIsMobile();

  // I tre indicatori condividono lo stesso trattamento: un dato istituzionale
  // si legge, non si illumina. La distinzione fra loro passa dalla posizione e
  // dal divisore, non dal colore.
  const counters = [
    {
      label: "Enti",
      value: stats.enti,
      hint: `${stats.singoli} enti rappresentati uno a uno e ${stats.classi} classi che raggruppano tutti gli altri aderenti (Comuni, scuole, sanità…). Gli aderenti alla PDND sono quasi 10.000.`,
    },
    {
      label: "Servizi",
      value: stats.es,
      hint: "E-service, cioè servizi digitali per scambiare dati: una selezione del catalogo PDND, scelta fra i più adottati e usati. Alcuni record valgono per molti servizi uguali: 'Albo Pretorio' dei Comuni è un record qui ma 1.451 servizi nel catalogo.",
    },
    {
      label: "Relazioni",
      value: stats.conn,
      hint: "Legami fra un ente che offre un servizio e un ente che lo usa, uno per servizio. Non sono le connessioni attive sulla PDND, che secondo PagoPA erano 55.504 al 24 novembre 2026.",
    },
  ];

  // Il pulsante del progetto è l'ingresso per chi arriva senza contesto: deve
  // vedersi, quindi ha l'accento istituzionale e un'etichetta esplicita.
  const infoButtonStyle = {
    padding: m ? "6px 12px" : "8px 16px",
    borderRadius: 6,
    background: "var(--pa-blue-soft)",
    border: "1px solid var(--pa-blue)",
    color: "var(--ink)",
    fontSize: m ? 12 : 13,
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    whiteSpace: "nowrap",
    cursor: "pointer",
    fontFamily: "inherit",
    letterSpacing: .3,
  };

  return (
    <header style={{ background: "rgba(10,14,26,.85)", backdropFilter: "blur(16px)", borderBottom: "1px solid var(--border)", zIndex: 20, position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: m ? "10px 14px 8px" : "16px 28px 12px", flexWrap: "wrap", gap: m ? 10 : 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: m ? 10 : 14, flex: m ? "1 1 auto" : undefined }}>
          <img src="/logo.svg" alt="" width={m ? 32 : 42} height={m ? 32 : 42} style={{ display: "block", flexShrink: 0, borderRadius: m ? 7 : 9 }} />
          <div>
            <h1 style={{ fontSize: m ? 14 : 19, fontWeight: 700, letterSpacing: -.2, color: "var(--ink)" }}>PDND E-Services Graph</h1>
            {!m && <p style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 2, lineHeight: 1.4, maxWidth: 420 }}>Mappa interattiva dell'interoperabilità tra le Pubbliche Amministrazioni italiane</p>}
          </div>
          {m && <button onClick={onAbout} style={{ ...infoButtonStyle, marginLeft: "auto" }}><span aria-hidden="true" style={{ color: "var(--pa-blue)" }}>ⓘ</span>Il progetto</button>}
        </div>

        <div style={{ display: "flex", gap: m ? 8 : 12, alignItems: "center", ...(m ? { width: "100%" } : {}) }}>
          <div style={{ display: "flex", gap: 0, alignItems: "stretch", border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden", ...(m ? { flex: 1 } : {}) }}>
          {counters.map(({ label, value, hint }, i) => {
            return (
              <div
                key={label}
                style={{
                  textAlign: "center",
                  padding: m ? "6px 10px" : "8px 18px",
                  background: "var(--surface-raised)",
                  border: "none",
                  borderLeft: i === 0 ? "none" : "1px solid var(--border)",
                  flex: m ? 1 : undefined,
                  minWidth: m ? 0 : 88,
                  color: "inherit",
                }}
              >
                <div className="tabular" style={{ fontSize: m ? 16 : 22, fontWeight: 700, color: "var(--ink)", lineHeight: 1.1 }}>{value}</div>
                <div style={{ color: "var(--ink-muted)", fontSize: m ? 10 : 11, letterSpacing: .5, textTransform: "uppercase", marginTop: m ? 2 : 4, whiteSpace: "nowrap" }}>
                  <Termine titolo={label} testo={hint} sottolineato={false}>
                    {label} <span aria-hidden="true" style={{ color: "var(--pa-blue)" }}>ⓘ</span>
                  </Termine>
                </div>
              </div>
            );
          })}
          </div>
          {!m && <button onClick={onAbout} title="Cosa mostra la mappa, come leggerla, come citarla" style={infoButtonStyle}><span aria-hidden="true" style={{ color: "var(--pa-blue)" }}>ⓘ</span>Il progetto</button>}
        </div>
      </div>

      <nav aria-label="Sezioni" className="nav-tabs" style={{ display: "flex", padding: m ? "0 10px" : "0 28px", gap: 0, overflowX: m ? "auto" : undefined, WebkitOverflowScrolling: "touch" }}>
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              aria-current={active ? "page" : undefined}
              style={{
                padding: m ? "8px 14px" : "9px 20px",
                fontSize: m ? 11 : 12.5,
                fontWeight: active ? 700 : 600,
                cursor: "pointer",
                background: active ? "var(--pa-blue-soft)" : "transparent",
                color: active ? "var(--ink)" : "var(--ink-faint)",
                border: "none",
                borderBottom: active ? "2px solid var(--pa-blue)" : "2px solid transparent",
                letterSpacing: .2,
                whiteSpace: "nowrap",
                flexShrink: 0,
                fontFamily: "inherit",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
