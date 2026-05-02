# Audit and metrics scripts

This folder contains three repeatable utilities for inspecting the
PDND e-services graph model and for keeping the Zenodo paper aligned
with the data.

All three are pure ES modules, no dependencies, run with Node.js
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
endpoint. This is the convention used in METODOLOGIA.md §3.1 and is
the reason why the model contains 62 e-services while the official
PDND dashboard advertises 2,000+.

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
node scripts/compute-paper-metrics.mjs
```

Run this before tagging a new release of the paper repository, copy
the generated snippets into the `.tex` source, then `make`.

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
