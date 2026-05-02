function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", marginBottom: 10, paddingBottom: 8, borderBottom: "1px solid rgba(100,160,220,.08)" }}>{title}</div>
      <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.75 }}>{children}</div>
    </div>
  );
}

function Source({ name, url, desc, type }) {
  return (
    <div style={{ padding: "10px 14px", marginBottom: 6, borderRadius: 6, background: "rgba(30,40,60,.4)", border: "1px solid rgba(100,160,220,.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{name}</span>
        <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 3, fontWeight: 600, background: type === "ufficiale" ? "rgba(6,214,160,.1)" : "rgba(255,209,102,.1)", color: type === "ufficiale" ? "#06d6a0" : "#ffd166" }}>
          {type === "ufficiale" ? "✓ Dato ufficiale" : "⚠ Ricostruzione"}
        </span>
      </div>
      <div style={{ fontSize: 11, color: "#64748b" }}>{desc}</div>
      {url && <a href={url} target="_blank" rel="noopener" style={{ fontSize: 11, color: "#64b5f6", textDecoration: "none" }}>{url}</a>}
    </div>
  );
}

export default function MethodologyView() {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", maxWidth: 800 }}>
      <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Trasparenza metodologica</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", marginBottom: 6 }}>Come sono stati costruiti i dati</div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 28, lineHeight: 1.6 }}>
        Questo progetto si basa esclusivamente su informazioni già pubbliche, rielaborate e messe in relazione.
        Di seguito sono documentate le fonti, le scelte di rappresentazione e le limitazioni note.
      </div>

      <Section title="Fonti dati ufficiali">
        <Source name="Catalogo e-service" url="https://github.com/italia/pdnd-opendata" desc="Elenco completo degli e-service pubblicati sulla PDND con erogatore, attributi di accesso e stato — aggiornamento quotidiano su dati.gov.it" type="ufficiale" />
        <Source name="Aderenti PDND" url="https://github.com/italia/pdnd-opendata" desc="Lista di tutti gli enti aderenti alla piattaforma con codice IPA e attributi certificati" type="ufficiale" />
        <Source name="Numeri della PDND" url="https://www.interop.pagopa.it/numeri" desc="Statistiche aggregate su enti, e-service, connessioni e sessioni di scambio" type="ufficiale" />
      </Section>

      <Section title="Ricostruzione delle connessioni">
        <div style={{ padding: "12px 16px", borderRadius: 8, background: "rgba(255,209,102,.04)", border: "1px solid rgba(255,209,102,.12)", marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: "#ffd166", fontWeight: 600, marginBottom: 6 }}>⚠ Nota importante</div>
          <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
            I dataset open data della PDND <strong style={{ color: "#e2e8f0" }}>non pubblicano</strong> le coppie puntuali erogatore–fruitore.
            Le relazioni (archi) rappresentate nel grafo sono state ricostruite tramite modelli AI,
            incrociando le seguenti fonti documentali pubbliche:
          </div>
        </div>
        <Source name="Campo 'attributes' del catalogo" desc="Ogni e-service contiene le categorie di enti autorizzati a fruire (es. 'Pubbliche Amministrazioni', 'Comuni')" type="ricostruzione" />
        <Source name="Circolari ANPR" desc="Circolare DAIT n.73/2023 (Comuni) e n.61/2025 (Regioni) — casi d'uso e finalità approvate" type="ricostruzione" />
        <Source name="Presentazione ANCI/DTD" url="https://www.anci.it/wp-content/uploads/Presentazione-PDND_ANPR_ANCI_sett.2023.pdf" desc="26 casi d'uso documentati con flussi erogatore–fruitore espliciti" type="ricostruzione" />
        <Source name="Manuale SSU Unioncamere" url="https://catalogo.impresainungiorno.gov.it/assets/config/files/manuale_operativo_Eservice_CatalogoSSU.pdf" desc="6 e-service del Catalogo SSU con erogatore e fruitori documentati" type="ricostruzione" />
      </Section>

      <Section title="Aggregazione dei Comuni">
        <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.75 }}>
          Il catalogo PDND contiene 2.000+ API, la maggior parte delle quali sono servizi standard replicati
          da ciascuno dei ~7.500 Comuni aderenti (Albo Pretorio, Pratiche SUAP, Numerazione Civica, ecc.).
          Rappresentarli tutti avrebbe prodotto un grafo illeggibile.
        </div>
        <div style={{ margin: "14px 0", padding: "12px 16px", borderRadius: 8, background: "rgba(30,40,60,.4)", border: "1px solid rgba(100,160,220,.06)" }}>
          <div style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 600, marginBottom: 8 }}>Scelta adottata</div>
          <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
            I Comuni minori sono aggregati in un <strong style={{ color: "#4a7c91" }}>unico nodo</strong> chiamato "Comuni (aggregati)".
            6 grandi Comuni (Milano, Roma, Napoli, Bologna, Genova, Padova) sono mantenuti come nodi individuali
            perché erogano anche servizi specifici non standard.
          </div>
        </div>
      </Section>

      <Section title="Tipi di servizio vs endpoint del catalogo">
        <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.75, marginBottom: 14 }}>
          Una conseguenza diretta dell'aggregazione: ogni record nel grafo rappresenta un{" "}
          <strong style={{ color: "#e2e8f0" }}>tipo di servizio</strong>, non un singolo endpoint del catalogo PDND.
          Lo stesso servizio standardizzato (es. <em>Albo Pretorio</em>) compare nel grafo come un nodo solo
          ma corrisponde a centinaia o migliaia di endpoint reali nel catalogo, uno per ciascun Comune che lo pubblica.
        </div>
        <div style={{ padding: "12px 16px", borderRadius: 8, background: "rgba(30,40,60,.4)", border: "1px solid rgba(100,160,220,.06)", marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>Mappatura indicativa per i 9 servizi standard del nodo aggregato</div>
          {[
            ["Albo Pretorio Online", "~2.000"],
            ["Pratiche SUAP", "~1.500"],
            ["Numerazione Civica / Stradario", "~800"],
            ["Amministrazione Trasparente", "~500"],
            ["Servizi Demografici", "~400"],
            ["Tributi e Posizioni Debitorie", "~300"],
            ["WaaS – Welfare as a Service", "~300"],
            ["Protocollo Informatico", "~200"],
            ["Dati Sensori IoT", "~50"],
          ].map(([nome, count]) => (
            <div key={nome} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 12, borderBottom: "1px solid rgba(100,160,220,.04)" }}>
              <span style={{ color: "#cbd5e1" }}>{nome}</span>
              <span style={{ color: "#4a7c91", fontWeight: 600 }}>{count} endpoint</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 2px 0", fontSize: 12, fontWeight: 700, marginTop: 4 }}>
            <span style={{ color: "#e2e8f0" }}>Totale endpoint coperti dal nodo aggregato</span>
            <span style={{ color: "#06d6a0" }}>~6.050</span>
          </div>
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
          La tabella nella sezione <span style={{ color: "#ffd166" }}>Statistiche</span> riporta quindi 62 e-service: sono i 62 <em>tipi di servizio</em> del modello,
          non gli endpoint del catalogo. Espandendo le repliche municipali tramite la tabella sopra, il modello copre circa 6.050 endpoint del catalogo,
          il che è coerente con il dato pubblico "2.000+ API pubblicate" (le restanti sono servizi centrali rappresentati uno-a-uno).
        </div>
      </Section>

      <Section title="Utilizzo di modelli AI">
        <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.75 }}>
          I modelli AI sono stati utilizzati come strumento per incrociare le fonti documentali, estrarre informazioni
          da documenti non strutturati e collegare il campo <code style={{ fontSize: 11, padding: "1px 5px", borderRadius: 3, background: "rgba(30,40,60,.6)", color: "#e2e8f0" }}>attributes</code> del catalogo con la documentazione istituzionale.
          I modelli non hanno generato informazioni autonomamente: ogni connessione è riconducibile a fonti pubbliche verificabili.
        </div>
      </Section>

      <Section title="Limitazioni note">
        {[
          "Le connessioni rappresentano relazioni documentate o inferite, non necessariamente accordi di interoperabilità attivi e verificati sulla piattaforma.",
          "I Comuni aggregati non indicano che tutti i 7.500 Comuni fruiscono effettivamente di ogni servizio.",
          "Le Regioni incluse sono un campione rappresentativo, non l'intero insieme.",
          "Le versioni degli e-service potrebbero non corrispondere all'ultima versione attiva nel catalogo.",
        ].map((text, i) => (
          <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: 12 }}>
            <span style={{ color: "#ef476f", flexShrink: 0, marginTop: 2 }}>•</span>
            <span>{text}</span>
          </div>
        ))}
      </Section>

      <div style={{ padding: "14px 16px", borderRadius: 8, background: "rgba(100,160,220,.04)", border: "1px solid rgba(100,160,220,.1)" }}>
        <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
          La documentazione completa è disponibile nel file{" "}
          <a href="https://github.com/engineering87/pdnd-eservices-graph/blob/main/METODOLOGIA.md" target="_blank" rel="noopener" style={{ color: "#64b5f6", textDecoration: "none", fontWeight: 600 }}>METODOLOGIA.md</a> del repository.
          Per segnalare correzioni o contribuire con dati più precisi, apri una{" "}
          <a href="https://github.com/engineering87/pdnd-eservices-graph/issues" target="_blank" rel="noopener" style={{ color: "#64b5f6", textDecoration: "none" }}>Issue su GitHub</a>.
        </div>
      </div>
    </div>
  );
}
