import { CATEGORY_COLORS } from "../constants/colors";

function Shortcut({ icon, label, desc }) {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "14px 0", borderBottom: "1px solid rgba(100,160,220,.06)" }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(30,40,60,.5)", border: "1px solid rgba(100,160,220,.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>{desc}</div>
      </div>
    </div>
  );
}

function LegendItem({ color, label, desc }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 0" }}>
      <div style={{ width: 12, height: 12, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <div>
        <span style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 600 }}>{label}</span>
        {desc && <span style={{ fontSize: 11, color: "#64748b" }}> — {desc}</span>}
      </div>
    </div>
  );
}

const CATEGORY_DESCRIPTIONS = {
  Ministero: "Ministeri e dipartimenti della PCM",
  Previdenza: "INPS",
  Fisco: "Agenzia delle Entrate, AdE Riscossione",
  Digitale: "AgID, PagoPA",
  Lavoro: "INAIL",
  Imprese: "Unioncamere",
  Anticorruzione: "ANAC",
  Trasporti: "MIT – DG Motorizzazione",
  Cultura: "Ministero della Cultura (I.PaC)",
  Statistica: "ISTAT",
  Tecnologia: "Sogei, Cineca",
  Regione: "Regioni, Province Autonome",
  Comune: "Grandi Comuni individuali",
  "Comuni Aggregati": "~7.500 Comuni minori aggregati",
  "Regioni Aggregate": "Regioni e Province Autonome come classe aggregata (eleggibilità stimata)",
};

export default function GuideView() {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", maxWidth: 720 }}>
      <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Guida all'uso</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", marginBottom: 6 }}>Come navigare il grafo</div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 24, lineHeight: 1.6 }}>
        Il grafo rappresenta la rete dell'interoperabilità tra le Pubbliche Amministrazioni italiane.
        Ogni nodo è un ente, ogni arco è un flusso di dati tramite e-service.
      </div>

      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid rgba(100,160,220,.08)" }}>Interazioni</div>
        <Shortcut icon="🖱" label="Click su un nodo" desc="Apre il pannello dettagli con l'elenco degli e-services erogati e fruiti dall'ente selezionato." />
        <Shortcut icon="✋" label="Trascina un nodo" desc="Sposta il nodo nella posizione desiderata. Gli altri nodi si riadattano automaticamente grazie alla simulazione fisica." />
        <Shortcut icon="🔍" label="Scroll (rotellina)" desc="Zoom avanti e indietro. Lo zoom è centrato sulla posizione del cursore." />
        <Shortcut icon="↔" label="Trascina lo sfondo" desc="Clicca e trascina su un'area vuota per spostare l'intera vista del grafo (pan)." />
        <Shortcut icon="🏷" label="Click sulla legenda" desc="Filtra il grafo per categoria: vengono evidenziati solo gli enti della categoria selezionata. Clicca di nuovo per rimuovere il filtro." />
        <Shortcut icon="🔎" label="Barra di ricerca" desc="Cerca un ente per nome. I nodi non corrispondenti vengono attenuati." />
      </div>

      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid rgba(100,160,220,.08)" }}>Come leggere il grafo</div>

        <div style={{ padding: "14px 16px", borderRadius: 8, background: "rgba(30,40,60,.3)", border: "1px solid rgba(100,160,220,.06)", marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", marginBottom: 8 }}>Nodi</div>
          <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7 }}>
            Ogni nodo rappresenta un ente aderente alla PDND. La <strong style={{ color: "#e2e8f0" }}>dimensione</strong> è proporzionale
            al numero totale di connessioni (e-services erogati + fruiti). Il <strong style={{ color: "#e2e8f0" }}>colore</strong> indica
            la categoria dell'ente. Il <strong style={{ color: "#e2e8f0" }}>badge numerico</strong> in alto a destra mostra il conteggio delle connessioni.
          </div>
        </div>

        <div style={{ padding: "14px 16px", borderRadius: 8, background: "rgba(30,40,60,.3)", border: "1px solid rgba(100,160,220,.06)", marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", marginBottom: 8 }}>Archi</div>
          <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7 }}>
            Ogni arco rappresenta una relazione erogatore→fruitore. La <strong style={{ color: "#e2e8f0" }}>freccia</strong> indica
            la direzione del flusso dati. Lo <strong style={{ color: "#e2e8f0" }}>spessore</strong> è proporzionale al numero
            di e-services condivisi tra i due enti. Gli archi <strong style={{ color: "#e2e8f0" }}>curvi</strong> indicano
            connessioni multiple.
          </div>
        </div>

        <div style={{ padding: "14px 16px", borderRadius: 8, background: "rgba(30,40,60,.3)", border: "1px solid rgba(100,160,220,.06)" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", marginBottom: 8 }}>Layout force-directed</div>
          <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7 }}>
            I nodi si dispongono automaticamente tramite una simulazione fisica: gli enti collegati si attraggono,
            quelli non collegati si respingono. Questo fa emergere naturalmente la struttura della rete —
            hub centrali, cluster tematici, periferia — senza posizionamento manuale.
          </div>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid rgba(100,160,220,.08)" }}>Categorie degli enti</div>
        {Object.entries(CATEGORY_COLORS).map(([cat, col]) => (
          <LegendItem key={cat} color={col} label={cat} desc={CATEGORY_DESCRIPTIONS[cat]} />
        ))}
      </div>
    </div>
  );
}
