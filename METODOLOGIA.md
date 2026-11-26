# Metodologia e Fonti Dati

Questo documento descrive in modo trasparente come sono stati ottenuti, elaborati
e rappresentati i dati pubblici visualizzati nel grafo degli e-service PDND.

## Indice

| Sezione | Contenuto |
|---------|-----------|
| [1. Fonti dati ufficiali utilizzate](#1-fonti-dati-ufficiali-utilizzate) | Dataset ufficiali PDND utilizzati come base del progetto |
| [2. Fonti documentali per le relazioni erogatore–fruitore](#2-fonti-documentali-per-le-relazioni-erogatorefruitore) | Documentazione pubblica usata per ricostruire le connessioni |
| [3. Scelte di rappresentazione e aggregazioni](#3-scelte-di-rappresentazione-e-aggregazioni) | Criteri adottati per rendere il grafo leggibile e significativo |
| [4. Limitazioni note](#4-limitazioni-note) | Limiti e assunzioni del modello rappresentato |
| [5. Come verificare e aggiornare i dati](#5-come-verificare-e-aggiornare-i-dati) | Modalità di aggiornamento e verifica del dataset |
| [6. Licenza dei dati](#6-licenza-dei-dati) | Licenze delle fonti originali e dell’elaborazione |
| [7. Modello v2 (novembre 2026)](#7-modello-v2-novembre-2026) | Classi di enti, archi osservati, selezione per uso reale, verifiche sulle fonti ufficiali |

> Le sezioni 1–6 descrivono il modello **v1** del 2 maggio 2026, quello del report
> Zenodo, conservato in `src/data/snapshots/pdnd-data.2026-05-02.json`. Il grafo
> pubblicato è il modello **v2** descritto nella sezione 7, che conserva tutte le
> relazioni del v1.

## 1. Fonti dati ufficiali utilizzate

### 1.1 Catalogo e-service (`eservice_a_catalogo.csv`)

- **Fonte:** [github.com/italia/pdnd-opendata](https://github.com/italia/pdnd-opendata)
- **Pubblicazione:** dati.gov.it — Dataset ID `0dfbeb46-736d-4af3-841c-9593d8f6c434`
- **Licenza:** CC0 1.0 Universal (Pubblico Dominio)
- **Aggiornamento:** quotidiano
- **Editore:** PagoPA S.p.A. per PCM - Dipartimento per la Trasformazione Digitale
- **Contenuto:** elenco di tutti gli e-service pubblicati nel catalogo PDND Interoperabilità,
  con ID, nome, descrizione, tecnologia (REST/SOAP), ID e nome dell'ente erogatore,
  codice IPA, attributi di accesso, stato di pubblicazione e versione.

**Utilizzo nel grafo:** questo dataset è la fonte primaria per i **nodi erogatori** e per
l'elenco degli **e-service**. Ogni e-service nel CSV contiene l'identificativo dell'ente
che lo eroga (`producerId`, `producerName`).

### 1.2 Aderenti (`aderenti.csv`)

- **Fonte:** [github.com/italia/pdnd-opendata](https://github.com/italia/pdnd-opendata)
- **Pubblicazione:** dati.gov.it — Dataset ID `b6e909a0-53cd-417d-a37f-04c11fed8939`
- **Licenza:** CC0 1.0 Universal
- **Contenuto:** elenco di tutti gli enti aderenti alla PDND con ID, nome, codice fiscale,
  codice IPA e attributi certificati.

**Utilizzo nel grafo:** questo dataset è la fonte per l'elenco completo degli **enti (nodi)**
e per la loro categorizzazione.

### 1.3 E-service più utilizzati

- **Fonte:** [github.com/italia/pdnd-opendata](https://github.com/italia/pdnd-opendata)
- **Pubblicazione:** dati.gov.it — Dataset ID `470d8c0e-ee4d-4a36-84af-9521e7f34a8a`
- **Contenuto:** e-service ordinati per numero di enti fruitori attivi (ultimi 6 mesi e totali).

**Utilizzo nel grafo:** questo dataset fornisce il **numero** di enti fruitori per ogni
e-service, confermando quali servizi sono effettivamente utilizzati. Non contiene però
l'identità dei singoli fruitori.

> Nel modello v2 le classifiche di enti abilitati e di sessioni di scambio, divise
> per categoria di ente fruitore, sono la base degli archi **osservati**: vedi §7.1.

### 1.4 Connessioni abilitate

- **Fonte:** pagina "I numeri della PDND" — [interop.pagopa.it/numeri](https://www.interop.pagopa.it/numeri)
- **Contenuto:** numero aggregato di connessioni (accordi di interoperabilità) abilitate.

**Utilizzo nel grafo:** dato utilizzato solo come riferimento numerico complessivo
(6.400+ connessioni al 2024), non come fonte per le singole coppie erogatore–fruitore.
Al 24 novembre 2026 la stessa pagina riporta 55.504 connessioni (§7.5).

## 2. Fonti documentali per le relazioni erogatore–fruitore

> **Nota.** I dataset open data della PDND **non pubblicano** le coppie puntuali
> `erogatore → fruitore → e-service`. Il dato sulle connessioni è disponibile solo
> come conteggio aggregato. Le relazioni (archi) rappresentate nel grafo sono state
> **ricostruite** a partire dalle seguenti fonti documentali ufficiali:

### 2.1 Campo `attributes` del catalogo e-service

Ogni e-service nel CSV contiene un campo `attributes` in formato JSON che specifica
le **categorie di enti** autorizzate a fruire del servizio. Esempio:

```json
{
  "certified": [
    { "name": "Pubbliche Amministrazioni" },
    { "name": "Comuni e loro Consorzi e Associazioni" }
  ]
}
```

Questo dato indica chi **può** richiedere la fruizione, non chi **sta effettivamente
fruendo**. Nel grafo, è stato usato per determinare quali categorie di enti sono
fruitori plausibili di ciascun e-service.

### 2.2 Documentazione ANPR (Ministero dell'Interno)

- **Fonte:** [anagrafenazionale.interno.it/area-tecnica/accesso-ai-dati](https://www.anagrafenazionale.interno.it/area-tecnica/accesso-ai-dati/)
- **Circolare DAIT n.73 del 31 maggio 2023** — definisce i casi d'uso e le finalità
  per i Comuni.
- **Circolare DAIT n.61 del 23 giugno 2025** — estende l'accesso a Regioni e
  Province Autonome.

Questa documentazione specifica quali e-service ANPR sono disponibili (Notifica,
Comunicazione, Verifica, Accertamento, Verifica Decesso) e per quali categorie
di enti l'approvazione è automatica o manuale.

### 2.3 Presentazione ANCI/DTD — 26 casi d'uso PDND

- **Fonte:** [anci.it — Presentazione PDND_ANPR (settembre 2023)](https://www.anci.it/wp-content/uploads/Presentazione-PDND_ANPR_ANCI_sett.2023.pdf)

Questo documento elenca esplicitamente gli enti erogatori e le banche dati coinvolte
nell'ecosistema "Welfare as a Service" e altri casi d'uso, tra cui:
- Ministero dell'Interno → ANPR, BDNA
- Unioncamere → Registro Imprese
- ANAC → Banca Dati Contratti Pubblici, SIMOG
- Ministero della Giustizia → Casellario Giudiziale
- MIT (DG-Mot) → Veicoli, Patenti, CUDE
- INPS → Casellario Assistenza, Casellario Lavoratori Attivi, Pensionati, ISEE, DURC
- MUR → ANIS
- AdE → Anagrafe tributaria, ANNCSU
- AgID → INAD, Indice PA
- MEF → Anagrafe Dipendenti Pubblici, noiPA
- AdE Riscossione → Situazione debitoria
- INAIL → DURC
- Ministero della Cultura → Banca dati beni culturali

### 2.4 Manuale operativo SSU (Unioncamere)

- **Fonte:** [catalogo.impresainungiorno.gov.it — Manuale operativo E-Service Catalogo SSU](https://catalogo.impresainungiorno.gov.it/assets/config/files/manuale_operativo_Eservice_CatalogoSSU.pdf)
- **Versione:** 3, Novembre 2024

Documenta i 6 e-service del Catalogo SSU (tra cui Metadati, Back Office SUAP, Back Office
Enti Terzi, ComUnica, Registro Imprese) e il ruolo di Unioncamere come erogatore.

### 2.5 Articoli e approfondimenti tecnici

- Agenda Digitale: ["PDND: i servizi disponibili e come usarli"](https://www.agendadigitale.eu/cittadinanza-digitale/piattaforma-digitale-nazionale-dati-pdnd-i-servizi-disponibili-e-come-usarli/) (luglio 2024)
- Agenda Digitale: ["PDND a che punto siamo"](https://www.agendadigitale.eu/cittadinanza-digitale/piattaforma-digitale-nazionale-dati-a-che-punto-siamo-i-servizi-gia-disponibili-e-i-prossimi-step/) (maggio 2024)
- Associazione Cittadinanza Digitale: ["Api.gov.it: il Catalogo API"](https://www.associazionecittadinanzadigitale.org/2026/01/03/api-gov-it-il-catalogo-api-per-la-consultazione-dei-servizi-digitali-su-pdnd/) (gennaio 2026)
- I.PaC: ["Pubblicata la core release e gli e-service su PDND"](https://ipac.cultura.gov.it/2024/08/02/i-pac-pubblicata-la-core-release-e-gli-e-service-sul-pdnd/) (agosto 2024)

### 2.6 Utilizzo di modelli AI

Le relazioni erogatore–fruitore sono state ricostruite con l'ausilio di modelli
di intelligenza artificiale (LLM), utilizzati come strumento di analisi per:

- **incrociare** le fonti documentali elencate nelle sezioni 2.1–2.5
- **estrarre** le informazioni rilevanti su chi eroga e chi fruisce da documenti
  non strutturati (circolari, manuali, presentazioni)
- **collegare** il campo `attributes` del catalogo CSV con la documentazione
  istituzionale per inferire le connessioni plausibili
- **strutturare** il risultato nel formato JSON utilizzato dall'applicazione

I modelli AI non hanno generato informazioni autonomamente: ogni connessione
rappresentata nel grafo è riconducibile a una o più delle fonti documentali
pubbliche elencate in questa sezione. L'AI è stata lo strumento per
sistematizzare un lavoro di ricognizione che avrebbe altrimenti richiesto
l'analisi manuale di decine di documenti eterogenei.

Il progetto usa esclusivamente informazioni già pubbliche, rielaborate e messe in
relazione: nessun dato riservato o non pubblicato.

## 3. Scelte di rappresentazione e aggregazioni

### 3.1 Aggregazione dei Comuni

Il catalogo PDND contiene **14.102 API pubblicate** (snapshot 2026-05). Gran parte
sono servizi standard pubblicati individualmente da ciascun Comune aderente (~7.500
Comuni): i nove tipi più diffusi coprono da soli 6.382 endpoint, quasi la metà del
catalogo. I conteggi misurati sul catalogo:

| Tipo di servizio comunale       | Endpoint nel catalogo |
|---------------------------------|----------------------:|
| Albo Pretorio Online            | 1.451                 |
| Pratiche SUAP                   | 1.429                 |
| Protocollo Informatico          | 1.296                 |
| Servizi Demografici             | 637                   |
| Tributi e Posizioni Debitorie   | 480                   |
| Numerazione Civica / Stradario  | 395                   |
| WaaS (Welfare as a Service)     | 372                   |
| Dati Sensori IoT                | 221                   |
| Amministrazione Trasparente     | 101                   |
| **Totale aggregabile**          | **6.382**             |

> I numeri sopra derivano da un'analisi euristica sul nome dei servizi nel
> CSV `eservice_a_catalogo.csv`. Per misurarli direttamente sul catalogo
> aggiornato vedi `npm run compare-catalog` in §5.

Rappresentare ogni Comune come nodo singolo renderebbe il grafo illeggibile
(migliaia di nodi con servizi identici). Per questo motivo:

- **I Comuni aderenti** sono aggregati in un unico nodo chiamato
  **"Comuni (aggregati)"**, che rappresenta collettivamente i ~7.500 Comuni
  aderenti alla PDND, tranne i 6 rappresentati individualmente.
- **6 grandi Comuni** (Milano, Roma, Napoli, Bologna, Genova, Padova) sono
  rappresentati come nodi individuali. Tre di essi (Bologna, Genova, Padova)
  erogano servizi specifici non standard documentati. Gli altri tre (Milano,
  Roma, Napoli) compaiono nel modello come `Fruitore`: la documentazione
  pubblica non riporta ad oggi servizi specifici dichiarati erogati da loro
  sul catalogo PDND.
- I **servizi comunali standard** (Albo Pretorio, SUAP, ecc.) sono rappresentati
  come e-service singoli erogati dal nodo aggregato, con l'indicazione del numero
  effettivo di endpoint nel catalogo.

### 3.2 Selezione degli enti rappresentati

Il modello v1 include **51 nodi**, selezionati con questi criteri:

- **Tutte le PA centrali** che erogano e-service documentati nel catalogo e nelle
  fonti ufficiali (Ministeri, INPS, INAIL, AgID, ANAC, Agenzia delle Entrate,
  Ministero del Lavoro, Ministero delle Infrastrutture e Trasporti, Dipartimento
  della Funzione Pubblica, Agenzia del Demanio, ecc.)
- **6 grandi Comuni** come fruitori e micro-erogatori (Bologna, Genova, Padova
  come erogatori di servizi specifici; Milano, Roma, Napoli come fruitori)
- **Le 21 amministrazioni regionali**: 19 Regioni e le Province Autonome di
  Trento e Bolzano.
- **1 nodo aggregato** per i Comuni minori

Per vedere i producer non rappresentati si può lanciare `npm run compare-catalog`.

### 3.3 Categorizzazione degli enti

Ogni ente è classificato in una categoria per la colorazione del grafo.
Le categorie sono state assegnate in base alla funzione istituzionale prevalente:

| Categoria          | Criteri di assegnazione                              |
|--------------------|------------------------------------------------------|
| Ministero          | Ministeri e dipartimenti della PCM                   |
| Previdenza         | INPS                                                 |
| Fisco              | Agenzia delle Entrate, AdE Riscossione               |
| Digitale           | AgID, PagoPA                                         |
| Lavoro             | INAIL                                                |
| Imprese            | Unioncamere                                          |
| Anticorruzione     | ANAC                                                 |
| Trasporti          | MIT – DG Motorizzazione                              |
| Cultura            | Ministero della Cultura (I.PaC)                      |
| Statistica         | ISTAT                                                |
| Tecnologia         | Sogei, Cineca                                        |
| Regione            | Regioni, Province Autonome                           |
| Comune             | Grandi Comuni individuali                            |
| Comuni Aggregati   | Nodo aggregato dei Comuni minori                     |
| Regioni Aggregate  | Nodo aggregato delle Regioni (eleggibilità inferita) |

Nel modello v2 si aggiungono Agenzia del Demanio e Agenzia delle Dogane e dei
Monopoli (Fisco), il MIT accanto alla DG Motorizzazione (Trasporti), ISPRA
(Statistica), la categoria **Società pubblica** (Poste Italiane, Istituto
Poligrafico e Zecca dello Stato) e la categoria **Classi aggregate**, che raccoglie
le otto classi di enti diverse da Comuni e Regioni (§7.2).

### 3.4 Natura degli archi (connessioni)

Ogni arco nel grafo rappresenta una relazione **erogatore → fruitore** per un
dato e-service. Gli archi **non** rappresentano necessariamente un accordo di
interoperabilità attivo e verificato sulla piattaforma PDND, ma una relazione
di fruizione **documentata o inferita** dalle fonti elencate nella Sezione 2.

La distinzione grafica degli archi segue questa logica:
- **Spessore:** proporzionale al numero di e-service condivisi tra due enti
- **Freccia direzionale:** indica il verso erogatore → fruitore
- **Luminosità:** gli archi si evidenziano al passaggio del mouse o alla selezione di un nodo
- **Tratteggio:** gli archi *inferiti dall'AI* (vedi sotto) sono tratteggiati, quelli documentati o certificati sono a linea piena
- **Nel modello v2:** gli archi *ricostruiti* del v1 hanno un tratteggio lungo e quelli *osservati* sono azzurri a linea piena; le cinque provenienze sono descritte in §7.3

**Provenienza degli archi.** Ogni arco porta una provenienza esplicita (`origine`),
su tre livelli di affidabilità decrescente (cinque nel modello v2, vedi §7.3):

1. **Documentata** — ricostruita da documentazione ufficiale pubblica (circolari,
   manuali, presentazioni; vedi Sezione 2). Massima affidabilità, prevale su tutto.
2. **Certificata** — derivata dal campo `attributes.certified` del catalogo, che
   dichiara la categoria di enti autorizzati alla fruizione. Dato pubblico e deterministico.
3. **Inferita** — stimata da un modello di intelligenza artificiale per gli e-service
   privi di categoria certificata e di override documentato, allo scopo di garantire
   una copertura completa. Ogni inferenza porta un punteggio di confidenza; sotto
   soglia viene scartata. Questi archi sono resi **tratteggiati** nel grafo e, prima della rappresentazione, sono normalizzati sugli aggregati (vedi sotto).

> **Distinzione epistemica.** Gli archi *documentati* e *certificati* sono fatti
> verificabili da fonti pubbliche. Gli archi *inferiti* sono stime ragionate del
> modello, dichiarate come tali e non presentate come fatti: per ciascuno sono
> conservate confidenza e motivazione, e un arco inferito può essere promosso a
> "documentato" quando se ne trova la fonte ufficiale.

**Normalizzazione degli archi inferiti.** Le città e le regioni rappresentate
come nodi distinti costituiscono un campione selezionato in fase di modellazione
(Sezione 3.2), non l’esito di un’evidenza nel dato. Un arco inferito verso, ad
esempio, il Comune di Milano o la Regione Lazio rifletterebbe quindi la nostra
scelta di nodi e non un’informazione del catalogo. Per non presentare un artefatto
di campionamento come una connessione puntuale, gli archi di sola origine
*inferita* vengono normalizzati in modo deterministico: i nodi-Comune confluiscono
nell’aggregato **Comuni (aggregati)** e i nodi-Regione o Provincia Autonoma
nell’aggregato **Regioni (aggregati)**. L’arco risultante dichiara così
un’**eleggibilità di classe stimata** anziché un rapporto bilaterale non
documentabile. Le istituzioni distinte (ministeri, enti previdenziali e
assicurativi, autorità) restano invece **nominate**, perché sono enti reali
tracciati singolarmente e non campioni di un insieme. La normalizzazione si applica
**esclusivamente** agli archi inferiti: gli archi *certificati* e *documentati*
conservano i nomi puntuali, perché in quei casi l’ente è ancorato rispettivamente
al campo `attributes.certified` del catalogo o a una fonte ufficiale.

**Riproducibilità (inferenze congelate).** Per garantire che il grafo sia
riproducibile, le inferenze del modello non sono rigenerate a ogni esecuzione: una
volta prodotte e normalizzate, vengono fissate nel file versionato
`pipeline/connections-frozen.json` e riapplicate in modo deterministico. La
pipeline non effettua quindi chiamate AI a runtime per impostazione predefinita
(l’allowlist `inference-allowlist.json` è vuota); il modello viene riusato solo come
strumento di scoperta, in modo esplicito, aggiungendo un catalogId all’allowlist.
Gli archi così congelati restano dichiarati come stime (origine *inferita*,
tratteggiati) e non come fatti documentati.



### 3.5 Tipi di servizio (service-type) vs endpoint del catalogo

Una conseguenza diretta dell'aggregazione descritta in §3.1: ogni record
nell'array `eservices[]` di `pdnd-data.json` rappresenta un **tipo di
servizio**, non un singolo endpoint del catalogo PDND.

Lo stesso servizio standardizzato (es. *Albo Pretorio*) compare nel grafo come
un nodo solo, ma corrisponde a centinaia o migliaia di endpoint reali nel
catalogo, uno per ciascun ente che lo pubblica.

**Conseguenze numeriche (snapshot 2026-05):**

- Il catalogo PDND ufficiale conta **14.102 API pubblicate** prodotte da 6.388
  enti distinti.
- Il modello rappresenta **86 e-service-tipo** in 51 nodi, di cui 9 sul nodo
  aggregato dei Comuni minori e 22 placeholder regionali/ministeriali per i
  nuovi enti aggiunti.
- I 9 e-service del nodo aggregato coprono **6.382 endpoint reali** (vedi
  tabella in §3.1). Il resto dei nodi copre tipicamente uno-a-uno o uno-a-pochi
  endpoint del catalogo.
- La copertura totale del modello rispetto al catalogo è del **~89%**
  misurata dallo script `compare-catalog`. Il gap residuo (~11%) è composto in
  larga parte da producer regionali con pochi endpoint, da società partecipate
  e da enti molto specifici fuori scope per il modello attuale.
- L'avvertenza compare anche nell'app: nella scheda **Numeri** una nota
  ricorda che alcuni record sono tipi di servizio; nel pannello dettagli del nodo
  *Comuni (aggregati)* compare un avviso analogo.

## 4. Limitazioni note

1. **Le connessioni erogatore–fruitore non sono dati aperti strutturati.**
   Il dataset ufficiale PDND pubblica il numero aggregato di connessioni
   (oltre 6.400 nel 2024) ma non le coppie puntuali. Le relazioni nel grafo derivano da
   documentazione ufficiale, campo `attributes` del CSV e inferenza ragionevole.

2. **I Comuni minori sono aggregati.** Questo significa che un arco tra
   "Comuni (aggregati)" e INPS non indica che tutti i 7.500 Comuni fruiscono
   del servizio, ma che il servizio è strutturalmente disponibile per la
   categoria "Comuni".

3. **Regioni e Province Autonome.** Sono rappresentate individualmente tutte le
   21 amministrazioni regionali (19 Regioni e le Province Autonome di Trento e
   Bolzano), sia nel v1 sia nel v2. Gli altri enti regionali (agenzie,
   società in-house) non hanno un nodo proprio.

4. **Versioni e-service.** Le versioni indicate nel grafo sono quelle
   documentate nelle fonti al momento della compilazione e potrebbero non
   corrispondere all'ultima versione attiva nel catalogo.

5. **Servizi sospesi o in beta.** Il catalogo PDND contiene anche e-service
   con stato `SUSPENDED` o in fase beta. Nel grafo sono rappresentati solo
   i servizi con stato documentato come "Attivo", salvo dove esplicitamente
   indicato.

I limiti specifici del modello v2 (classi di enti, minimi garantiti, e-service
senza archi) sono in §7.6.

## 5. Come verificare e aggiornare i dati

### Verificare il catalogo attuale

```bash
npm run update-data
```

Scarica il CSV aggiornato da `github.com/italia/pdnd-opendata` e produce un
riepilogo del catalogo per erogatore e per tipologia.

### Auditare il modello

Script idempotenti, integrati nel `package.json`, supportano la verifica
ripetibile del modello a ogni modifica di `src/data/pdnd-data.json`:

```bash
npm run audit             # audit interno del JSON
npm run compare-catalog   # confronto contro il catalogo ufficiale
npm test                  # invarianti del modello, conservazione del v1, esportazioni
npm run export            # rigenera GraphML, GEXF e CSV in exports/
npm run paper-metrics     # genera snippet LaTeX per il paper Zenodo
```

L'audit `npm run audit` produce un report strutturato del modello: conteggi,
distribuzione e-service per erogatore, distribuzione gradi della rete derivata,
top-N per ruolo e una sezione di consistency checks che segnala discrepanze
tra il `tipo` dichiarato di un nodo e il suo comportamento effettivo nel grafo.

Il confronto `npm run compare-catalog` scarica il CSV del catalogo e calcola
la copertura percentuale del modello rispetto al catalogo ufficiale, evidenzia
i tipi di servizio ricostruiti euristicamente e segnala i producer rilevanti
non ancora rappresentati. Se la rete non è disponibile, accetta il flag
`--csv <path-to-local-csv>` come fallback.

`npm run paper-metrics` produce gli stessi numeri in formato pgfplots/LaTeX,
pronti per essere incollati nel sorgente del paper Zenodo. Per riprodurre i
numeri del report va passato lo snapshot v1
(`src/data/snapshots/pdnd-data.2026-05-02.json`) come argomento.

La documentazione completa degli script è in [scripts/README.md](scripts/README.md).

### Fonti di aggiornamento

| Risorsa | URL | Frequenza |
|---------|-----|-----------|
| CSV catalogo e-service | [github.com/italia/pdnd-opendata](https://github.com/italia/pdnd-opendata) | Quotidiana |
| Classifiche di adozione e uso, aderenti | [github.com/italia/pdnd-opendata](https://github.com/italia/pdnd-opendata) | Periodica |
| Catalogo API navigabile | [api.gov.it](https://api.gov.it/it/catalogo) | Continua |
| Numeri della PDND | [interop.pagopa.it/numeri](https://www.interop.pagopa.it/numeri) | Continua |
| Documentazione ANPR | [anagrafenazionale.interno.it](https://www.anagrafenazionale.interno.it/area-tecnica/accesso-ai-dati/) | Ad aggiornamento |

### Aggiornamento automatico (pipeline)

Lo stato del grafo è mantenuto aggiornato da una pipeline automatica mensile
(`pipeline/build-graph-data.mjs`, GitHub Action `update-graph-data.yml`) che legge
il catalogo ufficiale, estrae gli e-service delle entità tracciate
(`pipeline/entities.json`) e le classi di enti (`pipeline/classi.json`), e
determina gli archi con le cinque provenienze descritte in §7.3: override
documentati (`pipeline/connections-overrides.json`), archi osservati dalle
classifiche ufficiali, baseline certificata (`pipeline/category-map.json`),
relazioni ricostruite del v1 (`pipeline/connections-reconstructed.json`) e
inferenze congelate (`pipeline/connections-frozen.json`).

La pipeline applica guard di validazione (catalogo minimo, calo nodi, zero servizi)
che impediscono la pubblicazione di dati corrotti. L'inferenza AI a runtime è
disattivata per impostazione predefinita (allowlist vuota): ogni build è
deterministica. L'anteprima diventa grafo live solo con una promozione manuale. Dettagli
operativi in `pipeline/README.md`.

### Segnalare correzioni

Se individui un errore nelle relazioni rappresentate o hai accesso a dati più
precisi sulle connessioni attive, apri una Issue o una Pull Request su questo
repository. Ogni contributo è benvenuto.

## 6. Licenza dei dati

I dati originali della PDND sono rilasciati con licenza
**CC0 1.0 Universal (Pubblico Dominio)** dalla Presidenza del Consiglio dei
Ministri – Dipartimento per la Trasformazione Digitale.

È apprezzato un riferimento alla provenienza:

> "Dati dai Numeri del portale PDND — CC0 Presidenza del Consiglio dei Ministri —
> Dipartimento per la Trasformazione Digitale"

La presente elaborazione (aggregazione, inferenza delle connessioni, visualizzazione)
è rilasciata con licenza AGPL-3.0.

## 7. Modello v2 (novembre 2026)

Il modello v2 è prodotto dalla pipeline (`pipeline/build-graph-data.mjs`) a partire
dai dataset ufficiali di [pdnd-opendata](https://github.com/italia/pdnd-opendata)
(CC0) e conserva, con provenienza dichiarata, tutte le 570 relazioni del v1.
Snapshot del 26 novembre 2026: 63 nodi (10 aggregati), 313 e-service, 600 archi
distinti erogatore→fruitore, 1.476 relazioni, densità 0,1536.

### 7.1 Fonti ufficiali usate dalla pipeline

| Dataset | Uso nel modello |
|---|---|
| `eservice_a_catalogo.csv` | E-service, stato, versione, attributi certificati (15.301 record; PagoPA dichiara 15.291 e-service pubblicati al 24/11/2026) |
| `e_service_con_piu_enti_abilitati_from_the_beginning.csv` | Enti fruitori abilitati per e-service e per categoria di fruitore: selezione e archi osservati |
| `eservice_con_piu_token_staccati_from_the_beginning.csv` | Sessioni di scambio per e-service e per categoria di fruitore, con id del catalogo: selezione e archi osservati |
| `aderenti.csv`, `totale_enti.csv` | Dimensione delle classi di enti |
| `andamento_delle_adesioni.csv`, `attivita_della_piattaforma_from_the_beginning.csv`, `totale_richieste_di_accesso.csv`, `connessioni_totali.csv`, `eservice_pubblicati.csv` | Andamento dell'intera piattaforma nella scheda Numeri: enti aderenti cumulati e sessioni di scambio per mese (scaglioni al 24 di ogni mese, dal 2022), totali con variazione dell'ultimo mese. Non dipendono dalla selezione della mappa |

Le classifiche elencano i primi 10 e-service per ogni coppia di categorie
erogatore × fruitore: i valori ricavati (`enti_abilitati_min`, `sessioni_min`,
`connessioni`, `sessioni`) sono **minimi garantiti**, non totali. Le classifiche
degli enti abilitati troncano il nome dell'e-service a 60 caratteri;
l'abbinamento al catalogo avviene su nome dell'erogatore e nome troncato (360 su
368 abbinati, nessuno ambiguo; gli 8 mancanti non sono più pubblicati).

### 7.2 Classi di enti

I fruitori che il modello non rappresenta individualmente sono raccolti in 10 nodi
di classe (`aggregato: true`), allineati alle 12 categorie di fruitori delle
statistiche ufficiali PagoPA (`pipeline/classi.json`): Comuni, Regioni, Province e
Città metropolitane, Scuole, Università e AFAM, Sanità, Gestori di pubblici servizi
e stazioni appaltanti, Enti privati, Altre PA locali, PA centrali (in cui
confluiscono PA centrali, altre PA centrali ed enti previdenziali).

Ogni nodo di classe riporta il numero di aderenti: il totale ufficiale dove PagoPA
lo pubblica (Comuni 7.657, Regioni 21, Università e AFAM 172, Enti privati 306),
altrimenti il conteggio per attributo certificato in `aderenti.csv`, assegnando
ogni aderente a una sola classe. Il conteggio grezzo non è usato per i Comuni
perché l'elenco include anche articolazioni interne degli enti (8.062 righe contro
7.657 Comuni ufficiali).

**Regola di mappatura.** Una categoria del catalogo o delle statistiche indica
un'intera classe di enti e va sul nodo di classe, mai su un campione di enti scelti
dal progetto. Restano nominati gli enti citati esplicitamente nel catalogo e i
ministeri (enti distinti, tutti quelli tracciati). L'attributo "Pubbliche
Amministrazioni" (qualsiasi PA) va su tutte le classi pubbliche.

### 7.3 Provenienza degli archi

Ogni arco dichiara una provenienza; quando più fonti sostengono lo stesso arco vale
la più forte, in quest'ordine:

| Origine | Significato | Archi |
|---|---|---|
| `documentata` | Override con fonte ufficiale puntuale (`connections-overrides.json`) | 12 |
| `osservata` | Connessioni abilitate o sessioni di scambio realmente registrate dalla PDND verso una classe di enti | 264 |
| `certificata` | Classe di enti abilitata nel campo `attributes.certified` del catalogo | 630 |
| `ricostruita` | Relazione del modello v1 (`connections-reconstructed.json`) | 545 |
| `inferita` | Stima AI congelata (`connections-frozen.json`), solo se manca ogni altra prova | 25 |

Il numero di connessioni e di sessioni osservate accompagna l'arco qualunque sia la
sua provenienza. Delle 570 relazioni del v1, 25 trovano conferma nei dati
ufficiali (18 certificate, 7 osservate); le altre restano `ricostruita`.

**Archi documentati da norma (aggiornamento del 26 novembre 2026).** Il DL 19
febbraio 2026, n. 19, art. 6, convertito dalla L. 20 aprile 2026, n. 50, prevede che
scuole, università e Comuni che erogano prestazioni agevolate acquisiscano d'ufficio
dall'INPS, tramite la PDND, i dati ISEE strettamente necessari. Gli archi INPS →
Scuole, Università e AFAM, Comuni sono quindi `documentata` sui due servizi generali
di consultazione ISEE (Indicatore e Attestazione). La norma non indica il singolo
e-service: la scelta dei due servizi generali, e non delle varianti per residenti od
operatori, è del progetto ed è dichiarata in `connections-overrides.json`. Un arco
documentato da una norma attesta l'obbligo o la facoltà di acquisire il dato, non il
volume effettivo d'uso: quello resta indicato, dove pubblicato, da connessioni e
sessioni osservate.

### 7.4 Selezione degli e-service

Per ogni ente tracciato la pipeline include sempre gli e-service con archi curati
(override, relazioni v1, inferenze congelate), poi fino a `maxServices` quelli con
rilevanza più alta: il maggiore fra enti abilitati e sessioni di scambio, ciascuno
rapportato al massimo dell'ente. Così entrano sia i servizi con molti fruitori (per
esempio SEND, ≥7.041 enti) sia quelli con pochi fruitori ma volumi molto alti (per
esempio la patente su IT-Wallet, ≥103 milioni di sessioni). Il v1 e la prima
versione v2 sceglievano invece in ordine alfabetico, escludendo 5 dei 10 e-service
più richiesti della piattaforma.

### 7.5 Verifiche sulle fonti (25 novembre 2026)

- **Numeri ufficiali** ([interop.pagopa.it/numeri](https://www.interop.pagopa.it/numeri), aggiornati al 24/11/2026): 9.826 enti aderenti (306 privati), 15.291 e-service, 55.504 connessioni, 1,87 miliardi di sessioni di scambio.
- **Copertura**: `npm run compare-catalog` riporta l'88,7% degli e-service pubblicati coperti dai nodi del modello. Il parser dello script è stato corretto: dividendo il file per righe contava 469 record fantasma, generati dalle descrizioni su più righe.
- **Erogatori**: i 10 erogatori con più connessioni ufficiali sono tutti tracciati. Gli erogatori non tracciati con più API sono singole università e conservatori (circa 9 API standard ciascuno), Infratel e FNOMCeO.
- **Contesto normativo**: il DL 19/2026, convertito dalla L. 20 aprile 2026, n. 50, introduce nell'art. 50 del CAD il principio "once only" (comma 2-quater) e, all'art. 6, l'acquisizione d'ufficio dell'ISEE dall'INPS tramite PDND da parte di scuole, università e Comuni. Dal 15 gennaio 2026 la PDND è aperta alle imprese iscritte al Registro Imprese; dal 18 marzo 2026 sono disponibili le API v3. Le circolari DAIT n. 73/2023 (Comuni) e n. 61/2025 (Regioni) restano i riferimenti per i casi d'uso ANPR.

### 7.6 Limitazioni del v2

- Gli archi osservati e certificati verso i nodi di classe dichiarano che **almeno un ente** della classe è abilitato o fruisce, non che tutti lo fanno.
- I valori ufficiali sono minimi garantiti: un e-service fuori dalle classifiche non è necessariamente poco usato.
- 44 e-service restano senza archi: il catalogo non dichiara categorie di fruitori e non compaiono nelle classifiche ufficiali.
- Alcuni servizi attribuiti nel v1 a Cineca e alla DG Motorizzazione sono oggi pubblicati nel catalogo dal MUR (ANS) e dal MIT. Le relazioni v1 sono conservate con l'erogatore originale; i servizi del catalogo compaiono sotto il loro erogatore attuale.
