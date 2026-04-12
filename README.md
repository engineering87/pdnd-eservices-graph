# PDND E-Services Graph

<p align="left">
  <a href="https://github.com/engineering87/pdnd-eservices-graph/stargazers">
    <img src="https://img.shields.io/github/stars/engineering87/pdnd-eservices-graph?style=flat-square" alt="GitHub stars" />
  </a>
  <a href="https://github.com/engineering87/pdnd-eservices-graph/issues">
    <img src="https://img.shields.io/github/issues/engineering87/pdnd-eservices-graph?style=flat-square" alt="GitHub issues" />
  </a>
  <a href="https://github.com/engineering87/pdnd-eservices-graph/network/members">
    <img src="https://img.shields.io/github/forks/engineering87/pdnd-eservices-graph?style=flat-square" alt="GitHub forks" />
  </a>
  <a href="https://github.com/engineering87/pdnd-eservices-graph/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/engineering87/pdnd-eservices-graph?style=flat-square" alt="License" />
  </a>
  <a href="https://github.com/sponsors/engineering87">
    <img src="https://img.shields.io/github/sponsors/engineering87?style=flat-square" alt="GitHub Sponsors" />
  </a>
  <a href="https://polite-plant-07967ad10.6.azurestaticapps.net/">
    <img src="https://img.shields.io/badge/demo-live-brightgreen?style=flat-square" alt="Live Demo" />
  </a>
</p>

Visualizzazione interattiva del grafo degli e-services sulla **Piattaforma Digitale Nazionale Dati (PDND)**.

I nodi rappresentano gli enti (PA centrali, Regioni, Comuni) e gli archi le relazioni erogatore→fruitore, con spessore proporzionale al numero di e-services condivisi.

**[🔗 Demo live](https://polite-plant-07967ad10.6.azurestaticapps.net/)**

---

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
│   └── update-data.mjs             # Utility per verificare il catalogo
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

## Deploy su Azure

### 1. Crea la Static Web App

```bash
az login

az staticwebapp create \
  --name pdnd-eservices-graph \
  --resource-group il-tuo-rg \
  --source https://github.com/engineering87/pdnd-eservices-graph \
  --location "westeurope" \
  --branch main \
  --app-location "/" \
  --output-location "dist" \
  --login-with-github
```

### 2. Configura il secret GitHub

Azure genera automaticamente un token di deploy. Se serve aggiungerlo manualmente:

1. Vai su **Azure Portal → Static Web App → Manage deployment token**
2. Copia il token
3. Vai su **GitHub → Settings → Secrets → Actions**
4. Crea il secret `AZURE_STATIC_WEB_APPS_API_TOKEN` con il valore copiato

### 3. Deploy automatico

Da questo momento, ogni `git push` su `main` trigghera il build e il deploy automatico. Le Pull Request creano ambienti di staging.

### 4. Dominio custom (opzionale)

```bash
az staticwebapp hostname set \
  --name pdnd-eservices-graph \
  --hostname pdnd-graph.tuodominio.it
```

HTTPS è automatico con Azure Static Web Apps.

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

AGPL-3.0 — vedi [LICENSE](LICENSE).

---

Dati e-services: [PDND Open Data](https://github.com/italia/pdnd-opendata) — Licenza CC-BY 4.0