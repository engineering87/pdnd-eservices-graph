# Metodologia e Fonti Dati

Questo documento descrive in modo trasparente come sono stati ottenuti, elaborati
e rappresentati i dati pubblici visualizzati nel grafo degli e-services PDND.

## Indice

| Sezione | Contenuto |
|---------|-----------|
| [1. Fonti dati ufficiali utilizzate](#1-fonti-dati-ufficiali-utilizzate) | Dataset ufficiali PDND utilizzati come base del progetto |
| [2. Fonti documentali per le relazioni erogatore–fruitore](#2-fonti-documentali-per-le-relazioni-erogatorefruitore) | Documentazione pubblica usata per ricostruire le connessioni |
| [3. Scelte di rappresentazione e aggregazioni](#3-scelte-di-rappresentazione-e-aggregazioni) | Criteri adottati per rendere il grafo leggibile e significativo |
| [4. Limitazioni note](#4-limitazioni-note) | Limiti e assunzioni del modello rappresentato |
| [5. Come verificare e aggiornare i dati](#5-come-verificare-e-aggiornare-i-dati) | Modalità di aggiornamento e verifica del dataset |
| [6. Licenza dei dati](#6-licenza-dei-dati) | Licenze delle fonti originali e dell’elaborazione |

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
l'elenco degli **e-services**. Ogni e-service nel CSV contiene l'identificativo dell'ente
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

### 1.4 Connessioni abilitate

- **Fonte:** pagina "I numeri della PDND" — [interop.pagopa.it/numeri](https://www.interop.pagopa.it/numeri)
- **Contenuto:** numero aggregato di connessioni (accordi di interoperabilità) abilitate.

**Utilizzo nel grafo:** dato utilizzato solo come riferimento numerico complessivo
(6.400+ connessioni al 2024), non come fonte per le singole coppie erogatore–fruitore.

## 2. Fonti documentali per le relazioni erogatore–fruitore

> **⚠️ NOTA IMPORTANTE**
>
> I dataset open data della PDND **non pubblicano** le coppie puntuali
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
di enti l'approvazione è automatica vs. manuale.

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

Documenta i 6 e-service del Catalogo SSU (Metadati, Back Office SUAP, Back Office
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

> **Questo progetto si basa esclusivamente su informazioni già pubbliche,
> rielaborate e messe in relazione. Nessun dato riservato o non pubblicato
> è stato utilizzato.**

## 3. Scelte di rappresentazione e aggregazioni

### 3.1 Aggregazione dei Comuni

Il catalogo PDND contiene **2.000+ e-service**, la stragrande maggioranza dei quali
sono servizi standard pubblicati individualmente da ciascun Comune italiano aderente
(~7.500 Comuni). I servizi più diffusi sono:

| Tipo di servizio comunale       | API stimate nel catalogo |
|---------------------------------|--------------------------|
| Albo Pretorio Online            | ~2.000                   |
| Pratiche SUAP (lista/dettaglio) | ~1.500                   |
| Numerazione Civica / Stradario  | ~800                     |
| Amministrazione Trasparente     | ~500                     |
| Servizi Demografici             | ~400                     |
| Tributi e Posizioni Debitorie   | ~300                     |
| WaaS (Welfare as a Service)     | ~300                     |
| Protocollo Informatico          | ~200                     |
| Dati Sensori IoT                | ~50                      |

Rappresentare ogni Comune come nodo singolo renderebbe il grafo illeggibile
(migliaia di nodi con servizi identici). Per questo motivo:

- **I Comuni con meno di ~100.000 abitanti** sono stati aggregati in un unico
  nodo chiamato **"Comuni (aggregati)"**, che rappresenta collettivamente i
  ~7.500 Comuni minori aderenti alla PDND.
- **6 grandi Comuni** (Milano, Roma, Napoli, Bologna, Genova, Padova) sono
  rappresentati come nodi individuali perché erogano anche servizi specifici
  non standard (es. Comune di Bologna → Ricerca Edifici, Ricerca Gare e Appalti).
- I **servizi comunali standard** (Albo Pretorio, SUAP, ecc.) sono rappresentati
  come e-service singoli erogati dal nodo aggregato, con l'indicazione del numero
  approssimativo di API effettive nel catalogo.

### 3.2 Selezione degli enti rappresentati

Il grafo include **31 enti**, selezionati con questi criteri:

- **Tutte le PA centrali** che erogano e-service documentati nel catalogo e nelle
  fonti ufficiali (Ministeri, INPS, INAIL, AgID, ANAC, ecc.)
- **6 grandi Comuni** come fruitori e micro-erogatori rappresentativi
- **5 Regioni e 1 Provincia Autonoma** come fruitori rappresentativi del livello
  territoriale intermedio, selezionate perché hanno documentazione pubblica
  di fruizione o perché erogano servizi propri (Regione Siciliana, FVG,
  Provincia Autonoma di Bolzano)
- **1 nodo aggregato** per i Comuni minori

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

### 3.4 Natura degli archi (connessioni)

Ogni arco nel grafo rappresenta una relazione **erogatore → fruitore** per un
dato e-service. Gli archi **non** rappresentano necessariamente un accordo di
interoperabilità attivo e verificato sulla piattaforma PDND, ma una relazione
di fruizione **documentata o inferita** dalle fonti elencate nella Sezione 2.

La distinzione grafica degli archi segue questa logica:
- **Spessore:** proporzionale al numero di e-service condivisi tra due enti
- **Freccia direzionale:** indica il verso erogatore → fruitore
- **Luminosità:** gli archi si evidenziano al passaggio del mouse o alla selezione di un nodo

### 3.5 Tipi di servizio (service-type) vs endpoint del catalogo

Una conseguenza diretta dell'aggregazione descritta in §3.1: ogni record
nell'array `eservices[]` di `pdnd-data.json` rappresenta un **tipo di
servizio**, non un singolo endpoint del catalogo PDND.

Lo stesso servizio standardizzato (es. *Albo Pretorio*) compare nel grafo come
un nodo solo, ma corrisponde a centinaia o migliaia di endpoint reali nel
catalogo, uno per ciascun ente che lo pubblica.

**Conseguenze numeriche:**

- I 62 e-service del modello **non sono direttamente confrontabili** con i 2.000+
  API pubblicati che il dashboard PDND riporta: il dashboard conta endpoint, il
  modello conta tipi di servizio.
- La mappatura indicativa per i 9 servizi standard del nodo aggregato è la
  tabella riportata in §3.1: ~6.050 endpoint complessivi per i soli servizi
  comunali. I restanti ~50 servizi del modello (centrali, regionali, di grandi
  Comuni) sono in larga parte rappresentati uno-a-uno con i corrispondenti
  endpoint del catalogo.

Il caveat è esplicitato anche nel frontend: nella vista **Statistiche** un
banner in cima ricorda che i numeri sono service-type, non endpoint; nel
pannello dettagli del nodo *Comuni (aggregati)* compare un avviso analogo.

## 4. Limitazioni note

1. **Le connessioni erogatore–fruitore non sono dati aperti strutturati.**
   Il dataset ufficiale PDND pubblica il numero aggregato di connessioni
   (~6.400+) ma non le coppie puntuali. Le relazioni nel grafo derivano da
   documentazione ufficiale, campo `attributes` del CSV, e inferenza ragionevole.

2. **I Comuni minori sono aggregati.** Questo significa che un arco tra
   "Comuni (aggregati)" e INPS non indica che tutti i 7.500 Comuni fruiscono
   del servizio, ma che il servizio è strutturalmente disponibile per la
   categoria "Comuni".

3. **Le Regioni rappresentate sono un campione.** Sono state incluse 5 Regioni
   e 1 Provincia Autonoma come rappresentative. Le altre Regioni aderenti
   alla PDND non sono escluse per mancanza di dati, ma per mantenere la
   leggibilità del grafo.

4. **Versioni e-service.** Le versioni indicate nel grafo sono quelle
   documentate nelle fonti al momento della compilazione e potrebbero non
   corrispondere all'ultima versione attiva nel catalogo.

5. **Servizi sospesi o in beta.** Il catalogo PDND contiene anche e-service
   con stato `SUSPENDED` o in fase beta. Nel grafo sono rappresentati solo
   i servizi con stato documentato come "Attivo", salvo dove esplicitamente
   indicato.

## 5. Come verificare e aggiornare i dati

### Verificare il catalogo attuale

```bash
npm run update-data
```

Scarica il CSV aggiornato da `github.com/italia/pdnd-opendata` e produce un
riepilogo del catalogo per erogatore e per tipologia.

### Auditare il modello

Tre script idempotenti, integrati nel `package.json`, supportano la verifica
ripetibile del modello a ogni modifica di `src/data/pdnd-data.json`:

```bash
npm run audit             # audit interno del JSON
npm run compare-catalog   # confronto contro il catalogo ufficiale
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
pronti per essere incollati nel sorgente del paper Zenodo.

La documentazione completa degli script è in [scripts/README.md](scripts/README.md).

### Fonti di aggiornamento

| Risorsa | URL | Frequenza |
|---------|-----|-----------|
| CSV catalogo e-service | [github.com/italia/pdnd-opendata](https://github.com/italia/pdnd-opendata) | Quotidiana |
| Catalogo API navigabile | [api.gov.it](https://api.gov.it/it/catalogo) | Continua |
| Numeri della PDND | [interop.pagopa.it/numeri](https://www.interop.pagopa.it/numeri) | Continua |
| Documentazione ANPR | [anagrafenazionale.interno.it](https://www.anagrafenazionale.interno.it/area-tecnica/accesso-ai-dati/) | Ad aggiornamento |

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
