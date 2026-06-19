# Pipeline di aggiornamento automatico

Questa cartella contiene la pipeline che mantiene aggiornato il grafo rispetto
allo stato corrente del catalogo PDND, in modo automatico e senza intervento manuale.

## Come funziona

```
catalogo ufficiale PDND (CSV, 15.000+ e-service)
              │
              ▼
   build-graph-data.mjs
   ├── filtra le entità tracciate (entities.json)
   ├── estrae i loro e-service (nome, stato, versione)
   ├── deriva gli archi erogatore→fruitore:
   │     1. override curati (connections-overrides.json)  ← precedenza
   │     2. baseline da attributes.certified (category-map.json)
   ├── applica i guard di validazione
   └── scrive pipeline/pdnd-data.preview.json  (ANTEPRIMA, non distruttiva)
              │
              ▼
   GitHub Action mensile → commit dell'anteprima su main
```

> **Modalità non distruttiva (importante).** La pipeline **non** sovrascrive il
> grafo curato `src/data/pdnd-data.json`. Scrive sempre sull'anteprima
> `pipeline/pdnd-data.preview.json`. Il grafo live mostrato dall'app resta quello
> curato finché non sei tu a promuovere l'anteprima (vedi sotto). Così l'automazione
> gira senza mai rompere le relazioni documentate esistenti.

Il grafo è una **selezione editoriale** di entità significative, non l'intero
catalogo (che ha oltre 15.000 e-service, in gran parte servizi comunali replicati).
La pipeline aggiorna automaticamente lo **stato** degli e-service delle entità
tracciate: nuovi servizi, servizi rimossi, cambi di versione, passaggi
Attivo↔Sospeso.

## File

| File | Ruolo |
|------|-------|
| `build-graph-data.mjs` | Script principale di build |
| `entities.json` | Registro delle entità tracciate (nodi individuali) con i loro codici IPA |
| `category-map.json` | Mappa categorie consumatori (`attributes.certified`) → nodi, per la baseline degli archi |
| `connections-overrides.json` | Connessioni curate da documentazione, con precedenza sulla baseline |
| `pdnd-data.preview.json` | Anteprima generata dalla pipeline (NON è il dato live) |
| `last-run-report.md` | Report generato ad ogni esecuzione |

## Uso manuale

```bash
# Dry-run: scarica, calcola, stampa il report. NON scrive nulla.
node pipeline/build-graph-data.mjs

# Aggiorna l'ANTEPRIMA (pipeline/pdnd-data.preview.json). Il grafo live resta intatto.
node pipeline/build-graph-data.mjs --write
```

## Promuovere l'anteprima a dato live

Quando, dopo aver ispezionato `pdnd-data.preview.json` e il report, sei convinto
della qualità dell'aggiornamento, hai due modi per promuovere l'anteprima a grafo live.

**Dalla GitHub Action (consigliato).** Tab **Actions** → workflow
"Promuovi anteprima a grafo live" → **Run workflow** → scrivi `PROMUOVI` nel campo
di conferma. Il workflow valida l'anteprima, salva un backup del curato, sostituisce
il grafo live e committa. La conferma esplicita evita promozioni accidentali.

**Da riga di comando.**

```bash
cp pipeline/pdnd-data.preview.json src/data/pdnd-data.json
```

In entrambi i casi è l'**unico** passo che modifica il grafo mostrato dall'app, ed è
sempre una tua decisione esplicita. Il backup del curato
(`src/data/pdnd-data.curated-backup.json`) ti permette di tornare indietro in
qualsiasi momento.


## Guard di validazione

Lo script si interrompe (exit 1) senza scrivere nulla se:

- il download del catalogo fallisce;
- il catalogo ha meno di **5.000** righe (fonte probabilmente corrotta);
- vengono generati **zero** e-service (problema di matching IPA);
- il numero di nodi cala di oltre il **30%** rispetto alla versione precedente.

Nel workflow GitHub, un guard fallito interrompe il job **prima** del commit:
`main` non viene mai aggiornato con dati rotti.

## Manutenzione periodica

La pipeline è autonoma, ma ogni tanto conviene guardare il report
(`last-run-report.md`, anche nel riepilogo della GitHub Action):

1. **E-service senza archi** — servizi nuovi la cui categoria consumatori non è
   mappata. Per dare loro archi precisi, aggiungi una voce in
   `connections-overrides.json` usando l'UUID (`catalogId`) indicato nel report.

2. **Candidati nuovi erogatori** — enti con molte API non ancora tracciati
   (es. ANAC, altre Regioni). Per includerli, aggiungi una voce in `entities.json`
   con il loro codice IPA.

## Aggiungere un'entità tracciata

In `entities.json`, array `entities`:

```json
{
  "id": "anac",
  "ipaCodes": ["cvtiap"],
  "name": "ANAC",
  "categoria": "Anticorruzione",
  "descrizione": "Autorità Nazionale Anticorruzione",
  "produces": true,
  "maxServices": 4
}
```

Se la `categoria` è nuova, aggiungi il colore corrispondente in
`src/constants/colors.js`.

## Aggiungere connessioni curate

In `connections-overrides.json`, oggetto `overrides`, chiave = UUID dell'e-service
(`catalogId`, visibile nel report), valore = lista di id-nodo fruitori:

```json
{
  "overrides": {
    "579dcb3b-...": ["comuni_agg", "r_lombardia", "inps"]
  }
}
```

## Inferenza AI degli archi mancanti

Per gli e-service privi di categoria certificata e di override documentato, la
pipeline può **inferire** i fruitori tramite AI, così da ottenere copertura
completa. Ogni arco inferito è taggato `origine: "inferita"`, porta confidenza e
motivazione, e va reso **tratteggiato** nel grafo (vedi
`COMPONENTE-modifiche-provenienza.md`).

Caratteristiche pensate per l'affidabilità in pipeline automatica:

- **Vocabolario controllato** — il modello sceglie i fruitori solo tra i nodi
  esistenti, non può inventare entità.
- **Soglia di confidenza** — gli archi sotto `INFERENCE_MIN_CONF` vengono scartati.
- **Cache per `catalogId`** (`pipeline/ai-cache.json`) — un e-service già inferito
  non viene re-inferito: il grafo è stabile e l'AI gira solo sui servizi nuovi.
- **Fail-safe** — se la chiave manca o l'API è giù, la pipeline prosegue con gli
  archi certificati/documentati senza interrompersi.
- **Determinismo** — temperatura 0.

### Motore di inferenza

Due backend, selezionati da `INFERENCE_ENGINE`:

| Engine | Autenticazione |
|--------|----------------|
| `anthropic` (usato dal workflow) | `ANTHROPIC_API_KEY` come secret |
| `github` | `GITHUB_TOKEN` integrato nelle Actions + permesso `models: read` |

| Variabile | Valore |
|-----------|--------|
| `INFERENCE_ENGINE` | `anthropic` · `github` |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | per engine `anthropic` |
| `GITHUB_MODEL` | per engine `github`, default `openai/gpt-4.1` |
| `INFERENCE_MIN_CONF` | soglia confidenza, default `0.55` |
| `INFERENCE_MAX_CALLS` | tetto chiamate per run |
| `INFERENCE_DELAY_MS` | pausa tra chiamate (ms) |
| `INFERENCE_MAX_RETRIES` | retry su 429/503 con backoff |

Il workflow usa l'engine `anthropic` con il modello indicato in `ANTHROPIC_MODEL`,
leggendo la chiave dal secret `ANTHROPIC_API_KEY`. La cache (`pipeline/ai-cache.json`)
evita di re-inferire gli e-service già elaborati, così ogni run elabora solo i
servizi nuovi. In alternativa è disponibile l'engine `github` (GitHub Models, via
`GITHUB_TOKEN` con permesso `models: read`).

### Disattivare l'AI

```bash
node pipeline/build-graph-data.mjs --no-ai     # solo archi certificati/documentati
```

## Nota metodologica

Con questa pipeline la **baseline** degli archi è derivata automaticamente dal
campo `attributes.certified` del catalogo (la categoria di enti autorizzati alla
fruizione), mentre gli **override** documentati la raffinano. Tutto resta basato
esclusivamente su informazioni già pubbliche. Aggiorna `METODOLOGIA.md` per
riflettere questo approccio (vedi nota in fondo al file).
