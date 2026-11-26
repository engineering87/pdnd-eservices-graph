/**
 * Guida alla lettura del grafo: significato di nodi, archi, spessori e colori,
 * e comandi di navigazione. È la vista che rende interpretabile il canvas per
 * chi arriva senza contesto.
 */

import { CATEGORY_COLORS } from "../constants/colors";
import { GLOSSARIO } from "../constants/glossario";

function Shortcut({ icon, label, desc }) {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "14px 0", borderBottom: "1px solid var(--line)" }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--card-inset)", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 12, color: "var(--ink-muted)", lineHeight: 1.6 }}>{desc}</div>
      </div>
    </div>
  );
}

function LegendItem({ color, label, desc }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 0" }}>
      <div style={{ width: 12, height: 12, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <div>
        <span style={{ fontSize: 12, color: "var(--ink)", fontWeight: 600 }}>{label}</span>
        {desc && <span style={{ fontSize: 11, color: "var(--ink-faint)" }}> — {desc}</span>}
      </div>
    </div>
  );
}

const CATEGORY_DESCRIPTIONS = {
  Ministero: "Ministeri e dipartimenti della PCM",
  Previdenza: "INPS",
  Fisco: "Agenzia delle Entrate, AdE Riscossione, Demanio, Dogane e Monopoli",
  Digitale: "AgID, PagoPA",
  Lavoro: "INAIL",
  Imprese: "Unioncamere",
  Anticorruzione: "ANAC",
  Trasporti: "MIT e DG Motorizzazione",
  Cultura: "Ministero della Cultura (I.PaC)",
  Statistica: "ISTAT, ISPRA",
  "Società pubblica": "Poste Italiane, Poligrafico e Zecca dello Stato",
  Tecnologia: "Sogei, Cineca",
  Regione: "Regioni, Province Autonome",
  Comune: "Grandi Comuni individuali",
  "Comuni Aggregati": "~7.650 Comuni aderenti aggregati",
  "Regioni Aggregate": "Regioni e Province Autonome come classe di enti",
  "Classi aggregate": "Altre classi di enti aderenti: Province, Scuole, Università, Sanità, Gestori, Enti privati, PA locali e centrali",
};

export default function GuideView() {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px" }}>
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <div style={{ fontSize: 10, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Guida all'uso</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "var(--ink-strong)", marginBottom: 6 }}>Come navigare il grafo</div>
      <div style={{ fontSize: 13, color: "var(--ink-faint)", marginBottom: 24, lineHeight: 1.6 }}>
        Il grafo rappresenta la rete dell'interoperabilità tra le Pubbliche Amministrazioni italiane.
        Ogni nodo è un ente, ogni arco è un flusso di dati tramite e-service.
      </div>

      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid var(--line)" }}>Interazioni</div>
        <Shortcut icon="🖱" label="Click su un nodo" desc="Apre il pannello dettagli con l'elenco degli e-services erogati e fruiti dall'ente selezionato." />
        <Shortcut icon="✋" label="Trascina un nodo" desc="Sposta il nodo nella posizione desiderata. Gli altri nodi si riadattano automaticamente grazie alla simulazione fisica." />
        <Shortcut icon="🔍" label="Scroll (rotellina)" desc="Zoom avanti e indietro. Lo zoom è centrato sulla posizione del cursore." />
        <Shortcut icon="↔" label="Trascina lo sfondo" desc="Clicca e trascina su un'area vuota per spostare l'intera vista del grafo (pan)." />
        <Shortcut icon="🏷" label="Click sulla legenda" desc="Filtra il grafo per categoria: vengono evidenziati solo gli enti della categoria selezionata. Clicca di nuovo per rimuovere il filtro." />
        <Shortcut icon="⤢" label="Pulsante Centra" desc="Riporta la mappa a tutto schermo dopo zoom e spostamenti. All'apertura la mappa si adatta da sola allo schermo." />
        <Shortcut icon="Aa" label="Etichette" desc="Per restare leggibili, le etichette che si sovrapporrebbero vengono nascoste: avvicinati con lo zoom per vederle tutte, oppure passa il puntatore su un ente." />
        <Shortcut icon="🔎" label="Barra di ricerca" desc="Cerca un ente per nome: i nodi non corrispondenti vengono attenuati e compaiono i suggerimenti. Con Invio apri il primo ente trovato, con Esc svuoti la ricerca o chiudi il pannello. È il modo per usare la mappa da tastiera." />
        <Shortcut icon="☀" label="Tema chiaro o scuro" desc="Il pulsante accanto a «Il progetto» alterna i due temi. La scelta resta memorizzata nel browser; finché non scegli, vale la preferenza del sistema." />
        <Shortcut icon="⇢" label="Filtro sulla provenienza" desc="Dal menu accanto alle categorie scegli quali archi vedere: tutti, solo l'uso osservato, solo le fonti ufficiali o senza stime AI. Su schermi ampi puoi anche cliccare le voci della legenda in basso a destra. Il filtro resta nell'indirizzo della pagina." />
        <Shortcut icon="☰" label="Scheda Relazioni" desc="Tutte le relazioni in tabella, con filtri per erogatore, fruitore, categoria e provenienza, riepilogo raggruppato e download CSV. L'indirizzo della pagina conserva i filtri, così puoi condividere la vista." />
        <Shortcut icon="⌕" label="Scheda Il tuo ente" desc="Cerca un ente per nome o codice IPA fra tutti gli aderenti alla PDND, anche quelli che nella mappa sono compresi in una classe: vedi il tipo di ente, gli e-service che pubblica e i servizi usati dagli enti del suo tipo." />
        <Shortcut icon="▤" label="Scheda e-service" desc="Clicca il nome di un e-service nel pannello dettagli, nella scheda Relazioni o nella scheda Numeri: si apre la sua scheda con erogatore, fruitori per provenienza, dati d'uso ufficiali e gli altri servizi dello stesso ente." />
      </div>

      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid var(--line)" }}>Come leggere il grafo</div>

        <div style={{ padding: "14px 16px", borderRadius: 8, background: "var(--card-inset)", border: "1px solid var(--line)", marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 8 }}>Nodi</div>
          <div style={{ fontSize: 12, color: "var(--ink-muted)", lineHeight: 1.7 }}>
            Ogni nodo rappresenta un ente aderente alla PDND. La <strong style={{ color: "var(--ink)" }}>dimensione</strong> è proporzionale
            al numero totale di connessioni (e-services erogati + fruiti). Il <strong style={{ color: "var(--ink)" }}>colore</strong> indica
            la categoria dell'ente. Il <strong style={{ color: "var(--ink)" }}>badge numerico</strong> in alto a destra mostra il conteggio delle connessioni.
          </div>
        </div>

        <div style={{ padding: "14px 16px", borderRadius: 8, background: "var(--card-inset)", border: "1px solid var(--line)", marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 8 }}>Archi</div>
          <div style={{ fontSize: 12, color: "var(--ink-muted)", lineHeight: 1.7 }}>
            Ogni arco rappresenta una relazione erogatore→fruitore. La <strong style={{ color: "var(--ink)" }}>freccia</strong> indica
            la direzione del flusso dati. Lo <strong style={{ color: "var(--ink)" }}>spessore</strong> è proporzionale al numero
            di e-services condivisi tra i due enti. Gli archi <strong style={{ color: "var(--ink)" }}>curvi</strong> indicano
            connessioni multiple.
          </div>
        </div>

        <div style={{ padding: "14px 16px", borderRadius: 8, background: "var(--card-inset)", border: "1px solid var(--line)" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 8 }}>Layout force-directed</div>
          <div style={{ fontSize: 12, color: "var(--ink-muted)", lineHeight: 1.7 }}>
            I nodi si dispongono automaticamente tramite una simulazione fisica: gli enti collegati si attraggono,
            quelli non collegati si respingono. Questo fa emergere naturalmente la struttura della rete —
            hub centrali, cluster tematici, periferia — senza posizionamento manuale.
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid var(--line)" }}>Parole chiave</div>
        <dl style={{ margin: 0 }}>
          {Object.entries(GLOSSARIO).map(([k, v]) => (
            <div key={k} style={{ padding: "9px 0", borderBottom: "1px solid var(--line)" }}>
              <dt style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{v.termine}</dt>
              <dd style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--ink-muted)", lineHeight: 1.6 }}>{v.spiegazione}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid var(--line)" }}>Categorie degli enti</div>
        {Object.entries(CATEGORY_COLORS).map(([cat, col]) => (
          <LegendItem key={cat} color={col} label={cat} desc={CATEGORY_DESCRIPTIONS[cat]} />
        ))}
      </div>
    </div>
    </div>
  );
}
