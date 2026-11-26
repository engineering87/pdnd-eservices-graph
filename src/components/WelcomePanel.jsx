/**
 * Benvenuto: per chi arriva la prima volta sulla pagina iniziale. Spiega in
 * due frasi cosa sono la PDND e la mappa, dà i numeri ufficiali e propone
 * domande concrete che portano a viste già pronte. Si chiude e non ricompare;
 * si riapre dalla finestra "Il progetto".
 */

import PDND_DATA from "../data/pdnd-data.json";
import Termine from "./Termine";
import { useIsMobile } from "../utils/useIsMobile";
import { useDialog } from "../utils/useDialog";
import { numero, dataLunga } from "../utils/format";

// Il servizio con più sessioni di scambio registrate, calcolato dal dato.
const PIU_USATO = [...PDND_DATA.eservices].sort((a, b) => (b.sessioni_min ?? 0) - (a.sessioni_min ?? 0))[0];

// Numeri ufficiali PagoPA, scaricati dalla pipeline insieme al grafo
// (meta.piattaforma), così non invecchiano a ogni aggiornamento.
const P = PDND_DATA.meta?.piattaforma;
const NUMERI = P ? [
  [numero(P.aderenti.totale ?? P.aderenti.serie.at(-1)[1]), "enti aderenti"],
  [numero(P.eservice.totale), "e-service pubblicati"],
  [numero(P.connessioni.totale), "connessioni attive"],
] : [
  ["9.826", "enti aderenti"],
  ["15.291", "e-service pubblicati"],
  ["55.504", "connessioni attive"],
];
const DATA_NUMERI = P?.aderenti?.serie?.at(-1)?.[0] ? dataLunga(P.aderenti.serie.at(-1)[0]) : "24 novembre 2026";

const DOMANDE = [
  { testo: "Cerca il tuo ente: il tuo Comune, la tua scuola, la tua ASL", url: "/enti", nota: "Il tuo ente" },
  { testo: "Quali servizi usano i Comuni?", url: "/esplora?fruitore=comuni_agg", nota: "Relazioni" },
  { testo: "Chi usa i dati dell'anagrafe nazionale?", url: "/esplora?erogatore=min_interno&per=fruitore", nota: "Relazioni" },
  PIU_USATO && { testo: `Qual è il servizio più usato? (${PIU_USATO.nome})`, url: `/eservice/${encodeURIComponent(PIU_USATO.id)}`, nota: "Scheda del servizio" },
  { testo: "Dove passa l'uso reale dei dati?", url: "/?archi=osservata", nota: "Mappa" },
  { testo: "Quali enti fanno da ponte nella rete?", url: "/statistiche", nota: "Numeri" },
].filter(Boolean);

export default function WelcomePanel({ onClose, onGo }) {
  const m = useIsMobile();

  // Fuoco nella finestra, Tab che resta dentro, Esc per chiudere.
  const dialogo = useDialog(onClose);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="titolo-benvenuto"
      style={{ position: "fixed", inset: 0, zIndex: 90, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--overlay)", backdropFilter: "blur(6px)", padding: 12 }}
      onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} ref={dialogo}
        style={{ background: "var(--modal-bg)", border: "1px solid var(--border-strong)", borderRadius: 16, maxWidth: 640, width: "100%", maxHeight: "94vh", overflowY: "auto", padding: m ? "22px 20px" : "32px 36px", position: "relative", boxShadow: "var(--shadow)" }}>
        <button onClick={onClose} aria-label="Chiudi" style={{ position: "absolute", top: 14, right: 16, background: "none", border: "none", color: "var(--ink-faint)", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>

        <div style={{ fontSize: 11, color: "var(--pa-blue)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, marginBottom: 8 }}>Benvenuto</div>
        <h2 id="titolo-benvenuto" style={{ fontSize: m ? 21 : 26, fontWeight: 700, color: "var(--ink-strong)", lineHeight: 1.25, marginBottom: 12 }}>
          Come si scambiano i dati le Pubbliche Amministrazioni italiane
        </h2>
        <p style={{ fontSize: 14.5, color: "var(--ink-soft)", lineHeight: 1.65, marginBottom: 18 }}>
          Quando un Comune verifica una residenza o una scuola controlla un ISEE, i dati passano da un ente all'altro
          attraverso la <Termine id="pdnd">PDND</Termine>. Questa mappa mostra chi offre quei dati, chi li usa e quanto,
          a partire dai dati aperti ufficiali.
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
          {NUMERI.map(([n, l]) => (
            <div key={l} style={{ flex: "1 1 140px", padding: "12px 10px", borderRadius: 10, background: "rgba(77,148,255,.08)", border: "1px solid rgba(77,148,255,.22)", textAlign: "center" }}>
              <div className="tabular" style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)" }}>{n}</div>
              <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 22 }}>
          Dati PagoPA al {DATA_NUMERI}, da <a href="https://www.interop.pagopa.it/numeri" target="_blank" rel="noopener" style={{ color: "var(--pa-blue)" }}>interop.pagopa.it/numeri</a>.
          La mappa ne rappresenta una selezione: gli enti principali singolarmente, tutti gli altri raggruppati per tipo.
        </div>

        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 10 }}>Da dove vuoi cominciare?</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 22 }}>
          {DOMANDE.map((d) => (
            <button key={d.url} type="button" onClick={() => onGo(d.url)}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 8, background: "var(--card-inset)", border: "1px solid var(--border)", color: "var(--ink)", fontFamily: "inherit", fontSize: 14, textAlign: "left", cursor: "pointer" }}>
              <span>{d.testo}</span>
              <span style={{ fontSize: 11.5, color: "var(--pa-blue)", whiteSpace: "nowrap" }}>{d.nota} →</span>
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, justifyContent: "space-between" }}>
          <button type="button" onClick={onClose}
            style={{ padding: "10px 20px", borderRadius: 8, background: "var(--pa-blue-deep)", border: "1px solid var(--pa-blue)", color: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            Esplora la mappa
          </button>
          <span style={{ fontSize: 11.5, color: "var(--ink-faint)", maxWidth: 330 }}>
            Se usi questi dati, cita il progetto: DOI <a href="https://doi.org/10.5281/zenodo.19989954" target="_blank" rel="noopener" style={{ color: "var(--cite)" }}>10.5281/zenodo.19989954</a>
          </span>
        </div>
      </div>
    </div>
  );
}
