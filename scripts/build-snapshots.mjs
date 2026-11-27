#!/usr/bin/env node
/**
 * build-snapshots.mjs
 * ───────────────────
 * Ricostruisce il grafo com'era a date passate e lo salva in
 * src/data/snapshots/pdnd-data.AAAA-MM-GG.json, per il confronto fra date
 * nell'app.
 *
 * Per ogni data cerca l'ultimo commit di italia/pdnd-opendata fino a quel giorno
 * e rilancia la pipeline su quella versione dei dati aperti, con le regole di
 * oggi (enti tracciati, classi, override, relazioni del v1). Così le differenze
 * fra due istantanee riflettono i cambiamenti della PDND, non del modello.
 *
 * Uso:
 *   node scripts/build-snapshots.mjs 2026-06-01 2026-07-01   # date precise
 *   node scripts/build-snapshots.mjs --mensili 2026-06 2026-11  # il 1° di ogni mese
 *
 * Le istantanee esistenti non vengono rigenerate (usa --forza per farlo).
 * Il modello v1 del report (pdnd-data.2026-05-02.json) non viene mai toccato.
 */

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const forza = args.includes("--forza");

let date = args.filter((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));
const iMensili = args.indexOf("--mensili");
if (iMensili >= 0) {
  const [da, a] = [args[iMensili + 1], args[iMensili + 2]];
  if (!/^\d{4}-\d{2}$/.test(da || "") || !/^\d{4}-\d{2}$/.test(a || "")) {
    console.error("Uso: --mensili AAAA-MM AAAA-MM");
    process.exit(1);
  }
  let [y, m] = da.split("-").map(Number);
  const [y1, m1] = a.split("-").map(Number);
  while (y < y1 || (y === y1 && m <= m1)) {
    date.push(`${y}-${String(m).padStart(2, "0")}-01`);
    m++; if (m > 12) { m = 1; y++; }
  }
}
if (!date.length) {
  console.error("Indica almeno una data (AAAA-MM-GG) o --mensili AAAA-MM AAAA-MM");
  process.exit(1);
}

/** Ultimo commit del repository dei dati aperti fino alla fine del giorno indicato. */
async function commitAl(data) {
  const url = `https://api.github.com/repos/italia/pdnd-opendata/commits?until=${data}T23:59:59Z&per_page=1`;
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "pdnd-eservices-graph" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  let res = await fetch(url, { headers });
  // Un token scaduto o non valido non deve bloccare: il repository è pubblico.
  if (res.status === 401 && headers.Authorization) {
    delete headers.Authorization;
    res = await fetch(url, { headers });
  }
  if (!res.ok) throw new Error(`GitHub API ${res.status} per ${data}`);
  const [c] = await res.json();
  if (!c) throw new Error(`nessun commit di pdnd-opendata fino al ${data}`);
  return { sha: c.sha, quando: c.commit.committer.date };
}

let errori = 0;
for (const data of date) {
  if (data === "2026-05-02") { console.log(`${data}: è il modello v1 del report, non lo rigenero.`); continue; }
  const rel = `src/data/snapshots/pdnd-data.${data}.json`;
  if (existsSync(path.join(ROOT, rel)) && !forza) { console.log(`${data}: già presente, salto (--forza per rigenerare).`); continue; }
  try {
    const { sha, quando } = await commitAl(data);
    console.log(`${data}: pdnd-opendata@${sha.slice(0, 8)} (${quando}) → ${rel}`);
    const r = spawnSync(process.execPath, ["pipeline/build-graph-data.mjs", "--write", "--no-ai", "--out", rel, "--data", data], {
      cwd: ROOT, env: { ...process.env, PDND_OPENDATA_REF: sha }, encoding: "utf8",
    });
    if (r.status !== 0) throw new Error((r.stderr || r.stdout || "").trim().split("\n").slice(-3).join(" | "));
  } catch (e) {
    errori++;
    console.error(`${data}: ERRORE ${e.message}`);
  }
}
process.exit(errori ? 1 : 0);
