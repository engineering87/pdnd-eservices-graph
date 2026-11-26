#!/usr/bin/env node
/**
 * build-graph-data.mjs
 * ────────────────────
 * Pipeline di aggiornamento automatico del grafo PDND.
 *
 * Scarica il catalogo ufficiale degli e-service, estrae gli e-service
 * delle entità tracciate (pipeline/entities.json), deriva gli archi
 * erogatore->fruitore dal campo attributes.certified (baseline) e dagli
 * override curati (pipeline/connections-overrides.json), applica i guard
 * di validazione e rigenera src/data/pdnd-data.json.
 *
 * Uso:
 *   node pipeline/build-graph-data.mjs            # dry-run: non scrive, stampa il report
 *   node pipeline/build-graph-data.mjs --write    # scrive src/data/pdnd-data.json
 *
 * Fonte: https://github.com/italia/pdnd-opendata (CC0 1.0)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { inferConnections } from "./infer-connections.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const LIVE_PATH = join(ROOT, "src", "data", "pdnd-data.json");        // grafo curato (mai sovrascritto)
const PREVIEW_PATH = join(__dirname, "pdnd-data.preview.json");       // output non distruttivo
const argValue = (nome) => { const i = process.argv.indexOf(nome); return i > 0 ? process.argv[i + 1] : null; };
// --out <file>: scrive altrove (per esempio un'istantanea storica) senza toccare
// anteprima e report. --data <AAAA-MM-GG>: data dichiarata nel meta.
const OUT_ARG = argValue("--out");
const OUTPUT_PATH = OUT_ARG ? join(process.cwd(), OUT_ARG) : PREVIEW_PATH;
const REPORT_PATH = OUT_ARG ? null : join(__dirname, "last-run-report.md");
const DATA_DATI = argValue("--data");
// Versione dei dati aperti: un commit di italia/pdnd-opendata (variabile
// PDND_OPENDATA_REF) per ricostruire il grafo com'era a una data passata, con le
// regole di oggi. Predefinito: lo stato corrente.
const OPENDATA_REF = process.env.PDND_OPENDATA_REF || "main";
const OPENDATA = `https://raw.githubusercontent.com/italia/pdnd-opendata/${OPENDATA_REF}/data`;
const AI_CACHE_PATH = join(__dirname, "ai-cache.json");

const CSV_URL = `${OPENDATA}/eservice_a_catalogo.csv`;
// Classifiche ufficiali degli e-service per numero di enti fruitori abilitati, per
// coppia di categorie erogatore × fruitore (primi 10 per coppia). Servono a scegliere
// gli e-service più adottati invece dei primi in ordine alfabetico.
const USAGE_URL = `${OPENDATA}/e_service_con_piu_enti_abilitati_from_the_beginning.csv`;
// Classifiche ufficiali per numero di sessioni di scambio (token), con id del catalogo.
const TOKENS_URL = `${OPENDATA}/eservice_con_piu_token_staccati_from_the_beginning.csv`;
// Elenco degli aderenti con i loro attributi certificati, e totali ufficiali per categoria.
const ADERENTI_URL = `${OPENDATA}/aderenti.csv`;
const TOTALI_URL = `${OPENDATA}/totale_enti.csv`;
// Le stesse classifiche di sessioni sugli ultimi 12 e 6 mesi, per l'andamento recente.
const TOKENS_12M_URL = `${OPENDATA}/eservice_con_piu_token_staccati_last_twelve_months.csv`;
const TOKENS_6M_URL = `${OPENDATA}/eservice_con_piu_token_staccati_last_six_months.csv`;
// Andamenti della piattaforma: serie mensili e totali con variazione sul mese.
const ADESIONI_URL = `${OPENDATA}/andamento_delle_adesioni.csv`;            // enti aderenti, cumulati
const ATTIVITA_URL = `${OPENDATA}/attivita_della_piattaforma_from_the_beginning.csv`; // sessioni al mese
const RICHIESTE_URL = `${OPENDATA}/totale_richieste_di_accesso.csv`;       // sessioni totali
const CONNESSIONI_URL = `${OPENDATA}/connessioni_totali.csv`;
const PUBBLICATI_URL = `${OPENDATA}/eservice_pubblicati.csv`;
// Le classifiche troncano il nome dell'e-service a 60 caratteri.
const USAGE_NAME_LEN = 60;
const usageKey = (producer, name) => `${producer.trim()}|${name.slice(0, USAGE_NAME_LEN).trim()}`;

// ── Guard thresholds ──────────────────────────────────────────
const MIN_CATALOG_RECORDS = 5000;   // se il catalogo ha meno righe, qualcosa non va
const MAX_NODE_DROP_RATIO = 0.30;   // abortisci se i nodi calano oltre il 30%
const WRITE = process.argv.includes("--write");
const USE_AI = !process.argv.includes("--no-ai");   // AI attiva di default; --no-ai per dry-run rapidi

// ── Robust CSV parser (gestisce virgolette, virgole e newline nei campi) ──
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { field += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ",") { row.push(field); field = ""; }
      else if (ch === "\r") { /* skip */ }
      else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else { field += ch; }
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

function csvToObjects(text) {
  const rows = parseCSV(text).filter(r => r.length > 1);
  const header = rows[0];
  return rows.slice(1).map(r => {
    const o = {};
    header.forEach((h, i) => { o[h] = r[i] ?? ""; });
    return o;
  });
}

// ── Helpers ───────────────────────────────────────────────────
function loadJSON(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function shortId(entityId, uuid) {
  return `${entityId}_${uuid.slice(0, 8)}`;
}

function truncate(s, n) {
  if (!s) return "";
  s = s.replace(/\s+/g, " ").trim();
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function certifiedCategories(attributesRaw) {
  try {
    const a = JSON.parse(attributesRaw || "{}");
    const out = [];
    for (const c of a.certified || []) {
      if (c?.single?.name) out.push(c.single.name);
      else if (Array.isArray(c?.group)) for (const m of c.group) if (m?.name) out.push(m.name);
    }
    return out;
  } catch {
    return [];
  }
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  const log = [];
  const say = (s) => { console.log(s); log.push(s); };

  say(`# Report aggiornamento grafo PDND`);
  say(`\nData: ${new Date().toISOString()}`);
  say(`Modalità: ${WRITE ? "WRITE" : "DRY-RUN"}\n`);

  // 1. Fetch catalog
  say("## Download catalogo");
  let csvText;
  try {
    const res = await fetch(CSV_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    csvText = await res.text();
  } catch (e) {
    say(`\n❌ ABORT: download fallito (${e.message}). Nessuna modifica applicata.`);
    flush(log);
    process.exit(1);
  }

  const records = csvToObjects(csvText);
  say(`- Righe catalogo: **${records.length}**`);

  // GUARD 1: catalog size
  if (records.length < MIN_CATALOG_RECORDS) {
    say(`\n❌ ABORT: il catalogo ha solo ${records.length} righe (< ${MIN_CATALOG_RECORDS}). Possibile fonte corrotta. Nessuna modifica applicata.`);
    flush(log);
    process.exit(1);
  }

  // 1b. Statistiche ufficiali di utilizzo (facoltative: se un download fallisce, la
  // pipeline prosegue senza quel dato e lo segnala).
  const fetchCSV = async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return parseCSV(await res.text()).slice(1);
  };
  // Adozione: per e-service, il massimo di enti abilitati fra le classifiche in cui
  // compare (minimo garantito, non il totale) e, per categoria di fruitore, le
  // connessioni osservate. Le classifiche elencano i primi 10 per coppia di categorie.
  const adoption = new Map();
  const observed = new Map(); // usageKey -> Map(categoria fruitore -> enti abilitati)
  try {
    for (const r of (await fetchCSV(USAGE_URL)).filter(r => r.length === 7 && r[4])) {
      const k = usageKey(r[5], r[4]);
      const n = Math.round(Number(r[6]) || 0);
      adoption.set(k, Math.max(adoption.get(k) || 0, n));
      if (r[3] && r[3] !== "Tutte") {
        const m = observed.get(k) || new Map();
        m.set(r[3], Math.max(m.get(r[3]) || 0, n));
        observed.set(k, m);
      }
    }
    say(`- Adozione: ${adoption.size} e-service nelle classifiche di enti abilitati`);
  } catch (e) {
    say(`- ⚠️ Classifiche di adozione non disponibili (${e.message}): niente archi osservati`);
  }
  // Sessioni di scambio: il dataset riporta l'id del catalogo, abbinamento esatto.
  const sessions = new Map();
  const observedSessions = new Map(); // catalogId -> Map(categoria fruitore -> sessioni)
  try {
    for (const r of (await fetchCSV(TOKENS_URL)).filter(r => r.length === 8 && r[4])) {
      const n = Math.round(Number(r[7]) || 0);
      sessions.set(r[4], Math.max(sessions.get(r[4]) || 0, n));
      if (r[3] && r[3] !== "Tutte" && r[3] !== "Totale" && n > 0) {
        const m = observedSessions.get(r[4]) || new Map();
        m.set(r[3], Math.max(m.get(r[3]) || 0, n));
        observedSessions.set(r[4], m);
      }
    }
    say(`- Sessioni: ${sessions.size} e-service nelle classifiche di sessioni di scambio`);
  } catch (e) {
    say(`- ⚠️ Classifiche di sessioni non disponibili (${e.message})`);
  }
  // Andamento recente per e-service: classifiche delle sessioni negli ultimi 12 e
  // 6 mesi, per categoria di ente fruitore. Il confronto "ultimi 6 mesi contro i
  // 6 precedenti" usa solo le categorie presenti in entrambe le finestre: una
  // categoria uscita dalla top 10 non deve sembrare un calo.
  const recenti = new Map(); // catalogId -> { s12: Map(cat->n), s6: Map(cat->n) }
  try {
    for (const [chiave, url] of [["s12", TOKENS_12M_URL], ["s6", TOKENS_6M_URL]]) {
      for (const r of (await fetchCSV(url)).filter(r => r.length === 8 && r[4] && r[3])) {
        const n = Math.round(Number(r[7]) || 0);
        if (!(n > 0) || r[3] === "Tutte" || r[3] === "Totale") continue;
        const x = recenti.get(r[4]) || { s12: new Map(), s6: new Map() };
        x[chiave].set(r[3], Math.max(x[chiave].get(r[3]) || 0, n));
        recenti.set(r[4], x);
      }
    }
    say(`- Sessioni recenti: ${recenti.size} e-service nelle classifiche degli ultimi 12 o 6 mesi`);
  } catch (e) {
    say(`- ⚠️ Classifiche recenti non disponibili (${e.message}): niente andamento per servizio`);
  }
  const SOGLIA_TENDENZA = 100000; // sessioni nei 6 mesi precedenti sotto cui la variazione è rumore
  const andamentoOf = (catalogId) => {
    const x = recenti.get(catalogId);
    if (!x) return {};
    const somma = (m) => [...m.values()].reduce((a, b) => a + b, 0);
    const out = {};
    // I 12 mesi contengono i 6: una categoria entrata nella top 10 solo nella
    // finestra breve alza il minimo garantito anche dei 12 mesi.
    const s12 = new Map(x.s12);
    for (const [c, n] of x.s6) s12.set(c, Math.max(s12.get(c) || 0, n));
    if (s12.size) out.sessioni_12m = somma(s12);
    if (x.s6.size) out.sessioni_6m = somma(x.s6);
    const comuni = [...x.s6.keys()].filter(c => x.s12.has(c));
    const ult6 = comuni.reduce((a, c) => a + x.s6.get(c), 0);
    const prec6 = comuni.reduce((a, c) => a + x.s12.get(c) - x.s6.get(c), 0);
    if (comuni.length && prec6 >= SOGLIA_TENDENZA) out.tendenza_6m = Math.round((ult6 / prec6 - 1) * 1000) / 10;
    return out;
  };
  // Aderenti e totali ufficiali, per la dimensione dei nodi di classe.
  let aderenti = [], totaliUfficiali = new Map(), totaleEnti = null;
  try {
    const res = await fetch(ADERENTI_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    aderenti = csvToObjects(await res.text());
    for (const r of await fetchCSV(TOTALI_URL)) {
      if (!r[0]) continue;
      totaliUfficiali.set(r[0], Number(r[1]));
      if (r[0] === "Totale enti") totaleEnti = { totale: Number(r[1]), ultimo_mese: Number(r[2]), variazione: Number(r[3]) };
    }
    say(`- Aderenti: ${aderenti.length} righe nell'elenco, ${totaliUfficiali.get("Totale enti") ?? "?"} enti nel totale ufficiale`);
  } catch (e) {
    say(`- ⚠️ Elenco aderenti non disponibile (${e.message})`);
  }
  // Andamenti della piattaforma. Facoltativi: se il download fallisce il grafo si
  // genera comunque e l'app non mostra la sezione.
  let piattaforma = null;
  try {
    const leggi = async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} su ${url.split("/").pop()}`);
      return csvToObjects(await res.text());
    };
    const serie = (righe) => righe.filter(r => r.date).map(r => [r.date, Number(r.count)]).filter(([, n]) => Number.isFinite(n));
    const totale = (r, campo) => ({ totale: Number(r[campo]), ultimo_mese: Number(r.lastMonthCount), variazione: Number(r.variation) });
    const [adesioni, attivita, [richieste], [connessioni], [pubblicati]] = await Promise.all(
      [ADESIONI_URL, ATTIVITA_URL, RICHIESTE_URL, CONNESSIONI_URL, PUBBLICATI_URL].map(leggi));
    piattaforma = {
      aderenti: { serie: serie(adesioni), ...(totaleEnti || {}) },
      sessioni: { serie: serie(attivita), ...totale(richieste, "totalCount") },
      connessioni: totale(connessioni, "totalCount"),
      eservice: totale(pubblicati, "count"),
    };
    say(`- Andamenti: ${piattaforma.aderenti.serie.length} mesi di adesioni, ${piattaforma.sessioni.serie.length} mesi di sessioni`);
  } catch (e) {
    say(`- ⚠️ Andamenti della piattaforma non disponibili (${e.message})`);
  }
  const adoptionOf = r => adoption.get(usageKey(r.producerName || "", r.name || "")) || 0;
  const sessionsOf = r => sessions.get(r.id) || 0;

  // 2. Load config
  const classi = loadJSON(join(__dirname, "classi.json")).classi;
  const classIds = new Set(classi.map(c => c.id));
  // I nodi di classe mancanti dal registro vengono generati da classi.json.
  const entities = [
    ...loadJSON(join(__dirname, "entities.json")).entities,
  ];
  for (const c of classi) {
    if (!entities.some(e => e.id === c.id)) {
      entities.push({ id: c.id, ipaCodes: [], name: c.name, tipo: "Fruitore", categoria: "Classi aggregate", descrizione: c.descrizione, produces: false });
    }
  }
  // Attributo certificato -> nodo. category-map.json (enti nominati, eccezioni) ha
  // precedenza sulle classi; le classi coprono anche gli attributi per prefisso.
  const categoryMap = loadJSON(join(__dirname, "category-map.json")).map;
  const classOfAttr = (name) => {
    for (const c of classi) {
      if ((c.attributi || []).includes(name)) return c.id;
      if ((c.attributi_prefisso || []).some(p => name.startsWith(p))) return c.id;
    }
    return null;
  };
  const certTargets = (name) => categoryMap[name] ?? (classOfAttr(name) ? [classOfAttr(name)] : []);
  const classOfOfficial = new Map(classi.flatMap(c => (c.categorie_ufficiali || []).map(o => [o, c.id])));
  // Dimensione delle classi: totale ufficiale dove PagoPA lo pubblica, altrimenti
  // conteggio degli aderenti per attributo certificato (una classe per aderente,
  // nell'ordine di classi.json).
  const classSize = new Map();
  for (const a of aderenti) {
    let attrs = [];
    try { attrs = JSON.parse(a.attributes || "[]").filter(x => x.type === "Certified").map(x => x.name); } catch { /* */ }
    const c = classi.find(c => attrs.some(n => (c.attributi || []).includes(n) || (c.attributi_prefisso || []).some(p => n.startsWith(p))));
    if (c) classSize.set(c.id, (classSize.get(c.id) || 0) + 1);
  }
  const classInfo = new Map(classi.map(c => {
    const ufficiale = c.totale_ufficiale && totaliUfficiali.get(c.totale_ufficiale);
    return [c.id, ufficiale != null
      ? { aderenti: ufficiale, aderenti_fonte: "totale ufficiale PagoPA" }
      : classSize.has(c.id) ? { aderenti: classSize.get(c.id), aderenti_fonte: "conteggio per attributo certificato" } : {}];
  }));
  const overrides = loadJSON(join(__dirname, "connections-overrides.json")).overrides;
  // Layer congelato: inferenze AI curate e fissate nel dato versionato (deterministico).
  let frozen = {};
  try { frozen = loadJSON(join(__dirname, "connections-frozen.json")).frozen || {}; }
  catch { /* nessun file frozen: nessuna inferenza congelata */ }
  // Relazioni ricostruite del grafo curato v1: si sommano agli archi del catalogo.
  let reconstructed = { anchored: {}, unanchored: [] };
  try { reconstructed = { ...reconstructed, ...loadJSON(join(__dirname, "connections-reconstructed.json")) }; }
  catch { /* nessun file: nessuna relazione ricostruita */ }
  const validNodeIds = new Set(entities.map(e => e.id));
  // E-service da includere sempre, anche oltre maxServices: quelli con archi curati.
  // Le inferenze congelate sono stime curate e fissate a mano: anche quelle restano.
  const pinned = new Set([...Object.keys(overrides), ...Object.keys(reconstructed.anchored), ...Object.keys(frozen)]);

  // Previous data (for drop guard + diff). Confronta con l'anteprima precedente;
  // al primo run (anteprima assente) usa il grafo curato live come baseline.
  let prev = { enti: [], eservices: [] };
  try { prev = loadJSON(OUTPUT_PATH); }
  catch { try { prev = loadJSON(LIVE_PATH); } catch { /* primo run assoluto */ } }
  const prevServiceIds = new Set(prev.eservices.map(s => s.id));

  // 3. Index records by IPA code
  const byIpa = {};
  for (const r of records) {
    const ipa = r.producerIpaCode;
    if (!ipa) continue;
    (byIpa[ipa] = byIpa[ipa] || []).push(r);
  }

  // 4. Build e-services for tracked producers
  const eservices = [];
  const newServices = [], noFruitori = [];

  for (const ent of entities) {
    if (!ent.produces) continue;
    let pool = [];
    for (const ipa of ent.ipaCodes) pool = pool.concat(byIpa[ipa] || []);
    // Pubblicati prima dei sospesi; fra questi i più rilevanti; a parità, ordine
    // alfabetico. Rilevanza = il maggiore fra enti abilitati e sessioni di scambio,
    // ciascuno rapportato al massimo dell'ente: così entrano sia i servizi con molti
    // fruitori sia quelli con pochi fruitori ma volumi enormi.
    pool = pool.filter(r => r.activeDescriptorState === "PUBLISHED" || r.activeDescriptorState === "SUSPENDED");
    const maxAd = Math.max(1, ...pool.map(adoptionOf));
    const maxSe = Math.max(1, ...pool.map(sessionsOf));
    const score = r => Math.max(adoptionOf(r) / maxAd, sessionsOf(r) / maxSe);
    pool.sort((a, b) => {
      const ap = a.activeDescriptorState === "PUBLISHED" ? 0 : 1;
      const bp = b.activeDescriptorState === "PUBLISHED" ? 0 : 1;
      return ap - bp || score(b) - score(a) || a.name.localeCompare(b.name);
    });
    // I servizi con archi curati restano sempre; il resto riempie fino a maxServices.
    pool = [
      ...pool.filter(r => pinned.has(r.id)),
      ...pool.filter(r => !pinned.has(r.id)).slice(0, ent.maxServices || 6),
    ];

    for (const r of pool) {
      const id = shortId(ent.id, r.id);
      const ok = n => validNodeIds.has(n) && n !== ent.id;
      // Provenienza per arco, in ordine di forza della prova: documentata (override con
      // fonte), osservata (connessioni realmente abilitate, statistiche ufficiali),
      // certificata (categorie abilitate nel catalogo), ricostruita (modello v1).
      // Ogni fruitore compare una volta con la provenienza più forte. Le inferenze
      // congelate (inferita) si applicano solo se non c'è nient'altro.
      const archi = [];
      const add = (list, origine) => list.filter(ok).forEach(f => {
        if (!archi.some(a => a.fruitore === f)) archi.push({ fruitore: f, origine });
      });
      // Connessioni osservate per nodo di classe: somma sulle categorie ufficiali che
      // confluiscono nello stesso nodo (sono insiemi di enti disgiunti).
      const conn = new Map();
      for (const [cat, n] of observed.get(usageKey(r.producerName || "", r.name || "")) || []) {
        const node = classOfOfficial.get(cat);
        if (node) conn.set(node, (conn.get(node) || 0) + n);
      }
      // Sessioni di scambio per classe: anche un solo ente che usa davvero il servizio
      // è una prova osservata della relazione.
      const sess = new Map();
      for (const [cat, n] of observedSessions.get(r.id) || []) {
        const node = classOfOfficial.get(cat);
        if (node) sess.set(node, (sess.get(node) || 0) + n);
      }
      if (overrides[r.id]) add(overrides[r.id], "documentata");
      add([...new Set([...conn.keys(), ...sess.keys()])], "osservata");
      if (!overrides[r.id]) {
        const set = new Set();
        for (const c of certifiedCategories(r.attributes)) certTargets(c).forEach(n => set.add(n));
        add([...set], "certificata");
      }
      if (reconstructed.anchored[r.id]) add(reconstructed.anchored[r.id].fruitori, "ricostruita");
      // Inferenze congelate: stime curate fissate nel dato, così il grafo resta
      // deterministico senza dipendere da una chiamata AI a runtime.
      if (!archi.length && frozen[r.id]) add(frozen[r.id], "inferita");
      // Il numero di connessioni osservate accompagna l'arco qualunque sia la sua
      // provenienza: è un dato ufficiale sul peso reale della relazione.
      for (const a of archi) {
        if (conn.has(a.fruitore)) a.connessioni = conn.get(a.fruitore);
        if (sess.has(a.fruitore)) a.sessioni = sess.get(a.fruitore);
      }
      const fruitori = archi.map(a => a.fruitore);

      eservices.push({
        id,
        nome: truncate(r.name, 70),
        erogatore: ent.id,
        fruitori,
        archi,
        versione: String(r.activeDescriptorVersion || "1"),
        stato: r.activeDescriptorState === "PUBLISHED" ? "Attivo" : "Sospeso",
        descrizione: truncate(r.description, 140),
        catalogId: r.id,
        ...(adoptionOf(r) ? { enti_abilitati_min: adoptionOf(r) } : {}),
        ...(sessionsOf(r) ? { sessioni_min: sessionsOf(r) } : {}),
        ...andamentoOf(r.id)
      });

      if (!prevServiceIds.has(id)) newServices.push(`${ent.name} — ${truncate(r.name, 50)}`);
    }
  }

  // 4-bis. Archi curati agganciati a record non più pubblicati: vanno ri-agganciati
  // a mano al successore attivo, altrimenti il grafo mostra un servizio sospeso.
  const byId = new Map(records.map(r => [r.id, r]));
  const curatedStale = [...pinned]
    .map(id => [id, byId.get(id)])
    .filter(([, r]) => !r || r.activeDescriptorState !== "PUBLISHED")
    .map(([id, r]) => `${id} (${r ? `${r.activeDescriptorState} — ${truncate(r.name, 50)}` : "assente dal catalogo"})`);

  // 4a. E-service ricostruiti v1 senza un record di catalogo univoco: riportati così
  // come sono, con archi 'ricostruita'. Senza catalogId, non passano dall'inferenza.
  const unanchoredDropped = [];
  for (const u of reconstructed.unanchored) {
    if (!validNodeIds.has(u.erogatore)) { unanchoredDropped.push(u.id); continue; }
    const fruitori = [...new Set(u.fruitori)].filter(n => validNodeIds.has(n) && n !== u.erogatore);
    eservices.push({
      id: u.id,
      nome: u.nome,
      erogatore: u.erogatore,
      fruitori,
      archi: fruitori.map(f => ({ fruitore: f, origine: "ricostruita" })),
      versione: u.versione,
      stato: u.stato,
      descrizione: u.descrizione,
      catalogId: null,
    });
    if (!prevServiceIds.has(u.id)) newServices.push(`${u.erogatore} — ${truncate(u.nome, 50)} (ricostruito v1)`);
  }

  // 4b. Inferenza AI a runtime (origine: inferita), SOLO sui catalogId in allowlist.
  // Semantica: allowlist vuota o assente => nessuna inferenza a runtime. Le inferenze
  // curate vivono nel file frozen (deterministiche); l'AI live va riabilitata in modo
  // esplicito aggiungendo un catalogId all'allowlist.
  let aiStats = null;
  let allowSet = null;
  try {
    const al = loadJSON(join(__dirname, "inference-allowlist.json"));
    if (Array.isArray(al.allow) && al.allow.length) allowSet = new Set(al.allow);
  } catch { /* nessun allowlist: nessuna inferenza a runtime */ }
  const uncovered = allowSet
    ? eservices.filter(s => s.fruitori.length === 0 && allowSet.has(s.catalogId))
    : [];
  if (USE_AI && uncovered.length > 0) {
    const nodeVocab = entities.map(({ id, name, categoria }) => ({ id, name, categoria }));
    try {
      const { map, stats } = await inferConnections(
        uncovered.map(s => ({ catalogId: s.catalogId, nome: s.nome, descrizione: s.descrizione, erogatore: s.erogatore })),
        nodeVocab,
        AI_CACHE_PATH
      );
      aiStats = stats;
      for (const s of eservices) {
        const inf = map.get(s.catalogId);
        if (inf && inf.fruitori.length) {
          s.fruitori = inf.fruitori;
          s.archi = inf.fruitori.map(f => ({ fruitore: f, origine: "inferita" }));
          s.ai_confidenza = inf.confidenza;
          s.ai_motivazione = inf.motivazione;
        }
      }
    } catch (e) {
      aiStats = { error: e.message };
    }
  }

  // 4c. Normalizzazione deterministica dei soli archi 'inferita'.
  // Le città e le regioni che tracciamo come nodi sono un CAMPIONE scelto da noi:
  // un arco inferito verso "Milano" o "Lazio" rifletterebbe la nostra selezione di
  // nodi, non un'evidenza nel dato. Per gli archi inferiti collassiamo perciò le
  // classi campionate su aggregati (c_* -> comuni_agg, r_*/pa_* -> regioni_agg),
  // dichiarando un'eleggibilità di classe stimata anziché connessioni puntuali non
  // documentabili. Gli enti distinti (ministeri, INPS, INAIL, ANAC, MUR, Cineca…)
  // restano nominati. Gli archi 'certificata' e 'documentata' NON vengono toccati:
  // lì il nome dell'ente è ancorato al dato di catalogo o alla fonte ufficiale.
  const collapseInferred = (id) =>
    /^c_/.test(id) ? "comuni_agg" : (/^(r_|pa_)/.test(id) ? "regioni_agg" : id);
  for (const s of eservices) {
    if (!s.archi.some(a => a.origine === "inferita")) continue;
    const seen = new Set();
    const collapsed = [];
    for (const a of s.archi) {
      const f = a.origine === "inferita" ? collapseInferred(a.fruitore) : a.fruitore;
      if (f === s.erogatore || !validNodeIds.has(f) || seen.has(f)) continue;
      seen.add(f);
      collapsed.push({ ...a, fruitore: f });
    }
    s.archi = collapsed;
    s.fruitori = collapsed.map(a => a.fruitore);
  }

  // Ricalcola i servizi ancora privi di archi dopo l'inferenza
  eservices.forEach(s => { if (s.fruitori.length === 0) noFruitori.push(`${s.nome} (${s.catalogId})`); });

  // 5. Build nodes — only entities that produce >=1 service or are referenced as fruitori
  const referenced = new Set();
  eservices.forEach(s => { referenced.add(s.erogatore); s.fruitori.forEach(f => referenced.add(f)); });
  const enti = entities
    .filter(e => referenced.has(e.id))
    .map(({ id, name, tipo, categoria, descrizione }) => ({
      id, name,
      tipo: tipo || inferTipo(id, eservices),
      categoria, descrizione,
      // I nodi di classe rappresentano insiemi di enti: lo dichiarano, con la loro dimensione.
      ...(classIds.has(id) ? { aggregato: true, ...classInfo.get(id) } : {})
    }));

  // 6. GUARDS on output
  if (eservices.length === 0) {
    say(`\n❌ ABORT: zero e-service generati. Possibile problema di matching IPA. Nessuna modifica applicata.`);
    flush(log);
    process.exit(1);
  }
  if (prev.enti.length > 0) {
    const dropRatio = 1 - enti.length / prev.enti.length;
    if (dropRatio > MAX_NODE_DROP_RATIO) {
      say(`\n❌ ABORT: i nodi calano da ${prev.enti.length} a ${enti.length} (${(dropRatio * 100).toFixed(0)}% > ${MAX_NODE_DROP_RATIO * 100}%). Nessuna modifica applicata.`);
      flush(log);
      process.exit(1);
    }
  }

  // 7. Assemble output
  const removed = [...prevServiceIds].filter(id => !eservices.find(s => s.id === id));
  const output = {
    meta: {
      generato: new Date().toISOString(),
      ultimo_aggiornamento: DATA_DATI || new Date().toISOString().slice(0, 10),
      ...(OPENDATA_REF !== "main" ? { versione_dati_aperti: `italia/pdnd-opendata@${OPENDATA_REF}` } : {}),
      versione_modello: "v2",
      fonte_enti: "github.com/italia/pdnd-opendata — aderenti.csv (CC0 1.0)",
      fonte_eservices: "github.com/italia/pdnd-opendata — eservice_a_catalogo.csv (CC0 1.0)",
      fonte_connessioni: "Per arco, campo 'origine': override documentati, campo attributes.certified del catalogo, relazioni ricostruite del grafo curato v1, stime AI congelate — vedi METODOLOGIA.md e pipeline/README.md",
      snapshot_catalogo: `${records.length} righe nel catalogo${DATA_DATI ? ` al ${DATA_DATI}` : ` scaricato il ${new Date().toISOString().slice(0, 10)}`}`,
      fonte_adozione: "github.com/italia/pdnd-opendata — e_service_con_piu_enti_abilitati_from_the_beginning.csv (CC0 1.0). Il campo enti_abilitati_min è il massimo di enti fruitori abilitati fra le classifiche per categoria in cui l'e-service compare: un minimo garantito, non il totale. Gli e-service di ogni ente sono scelti per adozione decrescente.",
      metodologia: "METODOLOGIA.md",
      paper_doi: "10.5281/zenodo.19989954",
      paper_url: "https://doi.org/10.5281/zenodo.19989954",
      nota_paper: "Il report Zenodo descrive il modello v1 (snapshot 2026-05-02), conservato in src/data/snapshots/pdnd-data.2026-05-02.json. Questo dato è il modello v2: numeri diversi da quelli del report.",
      convenzione_eservices: "Gli e-service con catalogId corrispondono a un record del catalogo PDND. Quelli con catalogId null sono tipi di servizio ricostruiti nel modello v1 (aggregati comunali, voci riassuntive di ente, famiglie di API): un record può rappresentare molti endpoint del catalogo.",
      fonte_sessioni: "github.com/italia/pdnd-opendata — eservice_con_piu_token_staccati_from_the_beginning.csv (CC0 1.0). Il campo sessioni_min è il massimo di sessioni di scambio fra le classifiche in cui l'e-service compare. La selezione per ente usa il maggiore fra enti abilitati e sessioni, ciascuno rapportato al massimo dell'ente.",
      fonte_andamento: "github.com/italia/pdnd-opendata — eservice_con_piu_token_staccati_last_twelve_months.csv e _last_six_months.csv (CC0 1.0). sessioni_12m e sessioni_6m sommano le sessioni per categoria di ente fruitore nelle classifiche della finestra (minimi garantiti, primi 10 e-service per categoria). tendenza_6m confronta gli ultimi 6 mesi con i 6 precedenti (12 mesi meno 6) sulle sole categorie presenti in entrambe le finestre, ed è calcolata solo se i 6 mesi precedenti superano 100.000 sessioni.",
      fonte_aderenti: "github.com/italia/pdnd-opendata — aderenti.csv e totale_enti.csv (CC0 1.0). I nodi di classe (aggregato=true) riportano gli aderenti: il totale ufficiale dove pubblicato, altrimenti il conteggio per attributo certificato (pipeline/classi.json).",
      note_connessioni: "Ogni arco porta un campo 'origine': 'documentata' (override da fonti ufficiali), 'osservata' (connessioni abilitate o sessioni di scambio realmente avvenute verso una classe di enti, dalle classifiche ufficiali; i campi connessioni e sessioni riportano i valori osservati, minimi garantiti), 'certificata' (campo attributes.certified del catalogo: classi di enti abilitate), 'ricostruita' (relazioni del grafo curato v1, ricostruite da documentazione pubblica con l'ausilio di modelli AI), 'inferita' (stima AI con confidenza, da rendere tratteggiata nel grafo). Il progetto si basa esclusivamente su informazioni già pubbliche; gli archi inferiti sono dichiarati come stime e non come fatti documentati.",
      generato_da: "pipeline/build-graph-data.mjs",
      ...(piattaforma ? {
        piattaforma,
        fonte_piattaforma: "github.com/italia/pdnd-opendata — andamento_delle_adesioni, attivita_della_piattaforma_from_the_beginning, totale_richieste_di_accesso, connessioni_totali, eservice_pubblicati (CC0 1.0). Serie mensili a scaglioni che terminano il 24 di ogni mese: enti aderenti cumulati e sessioni di scambio nel mese. Riguardano l'intera piattaforma, non la selezione rappresentata nella mappa.",
      } : {}),
    },
    enti,
    eservices
  };

  // 8. Report
  const byOrigine = { documentata: 0, osservata: 0, certificata: 0, ricostruita: 0, inferita: 0 };
  eservices.forEach(s => s.archi.forEach(a => { if (byOrigine[a.origine] != null) byOrigine[a.origine]++; }));

  say(`\n## Risultato`);
  say(`- Nodi (enti): **${enti.length}** (prima: ${prev.enti.length})`);
  say(`- E-service: **${eservices.length}** (prima: ${prev.eservices.length})`);
  say(`- Nuovi e-service: **${newServices.length}**`);
  say(`- E-service rimossi: **${removed.length}**`);
  say(`- E-service senza fruitori: **${noFruitori.length}**`);
  say(`\n### Archi per provenienza`);
  say(`- 📄 Documentata (override): **${byOrigine.documentata}**`);
  say(`- 👁️ Osservata (connessioni ufficiali): **${byOrigine.osservata}**`);
  say(`- ✅ Certificata (attributes): **${byOrigine.certificata}**`);
  say(`- 🧩 Ricostruita (grafo curato v1): **${byOrigine.ricostruita}**`);
  if (curatedStale.length) {
    say(`\n### ⚠️ Archi curati su e-service non pubblicati (ri-agganciare in connections-overrides/reconstructed)`);
    curatedStale.forEach(s => say(`- ${s}`));
  }
  if (unanchoredDropped.length) say(`- ⚠️  E-service ricostruiti scartati (erogatore non tracciato): ${unanchoredDropped.join(", ")}`);
  say(`- 🤖 Inferita (AI): **${byOrigine.inferita}**`);
  say(`
### Classi di enti (nodi aggregati)`);
  for (const e of enti.filter(e => e.aggregato)) say(`- ${e.name}: ${e.aderenti ?? "?"} aderenti (${e.aderenti_fonte ?? "n/d"})`);
  if (aiStats) {
    if (allowSet) say(`\n_Inferenza AI ristretta all'allowlist: ${allowSet.size} e-service permessi._`);
    if (aiStats.error) say(`\n⚠️  Inferenza AI non eseguita: ${aiStats.error} (la pipeline è proseguita senza)`);
    else say(`\n### Inferenza AI\n- Engine: ${aiStats.engine} · soglia confidenza: ${aiStats.minConf}\n- Nuove chiamate: ${aiStats.calls} · accettate: ${aiStats.fresh} · da cache: ${aiStats.fromCache} · scartate: ${aiStats.dropped} · errori: ${aiStats.errors}${aiStats.errors > 0 && aiStats.lastError ? `\n- Ultimo errore: \`${aiStats.lastError}\`` : ""}`);
  } else if (!USE_AI) {
    say(`\nℹ️  Inferenza AI disattivata (--no-ai).`);
  }

  if (newServices.length) { say(`\n### Nuovi e-service`); newServices.slice(0, 40).forEach(s => say(`- ${s}`)); }
  if (noFruitori.length) {
    say(`\n### E-service senza archi (aggiungi override in connections-overrides.json)`);
    noFruitori.slice(0, 40).forEach(s => say(`- ${s}`));
    if (noFruitori.length > 40) say(`- … e altri ${noFruitori.length - 40}`);
  }

  // 9. Candidate new producers (high-volume IPA not tracked)
  const tracked = new Set(entities.flatMap(e => e.ipaCodes));
  const candidates = Object.entries(byIpa)
    .map(([ipa, rs]) => [ipa, rs.filter(r => r.activeDescriptorState === "PUBLISHED").length, rs[0].producerName])
    .filter(([ipa, n]) => n >= 20 && !tracked.has(ipa) && !ipa.startsWith("c_"))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  if (candidates.length) {
    say(`\n### Candidati nuovi erogatori centrali (>=20 API, non tracciati)`);
    candidates.forEach(([ipa, n, nm]) => say(`- [${ipa}] ${nm} — ${n} API`));
  }

  // 10. Write
  if (WRITE) {
    writeFileSync(OUTPUT_PATH, (OUT_ARG ? JSON.stringify(output) : JSON.stringify(output, null, 2)) + "\n", "utf-8");
    say(`\n✅ Scritto: ${OUTPUT_PATH}`);
    say(`ℹ️  Il grafo live (src/data/pdnd-data.json) NON è stato modificato.`);
    say(`   Per promuovere l'anteprima a dato live, vedi pipeline/README.md.`);
  } else {
    say(`\nℹ️  DRY-RUN: nessun file scritto. Rilancia con --write per aggiornare l'anteprima.`);
  }

  flush(log);
}

function inferTipo(id, eservices) {
  const eroga = eservices.some(s => s.erogatore === id);
  const fruisce = eservices.some(s => s.fruitori.includes(id));
  if (eroga && fruisce) return "Erogatore/Fruitore";
  if (eroga) return "Erogatore";
  return "Fruitore";
}

function flush(log) {
  if (!REPORT_PATH) return;
  try { writeFileSync(REPORT_PATH, log.join("\n") + "\n", "utf-8"); } catch { /* ignore */ }
}

main().catch(e => { console.error(e); process.exit(1); });
