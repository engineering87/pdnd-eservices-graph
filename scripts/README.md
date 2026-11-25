# Audit and metrics scripts

This folder contains repeatable utilities for inspecting the PDND
e-services graph model, testing it, exporting it, and keeping the
Zenodo paper aligned with the data.

| Script | npm command | Purpose |
|---|---|---|
| `audit-model.mjs` | `npm run audit` | Internal model audit |
| `compare-catalog.mjs` | `npm run compare-catalog` | Coverage against the live catalogue |
| `compute-paper-metrics.mjs` | `npm run paper-metrics` | LaTeX snippets for the paper |
| `test-model.mjs` | `npm test` | Model invariants and export checks |
| `export-graph.mjs` | `npm run export` | GraphML, GEXF and CSV in `exports/` |
| `update-data.mjs` | `npm run update-data` | Summary of the official catalogue |

All are pure ES modules, no dependencies, run with Node.js
(>= 18 for `fetch` support). They are idempotent and can be re-run
freely after any change to `src/data/pdnd-data.json`.

## 1. `audit-model.mjs` — internal model audit

Reads `src/data/pdnd-data.json` and produces a structural report:
node and e-service counts, e-services per provider, consumer
distribution, derived graph metrics, top-N rankings, and consistency
warnings (e.g. nodes declared as `Erogatore` that produce no
e-services).

```bash
node scripts/audit-model.mjs
```

The script also prints a "modelling note" reminding that each
`eservices[]` record stands for a service type, not a catalogue
endpoint. This is the convention used in METODOLOGIA.md §3.5 and is
the reason why the model's e-service count (312 in model v2) is not
comparable with the ~15,000 endpoints of the official catalogue.

Some warnings are expected in model v2: e-services without consumers
(no public data supports any edge for them, see METODOLOGIA.md §7)
and class nodes that only consume.

Run this every time you edit `pdnd-data.json` to catch silent
inconsistencies.

## 2. `compare-catalog.mjs` — comparison against the official catalogue

Downloads (or reads from a local file) the canonical
`eservice_a_catalogo.csv` published by `italia/pdnd-opendata`, and
compares it with the model:

- Total endpoints, by publication state.
- Endpoints by service type (heuristic substring match on the
  e-service name), so that "Albo Pretorio" and similar replicated
  services are counted in line with the aggregation rule.
- Top-30 producers in the catalogue.
- Coverage of catalogue producers by model nodes: how many endpoints
  are covered by a central/specific node, by one of the six
  individually modelled big municipalities, or subsumed by the
  aggregate node, and how many remain unmapped.
- Top-15 unmapped producers (candidates for inclusion or for an
  additional mapping rule).

```bash
# Default: download the CSV from raw.githubusercontent.com
node scripts/compare-catalog.mjs

# Or with a local copy of the CSV (useful when offline):
node scripts/compare-catalog.mjs --csv ./eservice_a_catalogo.csv
```

When the CSV cannot be downloaded the script exits with an error and
suggests the `--csv` fallback. A successful download is cached at
`./.cache-catalog.csv` next to the project root, so a second run does
not require network access.

Run this whenever you want a fresh baseline against the live PDND
catalogue, e.g. before a Zenodo paper release.

## 3. `compute-paper-metrics.mjs` — Zenodo paper helper

Generates the exact figures and tables for the paper, already
formatted as LaTeX/pgfplots snippets ready to be pasted into the
sources of `pdnd_graph_paper.tex`:

- Aggregate metrics block for Table 4.
- Out-degree and in-degree distribution coordinates for Figure 3.
- Top-7 providers and consumers coordinates for Figure 4.
- A "narrative inputs" section with the numbers used in the prose
  around the figures (top names, count of nodes appearing in both
  rankings, edge counts involving the aggregate node).

```bash
# Figures of the published paper (model v1, frozen snapshot)
node scripts/compute-paper-metrics.mjs src/data/snapshots/pdnd-data.2026-05-02.json

# Same figures on the live model v2
node scripts/compute-paper-metrics.mjs
```

The report on Zenodo (v1.0.0) describes model v1: pass the snapshot to
reproduce its numbers. Without arguments the script reads the live
`src/data/pdnd-data.json`, whose figures differ.

Run this before tagging a new release of the paper repository, copy
the generated snippets into the `.tex` source, then `make`.

## 4. `test-model.mjs` — model tests

Checks the invariants of both the frozen v1 snapshot and the live model:
referential integrity, declared provenance on every edge (`documentata`,
`osservata`, `certificata`, `ricostruita`, `inferita`), observed edges
carrying `connessioni` or `sessioni`, class nodes declaring `aderenti`,
preservation of every v1 provider→consumer pair, and that the files in
`exports/` are byte-identical to a fresh export.

```bash
npm test
```

## 5. `export-graph.mjs` — interchange formats

Writes GraphML, GEXF, node and edge CSV, and a README into `exports/`,
using the same functions as the Statistics tab of the app. The output is
deterministic: run it after every promotion, otherwise `npm test` fails.

```bash
npm run export
```

## 6. `update-data.mjs` — catalogue summary

Downloads the official catalogue and prints counts by state and by
producer, useful to spot new producers worth tracking.

## Notes

- All three scripts accept an explicit path to the JSON as their
  first positional argument, useful when running them from outside
  the repository root:

  ```bash
  node scripts/audit-model.mjs /elsewhere/pdnd-data.json
  ```

- The label heuristics in `compare-catalog.mjs` (service-type
  classification and producer-name matching) live at the top of the
  script. Edit them if a future release of the catalogue introduces
  new services or producers that should be folded into existing
  categories.
