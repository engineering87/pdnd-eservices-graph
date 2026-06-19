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
const OUTPUT_PATH = PREVIEW_PATH;
const REPORT_PATH = join(__dirname, "last-run-report.md");
const AI_CACHE_PATH = join(__dirname, "ai-cache.json");

const CSV_URL =
  "https://raw.githubusercontent.com/italia/pdnd-opendata/main/data/eservice_a_catalogo.csv";

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
      const nm = c?.single?.name || (Array.isArray(c?.group) ? c.group[0]?.name : null);
      if (nm) out.push(nm);
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

  // 2. Load config
  const entities = loadJSON(join(__dirname, "entities.json")).entities;
  const categoryMap = loadJSON(join(__dirname, "category-map.json")).map;
  const overrides = loadJSON(join(__dirname, "connections-overrides.json")).overrides;
  const validNodeIds = new Set(entities.map(e => e.id));

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
  const newServices = [], versionChanges = [], noFruitori = [];

  for (const ent of entities) {
    if (!ent.produces) continue;
    let pool = [];
    for (const ipa of ent.ipaCodes) pool = pool.concat(byIpa[ipa] || []);
    // published first, stable sort by name
    pool = pool
      .filter(r => r.activeDescriptorState === "PUBLISHED" || r.activeDescriptorState === "SUSPENDED")
      .sort((a, b) => {
        const ap = a.activeDescriptorState === "PUBLISHED" ? 0 : 1;
        const bp = b.activeDescriptorState === "PUBLISHED" ? 0 : 1;
        return ap - bp || a.name.localeCompare(b.name);
      })
      .slice(0, ent.maxServices || 6);

    for (const r of pool) {
      const id = shortId(ent.id, r.id);
      // Determina fruitori e provenienza: override (documentata) > baseline certified (certificata)
      let fruitori = [], origine = null;
      if (overrides[r.id]) {
        fruitori = overrides[r.id].filter(n => validNodeIds.has(n) && n !== ent.id);
        origine = "documentata";
      } else {
        const cats = certifiedCategories(r.attributes);
        const set = new Set();
        for (const c of cats) (categoryMap[c] || []).forEach(n => { if (validNodeIds.has(n) && n !== ent.id) set.add(n); });
        fruitori = [...set];
        if (fruitori.length) origine = "certificata";
      }

      eservices.push({
        id,
        nome: truncate(r.name, 70),
        erogatore: ent.id,
        fruitori,
        archi: fruitori.map(f => ({ fruitore: f, origine })),
        versione: String(r.activeDescriptorVersion || "1"),
        stato: r.activeDescriptorState === "PUBLISHED" ? "Attivo" : "Sospeso",
        descrizione: truncate(r.description, 140),
        catalogId: r.id
      });

      if (!prevServiceIds.has(id)) newServices.push(`${ent.name} — ${truncate(r.name, 50)}`);
    }
  }

  // 4b. Inferenza AI per gli e-service ancora senza archi (origine: inferita)
  let aiStats = null;
  const uncovered = eservices.filter(s => s.fruitori.length === 0);
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
      categoria, descrizione
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
      fonte_enti: "github.com/italia/pdnd-opendata — aderenti.csv (CC0 1.0)",
      fonte_eservices: "github.com/italia/pdnd-opendata — eservice_a_catalogo.csv (CC0 1.0)",
      note_connessioni: "Ogni arco porta un campo 'origine': 'documentata' (override da fonti ufficiali), 'certificata' (campo attributes.certified del catalogo), 'inferita' (stima AI con confidenza, da rendere tratteggiata nel grafo). Il progetto si basa esclusivamente su informazioni già pubbliche; gli archi inferiti sono dichiarati come stime e non come fatti documentati.",
      generato_da: "pipeline/build-graph-data.mjs"
    },
    enti,
    eservices
  };

  // 8. Report
  const byOrigine = { documentata: 0, certificata: 0, inferita: 0 };
  eservices.forEach(s => s.archi.forEach(a => { if (byOrigine[a.origine] != null) byOrigine[a.origine]++; }));

  say(`\n## Risultato`);
  say(`- Nodi (enti): **${enti.length}** (prima: ${prev.enti.length})`);
  say(`- E-service: **${eservices.length}** (prima: ${prev.eservices.length})`);
  say(`- Nuovi e-service: **${newServices.length}**`);
  say(`- E-service rimossi: **${removed.length}**`);
  say(`- E-service senza fruitori: **${noFruitori.length}**`);
  say(`\n### Archi per provenienza`);
  say(`- 📄 Documentata (override): **${byOrigine.documentata}**`);
  say(`- ✅ Certificata (attributes): **${byOrigine.certificata}**`);
  say(`- 🤖 Inferita (AI): **${byOrigine.inferita}**`);
  if (aiStats) {
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
    writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n", "utf-8");
    say(`\n✅ Scritta l'anteprima: ${OUTPUT_PATH}`);
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
  try { writeFileSync(REPORT_PATH, log.join("\n") + "\n", "utf-8"); } catch { /* ignore */ }
}

main().catch(e => { console.error(e); process.exit(1); });
