/**
 * Privacy: cosa tratta il sito e cosa no. Il testo descrive il comportamento
 * verificato dai test (nessun cookie, nessuna statistica, nessuna richiesta a
 * siti esterni): se cambia il codice, va aggiornato anche qui.
 */

import { useIsMobile } from "../utils/useIsMobile";
import { CHIAVE_TEMA } from "../utils/useTheme";

const REPO = "https://github.com/engineering87/pdnd-eservices-graph";

const h3 = { fontSize: 15, fontWeight: 700, color: "var(--ink-strong)", margin: "22px 0 8px" };
const p = { fontSize: 13.5, color: "var(--ink-muted)", lineHeight: 1.7, marginBottom: 10, maxWidth: 760 };
const a = { color: "var(--pa-blue)" };

export default function PrivacyView() {
  const m = useIsMobile();
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: m ? "16px 14px" : "24px 28px" }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <div style={{ fontSize: 11, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Privacy</div>
        <h2 style={{ fontSize: m ? 19 : 23, fontWeight: 700, color: "var(--ink-strong)", marginBottom: 12 }}>Come il sito tratta i tuoi dati</h2>

        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "14px 18px", marginBottom: 8 }}>
          <ul style={{ ...p, margin: 0, paddingLeft: 18 }}>
            <li>Nessun cookie, nessuno strumento di statistica o di tracciamento, nessun account.</li>
            <li>Il sito non contatta altri siti: caratteri e codice sono ospitati insieme alle pagine.</li>
            <li>
              Le ricerche e i filtri non vengono inviati mentre navighi: finiscono nell'indirizzo della pagina, che arriva al
              server solo se ricarichi la pagina o apri un link condiviso.
            </li>
          </ul>
        </div>

        <h3 style={h3}>Cosa resta nel tuo browser</h3>
        <p style={p}>
          Il sito salva due preferenze nella memoria locale del browser (localStorage), solo per funzionare come ti aspetti:
          il tema chiaro o scuro (<code>{CHIAVE_TEMA}</code>) e il fatto che hai già visto la schermata di benvenuto
          (<code>pdnd-graph-benvenuto-visto</code>). Non vengono inviate a nessuno e puoi cancellarle dalle impostazioni del
          browser, cancellando i dati di questo sito.
        </p>

        <h3 style={h3}>Hosting</h3>
        <p style={p}>
          Le pagine sono servite da Azure Static Web Apps (Microsoft). Come ogni server web, l'infrastruttura di hosting
          riceve l'indirizzo IP e i dati tecnici di ogni richiesta per poter consegnare le pagine. Il progetto non aggiunge
          strumenti di monitoraggio o di statistica e non usa questi dati.
        </p>

        <h3 style={h3}>I dati mostrati</h3>
        <p style={p}>
          La mappa rielabora i dati aperti della PDND (<a style={a} href="https://github.com/italia/pdnd-opendata" target="_blank" rel="noopener">italia/pdnd-opendata</a>,
          licenza CC0 1.0), della Presidenza del Consiglio dei Ministri – Dipartimento per la Trasformazione Digitale e
          pubblicati da PagoPA S.p.A., che gestisce la piattaforma, oltre a documentazione pubblica, come spiegato nella
          Metodologia. Riguardano enti, non persone.
        </p>
        <p style={p}>
          La ricerca «Il tuo ente» elenca solo gli aderenti con codice IPA, cioè amministrazioni e gestori di pubblici
          servizi. Imprese e altri soggetti privati sono contati nelle classi ma non elencati uno per uno, perché fra loro ci
          sono ditte e società che portano il nome di persone fisiche. Il sito non pubblica codici fiscali.
        </p>

        <h3 style={h3}>Link verso altri siti</h3>
        <p style={p}>
          Quando apri un link esterno (GitHub, DOI, PagoPA) il browser non comunica a quel sito che arrivi da qui. Da quel
          momento valgono le regole del sito che visiti.
        </p>

        <h3 style={h3}>Richieste e correzioni</h3>
        <p style={p}>
          Per segnalare un dato sbagliato o chiedere la rimozione di un'informazione apri una segnalazione
          su <a style={a} href={`${REPO}/issues`} target="_blank" rel="noopener">GitHub</a>. Se il dato viene dall'elenco
          ufficiale degli aderenti o dal catalogo, la correzione definitiva va chiesta anche a PagoPA, che gestisce la PDND e ne pubblica i dati: il
          sito si aggiorna ogni mese da quella fonte.
        </p>

        <p style={{ ...p, fontSize: 11.5, color: "var(--ink-faint)", marginTop: 22 }}>
          Il sito è un progetto indipendente di Francesco Del Re, non collegato a PagoPA né al Dipartimento per la
          trasformazione digitale. Caratteri e librerie di terze parti hanno licenze proprie, riportate
          in <a style={a} href="/licenze-terze-parti.txt" target="_blank" rel="noopener">licenze-terze-parti.txt</a>.
          Ultimo aggiornamento di questa pagina: 27 novembre 2026.
        </p>
      </div>
    </div>
  );
}
