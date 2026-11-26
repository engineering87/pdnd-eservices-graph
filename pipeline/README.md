# Pipeline di aggiornamento automatico

> **Quale dato è canonico.** Il grafo pubblicato su pdndgraph.it è
> `src/data/pdnd-data.json`: dal 25 novembre 2026 è il modello **v2** prodotto
> da questa pipeline, con provenienza dichiarata per singolo arco. Il report
> Zenodo (DOI 10.5281/zenodo.19989954) descrive invece il modello curato **v1**
> del 2 maggio 2026, conservato immutato in
> `src/data/snapshots/pdnd-data.2026-05-02.json`. Le relazioni del v1 non vanno
> perse: vivono in `connections-reconstructed.json` e confluiscono in ogni build.


Questa cartella contiene la pipeline che mantiene aggiornato il grafo rispetto
allo stato corrente del catalogo PDND. L'aggiornamento è automatico; solo la
promozione a grafo live richiede un passo manuale.

## Come funziona

```
catalogo ufficiale PDND (CSV, 15.000+ e-service)
 + classifiche di adozione e uso, aderenti, totali (pdnd-opendata)
              │
              ▼
   build-graph-data.mjs
   ├── filtra le entità tracciate (entities.json)
   ├── aggiunge le classi di enti (classi.json) con il numero di aderenti
   ├── estrae i loro e-service (nome, stato, versione), scegliendo per ente
   │     i curati e poi i più rilevanti (enti abilitati e sessioni)
   ├── deriva gli archi erogatore→fruitore, ciascuno con la sua origine:
   │     1. documentata   override curati (connections-overrides.json)
   │     2. osservata     connessioni e sessioni ufficiali per categoria
   │     3. certificata   attributes.certified (category-map.json, classi.json)
   │     4. ricostruita   relazioni v1 (connections-reconstructed.json)
   │     5. inferita      stime congelate, solo se l'e-service è senza archi
   ├── applica i guard di validazione
   ├── scrive pipeline/pdnd-data.preview.json  (ANTEPRIMA, non distruttiva)
   └── scrive pipeline/aderenti-index.preview.json  (indice di tutti gli aderenti,
         per la scheda «Il tuo ente»)
              │
              ▼
   GitHub Action mensile → pull request su develop con il report
```

> **Modalità non distruttiva.** La pipeline scrive solo sull'anteprima
> `pipeline/pdnd-data.preview.json` e non tocca il grafo live
> `src/data/pdnd-data.json`, che cambia soltanto quando promuovi l'anteprima
> (vedi sotto).

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
| `connections-reconstructed.json` | Relazioni del modello v1 (origine `ricostruita`): `anchored` per catalogId, sommate agli archi del catalogo; `unanchored` riportate così come sono. I servizi agganciati sono sempre inclusi, anche oltre `maxServices` |
| `classi.json` | Classi di enti (nodi aggregati) allineate alle categorie ufficiali PagoPA: attributi certificati, categorie delle statistiche, totali ufficiali degli aderenti, tipi di ente (`sottotipi`) per aprire la classe nella mappa |
| `connections-frozen.json` | Stime AI congelate (origine `inferita`), usate solo per gli e-service senza altri archi |
| `pdnd-data.preview.json` | Anteprima generata dalla pipeline (NON è il dato live) |
| `aderenti-index.preview.json` | Indice compatto degli aderenti con codice IPA (nome, codice IPA, classe, tipo di ente, nodo della mappa, e-service pubblicati) per la scheda «Il tuo ente». Imprese e altri privati senza codice IPA non sono elencati. Non viene scritto con `--out` |
| `last-run-report.md` | Report generato ad ogni esecuzione |

## Uso manuale

```bash
# Dry-run: scarica, calcola, stampa il report. NON scrive nulla.
node pipeline/build-graph-data.mjs

# Aggiorna l'ANTEPRIMA (pipeline/pdnd-data.preview.json). Il grafo live resta intatto.
node pipeline/build-graph-data.mjs --write
```

## Grafo a una data passata

La pipeline può lavorare su una versione passata dei dati aperti, per costruire le
istantanee del confronto fra date:

```bash
PDND_OPENDATA_REF=<commit di italia/pdnd-opendata> \
  node pipeline/build-graph-data.mjs --write --no-ai \
  --out src/data/snapshots/pdnd-data.2026-06-01.json --data 2026-06-01
```

`--out` scrive altrove senza toccare anteprima e report; `--data` è la data
dichiarata nel meta. Lo script `scripts/build-snapshots.mjs` trova da solo il
commit giusto per ogni data. Alla promozione, il grafo sostituito viene archiviato
in `src/data/snapshots/` con la sua data.

## Promuovere l'anteprima a dato live

Quando, dopo aver ispezionato `pdnd-data.preview.json` e il report, sei convinto
della qualità dell'aggiornamento, hai due modi per promuovere l'anteprima a grafo live.

**Dalla GitHub Action (consigliato).** Tab **Actions** → workflow
"Promuovi anteprima a grafo live" → **Run workflow** → scrivi `PROMUOVI` nel campo
di conferma. Il workflow valida l'anteprima, salva un backup del curato, sostituisce
il grafo live e l'indice degli aderenti, archivia il grafo sostituito fra le
istantanee, rigenera le esportazioni in `exports/` e le misure di rete nel tempo
(`src/data/network-history.json`) e apre una pull request su
`develop`. La conferma esplicita evita promozioni accidentali; il grafo arriva sul
sito con la release da `develop` a `main`.

**Da riga di comando.**

```bash
cp pipeline/pdnd-data.preview.json src/data/pdnd-data.json
cp pipeline/aderenti-index.preview.json src/data/aderenti-index.json
npm run export && npm test
```

In entrambi i casi è l'**unico** passo che modifica il grafo mostrato dall'app, ed è
sempre una tua decisione esplicita. Il backup del curato
(`src/data/pdnd-data.curated-backup.json`) ti permette di tornare indietro in
qualsiasi momento.


## Selezione degli e-service per ente

Per ogni entità tracciata la pipeline include:

1. **sempre** gli e-service con archi curati (override documentati, relazioni
   ricostruite v1, inferenze congelate), anche oltre `maxServices`;
2. poi, fino a `maxServices`, i pubblicati con **rilevanza** più alta: il maggiore
   fra enti abilitati (`e_service_con_piu_enti_abilitati_from_the_beginning.csv`) e
   sessioni di scambio (`eservice_con_piu_token_staccati_from_the_beginning.csv`),
   ciascuno rapportato al massimo dell'ente, da
   [pdnd-opendata](https://github.com/italia/pdnd-opendata) (CC0);
3. a parità di rilevanza, l'ordine alfabetico.

Le classifiche elencano i primi 10 e-service per ogni coppia di categorie
erogatore × fruitore e troncano i nomi a 60 caratteri: l'abbinamento al catalogo
avviene su nome dell'erogatore e nome troncato. Il campo `enti_abilitati_min` è il
massimo fra le classifiche in cui l'e-service compare, quindi un minimo garantito.
Se il download delle classifiche fallisce la pipeline prosegue in ordine alfabetico
e lo segnala nel report. Il report segnala anche gli e-service con archi curati
che non risultano più pubblicati, da ri-agganciare al successore attivo.

## Guard di validazione

Lo script si interrompe (exit 1) senza scrivere nulla se:

- il download del catalogo fallisce;
- il catalogo ha meno di **5.000** righe (fonte probabilmente corrotta);
- vengono generati **zero** e-service (problema di matching IPA);
- il numero di nodi cala di oltre il **30%** rispetto alla versione precedente.

Nel workflow GitHub, un guard fallito interrompe il job **prima** della pull
request: nessun ramo riceve dati rotti. Quando l'anteprima cambia, il workflow
apre (o aggiorna) una pull request su `develop` con il report di esecuzione nel
testo, da rivedere prima del merge.

## Manutenzione periodica

La pipeline è autonoma, ma ogni tanto conviene guardare il report
(`last-run-report.md`, anche nel riepilogo della GitHub Action):

1. **E-service senza archi** — servizi nuovi la cui categoria consumatori non è
   mappata. Per dare loro archi precisi, aggiungi una voce in
   `connections-overrides.json` usando l'UUID (`catalogId`) indicato nel report.

2. **Candidati nuovi erogatori** — enti con molte API non ancora tracciati
   (per esempio enti nazionali o Regioni non ancora rappresentati). Per includerli, aggiungi una voce in `entities.json`
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

Le stime AI sono **congelate** in `connections-frozen.json`: prodotte una volta,
fissate nel dato versionato e applicate solo agli e-service rimasti senza altri
archi. Così il grafo è deterministico e ogni build è riproducibile senza chiamate
AI. Ogni arco inferito è taggato `origine: "inferita"` e nel grafo è disegnato
**tratteggiato**.

L'inferenza a runtime gira solo sui `catalogId` elencati in
`inference-allowlist.json`; con l'allowlist vuota (lo stato attuale) non parte
nessuna chiamata, anche se la chiave API è configurata.

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

Ogni arco dichiara la propria provenienza, in ordine di forza della prova:
`documentata` (override da fonti ufficiali), `osservata` (connessioni e
sessioni realmente registrate dalla PDND verso una classe di enti),
`certificata` (classi abilitate dal campo `attributes.certified`),
`ricostruita` (relazioni del modello v1) e `inferita` (stime AI congelate).
Tutto resta basato esclusivamente su informazioni già pubbliche. Regole di
mappatura, verifiche e limiti sono in
[METODOLOGIA.md §7](../METODOLOGIA.md#7-modello-v2-novembre-2026).
