/**
 * Finestra "Il progetto": cosa mostra la mappa, come leggerla, come citarla e
 * chi l'ha realizzata. È pensata per chi arriva senza conoscere la PDND, quindi
 * parte dal significato e lascia in fondo autore e collegamenti tecnici.
 */

import Termine from "./Termine";
import { useIsMobile } from "../utils/useIsMobile";
import { useDialog } from "../utils/useDialog";

function Section({ label, children }) {
  return (
    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: .8, marginBottom: 10 }}>{label}</div>
      {children}
    </div>
  );
}

function Riga({ simbolo, children }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 9, fontSize: 13.5, color: "var(--ink-muted)", lineHeight: 1.55 }}>
      <span aria-hidden="true" style={{ width: 26, flexShrink: 0, textAlign: "center", color: "var(--pa-blue)", fontSize: 15 }}>{simbolo}</span>
      <span>{children}</span>
    </div>
  );
}

const linkStile = { color: "var(--pa-blue)", textDecoration: "none", fontSize: 13 };

export default function AboutModal({ onClose, onWelcome }) {
  const m = useIsMobile();

  // Fuoco nella finestra, Tab che resta dentro, Esc per chiudere.
  const dialogo = useDialog(onClose);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="titolo-progetto"
      style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--overlay)", backdropFilter: "blur(8px)", padding: 12 }}
      onClick={onClose}>
      <div style={{ background: "var(--modal-bg)", border: "1px solid var(--border)", borderRadius: 16, padding: m ? "22px 20px" : "30px 34px", maxWidth: 560, width: "100%", maxHeight: "92vh", overflowY: "auto", position: "relative" }} onClick={e => e.stopPropagation()} ref={dialogo}>
        <button onClick={onClose} aria-label="Chiudi" style={{ position: "absolute", top: 14, right: 16, background: "none", border: "none", color: "var(--ink-faint)", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <img src="/logo.svg" alt="" width={46} height={46} style={{ borderRadius: 10, flexShrink: 0 }} />
          <div>
            <h2 id="titolo-progetto" style={{ fontSize: 20, fontWeight: 700, color: "var(--ink-strong)" }}>PDND E-Services Graph</h2>
            <div style={{ fontSize: 12.5, color: "var(--ink-faint)", marginTop: 2 }}>La rete dei dati fra le Pubbliche Amministrazioni italiane</div>
          </div>
        </div>

        <p style={{ fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.65, marginBottom: 16 }}>
          Le amministrazioni pubbliche si scambiano dati attraverso la <Termine id="pdnd">PDND</Termine>, così cittadini
          e imprese non devono fornire più volte le stesse informazioni. Questa mappa mostra quali enti offrono servizi
          di scambio dati, gli <Termine id="eservice">e-service</Termine>, e quali enti li usano. È costruita
          solo su dati pubblici, con la fonte dichiarata per ogni legame.
        </p>

        <Section label="Come leggere la mappa">
          <Riga simbolo="●">Ogni cerchio è un ente, come INPS o l'Agenzia delle Entrate, oppure una <Termine id="classe">classe di enti</Termine>, come tutti i Comuni. Il colore indica il tipo di ente.</Riga>
          <Riga simbolo="→">Una linea va dall'ente che offre i dati (<Termine id="erogatore">erogatore</Termine>) a quello che li usa (<Termine id="fruitore">fruitore</Termine>). Più è spessa, più servizi li collegano.</Riga>
          <Riga simbolo="┄">Le linee azzurre indicano un uso reale registrato dalla PDND; quelle tratteggiate sono ricostruzioni o stime. La legenda della <Termine id="provenienza">provenienza</Termine> permette di filtrarle.</Riga>
          <Riga simbolo="☰">La scheda Relazioni elenca le stesse relazioni in tabella, con filtri e download.</Riga>
          {onWelcome && (
            <button type="button" onClick={onWelcome} style={{ marginTop: 6, padding: "8px 14px", borderRadius: 6, border: "1px solid var(--pa-blue)", background: "var(--pa-blue-soft)", color: "var(--ink)", fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Rivedi l'introduzione
            </button>
          )}
        </Section>

        <Section label="Come citare">
          <div style={{ padding: "12px 14px", borderRadius: 8, background: "rgba(212,168,67,.07)", border: "1px solid rgba(212,168,67,.3)", fontSize: 13, color: "var(--ink-muted)", lineHeight: 1.6 }}>
            Se usi la mappa, i dati o le immagini in un lavoro, una tesi o una presentazione, cita:
            <div style={{ color: "var(--ink)", marginTop: 6 }}>
              Del Re, F. (2026). <em>The PDND E-Service Network: A Graph-Based Model from Italian Open Government Data</em>. Zenodo.{" "}
              <a href="https://doi.org/10.5281/zenodo.19989954" target="_blank" rel="noopener" style={{ color: "var(--cite)" }}>doi:10.5281/zenodo.19989954</a>
            </div>
          </div>
        </Section>

        <Section label="Dati e limiti">
          <div style={{ fontSize: 13, color: "var(--ink-muted)", lineHeight: 1.6 }}>
            Enti, servizi e statistiche d'uso vengono dai dati aperti ufficiali{" "}
            <a href="https://github.com/italia/pdnd-opendata" target="_blank" rel="noopener" style={linkStile}>italia/pdnd-opendata</a> (CC0 1.0).
            La PDND non pubblica le coppie puntuali fra enti: la mappa le ricostruisce e dichiara per ognuna da dove viene.
            È una fotografia a una data precisa e una selezione degli enti, non l'intera piattaforma. Il dettaglio è nella scheda Metodologia.
          </div>
        </Section>

        <Section label="Autore e progetto">
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-strong)", marginBottom: 8 }}>Francesco Del Re</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px" }}>
            <a href="mailto:francesco.delre.87@gmail.com" style={linkStile}>Email</a>
            <a href="https://github.com/engineering87" target="_blank" rel="noopener" style={linkStile}>GitHub</a>
            <a href="https://www.linkedin.com/in/francesco-delre/" target="_blank" rel="noopener" style={linkStile}>LinkedIn</a>
            <a href="https://github.com/engineering87/pdnd-eservices-graph" target="_blank" rel="noopener" style={linkStile}>Codice sorgente</a>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 10 }}>
            Versione 2.0.0 · Software libero, licenza AGPL-3.0 con obbligo di attribuzione
          </div>
        </Section>
      </div>
    </div>
  );
}
