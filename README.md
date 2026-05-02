# PDND E-Services Graph

[![Stars](https://img.shields.io/github/stars/engineering87/pdnd-eservices-graph?style=social)](https://github.com/engineering87/pdnd-eservices-graph)
[![Issues](https://img.shields.io/github/issues/engineering87/pdnd-eservices-graph)](https://github.com/engineering87/pdnd-eservices-graph/issues)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
![Last commit](https://img.shields.io/github/last-commit/engineering87/pdnd-eservices-graph)
[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://polite-plant-07967ad10.6.azurestaticapps.net/)
![PDND](https://img.shields.io/badge/PDND-Interoperability-blue)
[![Sponsor me](https://img.shields.io/badge/Sponsor-❤-pink)](https://github.com/sponsors/engineering87)

Visualizzazione interattiva del grafo degli e-services sulla **Piattaforma Digitale Nazionale Dati (PDND)**.

I nodi rappresentano gli enti (PA centrali, Regioni, Comuni) e gli archi le relazioni erogatore→fruitore, con spessore proporzionale al numero di e-services condivisi.

Una versione pubblica dell'applicazione è accessibile all'indirizzo **[PDND Graph](https://www.pdndgraph.it)** e non richiede installazione né autenticazione.

<p align="center">
  <img src="./docs/demo.gif" alt="PDND E-Services Graph Demo" width="720" />
</p>

## Indice

| Sezione | Vai a |
|---|---|
| Perché questo progetto | [Perché questo progetto](#perché-questo-progetto) |
| Perché un grafo | [Perché un grafo](#perché-un-grafo) |
| Funzionalità | [Funzionalità](#funzionalità) |
| Fonti dati e trasparenza metodologica | [Fonti dati e trasparenza metodologica](#fonti-dati-e-trasparenza-metodologica) |
| Quick Start | [Quick Start](#quick-start) |
| Struttura del progetto | [Struttura del progetto](#struttura-del-progetto) |
| Come aggiornare i dati | [Come aggiornare i dati](#come-aggiornare-i-dati) |
| Tecnologie | [Tecnologie](#tecnologie) |
| Contribuire | [Contribuire](#contribuire) |
| Licenza | [Licenza](#licenza) |

## Perché questo progetto

La PDND è il pilastro dell'interoperabilità tra le Pubbliche Amministrazioni italiane: consente lo scambio sicuro e standardizzato di dati tramite API, realizzando concretamente il principio *once-only*, la PA non chiede a cittadini e imprese dati che già possiede.

Con oltre **2.000 API** pubblicate e **7.500 enti** aderenti, l'ecosistema PDND è vasto e in rapida crescita. Tuttavia, la sua complessità rende difficile avere una visione d'insieme: chi eroga quali servizi? Chi li fruisce? Quanto è interconnessa la rete dell'interoperabilità italiana?

Questo progetto nasce per rendere **visibile e navigabile** quella rete. L'obiettivo è offrire una mappa interattiva che permetta a chiunque, funzionari pubblici, sviluppatori, ricercatori, cittadini, di esplorare le connessioni tra gli enti e comprendere come i dati fluiscono attraverso la Pubblica Amministrazione.

Nei fatti, i dataset open data della PDND pubblicano il **catalogo degli e-service** e il **numero aggregato** delle connessioni, ma non le **coppie puntuali** erogatore–fruitore. Le relazioni rappresentate in questo grafo sono state ricostruite da documentazione ufficiale pubblica (circolari, manuali operativi, presentazioni istituzionali). Questo progetto vuole anche essere uno stimolo affinché quei dati diventino un giorno completamente aperti.

## Perché un grafo

L'interoperabilità tra enti pubblici è, nella sua essenza, un problema di rete:
soggetti che producono dati e soggetti che li consumano, collegati da accordi e
interfacce digitali. La teoria dei grafi offre il modello formale più naturale
per rappresentare e analizzare questo tipo di struttura.

### Il modello

Formalmente, l'ecosistema PDND può essere modellato come un **grafo diretto
pesato** $G = (V, E, w)$ dove:

- $V$ è l'insieme dei nodi (gli enti aderenti)
- $E \subseteq V \times V$ è l'insieme degli archi diretti (le relazioni di fruizione)
- $w: E \to \mathbb{N}$ è la funzione peso che associa a ogni arco il numero di
  e-services condivisi tra i due enti

Un arco $(A, B) \in E$ indica che l'ente $A$ eroga almeno un e-service fruito
dall'ente $B$. Il grafo è **diretto** perché la relazione non è simmetrica: il
fatto che INPS eroghi un servizio verso i Comuni non implica che i Comuni eroghino
servizi verso INPS.

### Proprietà osservabili

La rappresentazione a grafo rende immediatamente visibili proprietà dell'ecosistema
che sarebbero difficili da cogliere da un elenco tabulare:

- **Grado di un nodo** (*degree*). Per ogni nodo $v$, il grafo diretto distingue
  tra il grado in uscita $d_{out}(v)$ (numero di enti verso cui $v$ eroga servizi)
  e il grado in ingresso $d_{in}(v)$ (numero di enti da cui $v$ fruisce servizi).
  Un ente come il Ministero dell'Interno (ANPR) ha un $d_{out}$ elevato e un
  $d_{in}$ basso, tipico di un **hub erogatore**. I Comuni presentano il pattern
  opposto.

- **Centralità** (*centrality*). La centralità di grado
  $C_D(v) = \frac{d_{in}(v) + d_{out}(v)}{|V| - 1}$
  quantifica quanto un ente è interconnesso rispetto al resto della rete.
  Nodi con alta centralità rappresentano gli snodi critici dell'interoperabilità:
  un'interruzione dei loro servizi avrebbe impatto su molti altri enti.

- **Densità del grafo**. Definita come
  $\rho = \frac{|E|}{|V| \cdot (|V| - 1)}$
  misura quanto la rete è interconnessa rispetto al massimo teorico. Una densità
  bassa indica che l'interoperabilità è ancora concentrata su pochi enti erogatori
  centrali, mentre una densità crescente nel tempo segnalerebbe una rete sempre
  più distribuita.

- **Componenti e cluster**. Il grafo evidenzia raggruppamenti tematici naturali, 
  gli enti del welfare (INPS, Comuni, MLPS), del fisco (AdE, MEF, Sogei), della
  trasparenza (ANAC, AgID), che corrispondono ai domini funzionali della PA.
  In termini di teoria dei grafi, questi cluster possono essere analizzati tramite
  il coefficiente di clustering o algoritmi di community detection.

### Layout force-directed

La visualizzazione adotta un layout **force-directed** (*Fruchterman-Reingold*),
un algoritmo che modella il grafo come un sistema fisico:

- ogni arco si comporta come una **molla** che attrae i nodi collegati
- ogni coppia di nodi esercita una **forza repulsiva** (come cariche elettriche)
- una **forza gravitazionale** debole tiene il grafo centrato

Il sistema converge iterativamente verso un equilibrio in cui i nodi collegati
sono vicini e i nodi non collegati sono distanti, facendo emergere visivamente la
struttura topologica della rete senza richiedere un posizionamento manuale.
Questa proprietà è particolarmente utile per l'ecosistema PDND, dove la struttura
a stella (pochi erogatori centrali, molti fruitori periferici) si manifesta
spontaneamente nel layout.

## Funzionalità

- **Grafo force-directed** interattivo con simulazione fisica
- **31 enti** e **57 e-services** reali dal catalogo ufficiale PDND
- **Drag & drop** dei nodi, **zoom** con scroll, **pan** con trascinamento
- **Pannello dettagli** con elenco e-services erogati e fruiti per ogni ente
- **Filtro per categoria** (cliccabile dalla legenda) e **ricerca testuale**
- **Frecce direzionali** erogatore → fruitore
- **Badge numerici** con conteggio connessioni
- **Colori per categoria**: Ministero, Previdenza, Fisco, Digitale, ecc.
- **Servizi comunali aggregati** (~7.500 Comuni rappresentati come nodo unico)

## Fonti dati e trasparenza metodologica

> **⚠️ Nota sulle connessioni:** gli **enti (nodi)** e gli **e-services** provengono
> dai dataset open data ufficiali della PDND. Le **relazioni erogatore→fruitore (archi)**
> sono state ricostruite da documentazione ufficiale pubblica (circolari, manuali
> operativi, presentazioni istituzionali) e dal campo `attributes` del catalogo,
> perché il dato puntuale delle connessioni attive non è al momento pubblicato
> come dato aperto strutturato. Per tutti i dettagli, vedi **[METODOLOGIA.md](METODOLOGIA.md)**.

> **⚠️ Nota sull'aggregazione dei Comuni:** il catalogo PDND contiene 2.000+ API,
> la maggior parte delle quali sono servizi standard replicati da ciascuno dei ~7.500
> Comuni aderenti (Albo Pretorio, SUAP, Civici, ecc.). Per rendere il grafo leggibile,
> i Comuni minori sono rappresentati come un **unico nodo aggregato**, mentre 6 grandi
> Comuni sono mantenuti come nodi individuali. Vedi [METODOLOGIA.md §3.1](METODOLOGIA.md#31-aggregazione-dei-comuni).

| Dato | Fonte ufficiale | Tipo |
|------|-----------------|------|
| Enti (nodi) | [aderenti.csv](https://github.com/italia/pdnd-opendata) — dati.gov.it | ✅ Dato aperto ufficiale |
| E-services | [eservice_a_catalogo.csv](https://github.com/italia/pdnd-opendata) — dati.gov.it | ✅ Dato aperto ufficiale |
| Connessioni (archi) | Circolari, manuali, campo `attributes` CSV | ⚠️ Ricostruzione documentata |

📄 **Documentazione completa:** [METODOLOGIA.md](METODOLOGIA.md)

## Quick Start

```bash
# Clona il repository
git clone https://github.com/engineering87/pdnd-eservices-graph.git
cd pdnd-eservices-graph

# Installa le dipendenze
npm install

# Avvia in sviluppo
npm run dev
```

L'app sarà disponibile su `http://localhost:3000`.

## Struttura del progetto

```
pdnd-eservices-graph/
├── .github/workflows/
│   └── azure-static-web-apps.yml   # CI/CD per Azure
├── public/
│   └── favicon.svg
├── scripts/
│   ├── update-data.mjs             # Riepilogo del catalogo PDND
│   ├── audit-model.mjs             # Audit interno del modello
│   ├── compare-catalog.mjs         # Confronto modello vs catalogo
│   ├── compute-paper-metrics.mjs   # Snippet per il paper Zenodo
│   └── README.md                   # Documentazione degli script
├── src/
│   ├── components/
│   │   └── PDNDGraph.jsx            # Componente principale del grafo
│   ├── data/
│   │   └── pdnd-data.json           # ← DATI: modifica questo file
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── index.html
├── package.json
├── staticwebapp.config.json         # Config Azure Static Web Apps
├── vite.config.js
├── METODOLOGIA.md                   # ← Fonti, metodologia, limitazioni
└── README.md
```

## Come aggiornare i dati

### Aggiungere un nuovo ente

Apri `src/data/pdnd-data.json` e aggiungi un oggetto all'array `enti`:

```json
{
  "id": "nuovo_ente",
  "name": "Nome Visibile",
  "tipo": "Erogatore | Fruitore | Erogatore/Fruitore",
  "categoria": "Ministero",
  "descrizione": "Descrizione estesa dell'ente"
}
```

Se la categoria è nuova, aggiungi il colore in `CATEGORY_COLORS` dentro `src/components/PDNDGraph.jsx`.

### Aggiungere un nuovo e-service

Aggiungi un oggetto all'array `eservices`:

```json
{
  "id": "es_nuovo",
  "nome": "Nome del Servizio",
  "erogatore": "id_ente_erogatore",
  "fruitori": ["id_fruitore_1", "id_fruitore_2"],
  "versione": "1.0",
  "stato": "Attivo",
  "descrizione": "Cosa fa questo e-service"
}
```

### Verificare il catalogo ufficiale

Lo script `update-data` scarica il CSV grezzo dal repository ufficiale e mostra statistiche utili per scoprire nuovi erogatori o servizi da aggiungere:

```bash
npm run update-data
```

Output di esempio:

```
═══════════════════════════════════════════════════
  RIEPILOGO CATALOGO PDND
═══════════════════════════════════════════════════

  Totale API:       2.147
  Pubblicate:       2.003
  Enti erogatori:   1.842

  TOP 30 EROGATORI (per API pubblicate)
  ───────────────────────────────────────
   1. Comune di Bologna                   23 API
   2. Comune di Genova                    18 API
   ...
```

### Auditare il modello e generare metriche

Tre script complementari sono disponibili per verificare in modo ripetibile la coerenza del modello e per generare i numeri esatti dei deliverable scientifici:

```bash
npm run audit             # audit interno del JSON: conteggi, gradi, consistency checks
npm run compare-catalog   # confronto con il catalogo ufficiale, copertura, gap
npm run paper-metrics     # snippet pgfplots/LaTeX per il paper Zenodo
```

`npm run audit` segnala incoerenze (es. nodo dichiarato `Erogatore` ma senza e-service erogati). `npm run compare-catalog` calcola la copertura percentuale del modello rispetto al catalogo PDND vivo. Per dettagli vedi [scripts/README.md](scripts/README.md).

## Tecnologie

- **React 18** — UI
- **Vite 6** — Build tool
- **Canvas 2D** — Rendering del grafo (nessuna dipendenza esterna)
- **Azure Static Web Apps** — Hosting
- **GitHub Actions** — CI/CD

## Contribuire

Le Pull Request sono benvenute. Per contribuire:

1. Fai un fork del repository
2. Crea un branch (`git checkout -b feature/nuovo-ente`)
3. Modifica `src/data/pdnd-data.json` o il componente
4. Committa e pusha (`git push origin feature/nuovo-ente`)
5. Apri una Pull Request

## Licenza

Questo progetto è distribuito sotto licenza **AGPL-3.0** — vedi [LICENSE](LICENSE).

### Cosa significa in pratica

- Puoi **usare, modificare e distribuire** liberamente il codice
- Se **modifichi il codice e lo distribuisci**, devi rendere disponibili le modifiche sotto la stessa licenza
- Se **usi questo software come servizio (es. web app accessibile da utenti)**, sei tenuto a rendere disponibile il codice sorgente modificato agli utenti del servizio

### Nota importante per l'uso in produzione

Se utilizzi questo progetto (o una sua derivazione) per erogare un servizio accessibile via rete, la licenza AGPL richiede che:

- gli utenti possano accedere al codice sorgente della versione in esecuzione
- eventuali modifiche apportate siano pubblicate

### Dati

I dati sugli e-services provengono da [PDND Open Data](https://github.com/italia/pdnd-opendata) e sono distribuiti sotto licenza **CC0 1.0 Universal** (Pubblico Dominio) dalla Presidenza del Consiglio dei Ministri – Dipartimento per la Trasformazione Digitale.
