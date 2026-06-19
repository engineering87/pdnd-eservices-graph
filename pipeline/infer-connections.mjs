/**
 * infer-connections.mjs
 * ─────────────────────
 * Inferenza degli archi erogatore→fruitore tramite AI, per gli e-service
 * che non hanno né una categoria certificata né un override documentato.
 *
 * Caratteristiche pensate per una pipeline automatica affidabile:
 *  - ADAPTER AGNOSTICO: backend Anthropic API oppure modello locale
 *    OpenAI-compatibile (es. llama.cpp sul DGX Spark).
 *  - CACHE per catalogId: un e-service già inferito non viene re-inferito,
 *    così il grafo è stabile e l'AI gira solo sui servizi nuovi.
 *  - SOGLIA DI CONFIDENZA: gli archi sotto soglia vengono scartati.
 *  - VOCABOLARIO CONTROLLATO: il modello può scegliere SOLO tra i nodi
 *    esistenti; non può inventare entità.
 *  - DETERMINISMO: temperatura 0.
 *  - FAIL-SAFE: se l'AI non è disponibile o va in errore, la funzione
 *    restituisce ciò che ha (cache) senza interrompere la pipeline.
 *
 * Variabili d'ambiente:
 *  - INFERENCE_ENGINE       "github" | "anthropic" | "local"
 *  - GITHUB_TOKEN           per engine "github" (presente di default nelle Actions
 *                           con permesso "models: read"); modello via GITHUB_MODEL
 *                           (default "openai/gpt-4.1")
 *  - ANTHROPIC_API_KEY      per engine "anthropic"; modello via ANTHROPIC_MODEL
 *  - INFERENCE_BASE_URL     per engine "local" (es. http://localhost:8080/v1)
 *  - INFERENCE_MIN_CONF     soglia confidenza 0-1 (default 0.55)
 *  - INFERENCE_MAX_CALLS    tetto chiamate per run (default 200, salvaguardia costi/limiti)
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";

const MIN_CONF = parseFloat(process.env.INFERENCE_MIN_CONF || "0.55");
const MAX_CALLS = parseInt(process.env.INFERENCE_MAX_CALLS || "200", 10);
const ENGINE = process.env.INFERENCE_ENGINE || "anthropic";

const SYSTEM_PROMPT = `Sei un assistente esperto di interoperabilità della Pubblica Amministrazione italiana e della Piattaforma Digitale Nazionale Dati (PDND).

Dato un e-service erogato da un ente, devi stimare QUALI categorie di enti ne sono i probabili FRUITORI, scegliendo ESCLUSIVAMENTE tra i nodi del vocabolario fornito.

Regole tassative:
- Scegli solo id presenti nella lista "nodi disponibili". Non inventare mai id.
- Basati sulla funzione evidente del servizio e sui pattern tipici di interoperabilità della PA italiana.
- Se i fruitori non sono ragionevolmente deducibili, restituisci lista vuota e confidenza bassa. È preferibile non rispondere che indovinare.
- La confidenza riflette quanto è solida l'inferenza (0 = pura congettura, 1 = praticamente certo dal dominio).
- Non includere mai l'erogatore stesso tra i fruitori.

Rispondi SOLO con un oggetto JSON, senza testo aggiuntivo né markdown:
{"fruitori": ["id1","id2"], "confidenza": 0.0, "motivazione": "una frase"}`;

function buildUserPrompt(service, nodes, erogatoreId) {
  const vocab = nodes
    .filter(n => n.id !== erogatoreId)
    .map(n => `- ${n.id} (${n.name}, ${n.categoria})`)
    .join("\n");
  return `E-service da analizzare:
- Nome: ${service.nome}
- Descrizione: ${service.descrizione || "(assente)"}
- Erogatore: ${erogatoreId}

Nodi disponibili (scegli i fruitori solo tra questi):
${vocab}`;
}

function extractJSON(text) {
  const clean = text.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no JSON");
  return JSON.parse(clean.slice(start, end + 1));
}

async function callAnthropic(system, user) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY mancante");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
      max_tokens: 400,
      temperature: 0,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}`);
  const data = await res.json();
  return data.content.map(b => b.text || "").join("");
}

async function callLocal(system, user) {
  const base = process.env.INFERENCE_BASE_URL;
  if (!base) throw new Error("INFERENCE_BASE_URL mancante");
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.INFERENCE_MODEL || "local",
      temperature: 0,
      max_tokens: 400,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Local HTTP ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callGitHub(system, user) {
  // GitHub Models: API OpenAI-compatibile, autenticata col GITHUB_TOKEN delle Actions.
  // Richiede il permesso "models: read" nel workflow.
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN mancante");
  const res = await fetch("https://models.github.ai/inference/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${token}`,
      "x-github-api-version": "2026-03-10",
    },
    body: JSON.stringify({
      model: process.env.GITHUB_MODEL || "openai/gpt-4.1",
      temperature: 0,
      max_tokens: 400,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`GitHub Models HTTP ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

const callModel = (s, u) => {
  if (ENGINE === "local") return callLocal(s, u);
  if (ENGINE === "github") return callGitHub(s, u);
  return callAnthropic(s, u);
};

/**
 * @param {Array} uncovered  e-service senza archi: {catalogId, nome, descrizione, erogatore}
 * @param {Array} nodes      nodi validi: {id, name, categoria}
 * @param {string} cachePath percorso del file di cache
 * @returns {Map<catalogId, {fruitori, confidenza, motivazione, origine:'inferita'}>}
 */
export async function inferConnections(uncovered, nodes, cachePath) {
  const cache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, "utf-8")) : {};
  const validIds = new Set(nodes.map(n => n.id));
  const result = new Map();
  let calls = 0, fresh = 0, fromCache = 0, dropped = 0, errors = 0;

  for (const svc of uncovered) {
    const cid = svc.catalogId;
    // Cache hit
    if (cache[cid]) {
      fromCache++;
      if (cache[cid].fruitori?.length) result.set(cid, { ...cache[cid], origine: "inferita" });
      continue;
    }
    // Budget guard
    if (calls >= MAX_CALLS) continue;
    calls++;

    try {
      const raw = await callModel(SYSTEM_PROMPT, buildUserPrompt(svc, nodes, svc.erogatore));
      const parsed = extractJSON(raw);
      const fruitori = (parsed.fruitori || []).filter(id => validIds.has(id) && id !== svc.erogatore);
      const conf = Number(parsed.confidenza) || 0;
      const entry = { fruitori, confidenza: conf, motivazione: (parsed.motivazione || "").slice(0, 200) };
      cache[cid] = entry; // memorizza anche le inferenze deboli, per non riprovarle
      if (fruitori.length && conf >= MIN_CONF) {
        result.set(cid, { ...entry, origine: "inferita" });
        fresh++;
      } else {
        dropped++;
      }
    } catch (e) {
      errors++;
      // non scrivere in cache: riproveremo al prossimo run
    }
  }

  // Persisti cache aggiornata
  try { writeFileSync(cachePath, JSON.stringify(cache, null, 2) + "\n", "utf-8"); } catch { /* ignore */ }

  return { map: result, stats: { calls, fresh, fromCache, dropped, errors, engine: ENGINE, minConf: MIN_CONF } };
}
