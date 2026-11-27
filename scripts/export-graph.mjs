#!/usr/bin/env node
/**
 * export-graph.mjs
 * ────────────────
 * Genera le esportazioni del modello nella cartella `exports/`, così i file
 * sono scaricabili direttamente dal repository e citabili senza dover aprire
 * l'applicazione o eseguire la pipeline.
 *
 * Uso:   npm run export
 *
 * I file prodotti derivano da src/data/pdnd-data.json, che resta il dato
 * canonico. Rigenerarli dopo ogni modifica del modello è responsabilità di chi
 * aggiorna il dato: il test `npm test` verifica che siano allineati.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { FORMATI } from "../src/utils/exportGraph.js";
import { serieStorica } from "../src/utils/networkHistory.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "exports");

const data = JSON.parse(
  fs.readFileSync(path.join(ROOT, "src/data/pdnd-data.json"), "utf8")
);

fs.mkdirSync(OUT, { recursive: true });

console.log("\nEsportazione del modello\n");
for (const f of FORMATI) {
  if (f.id === "json") continue; // il JSON canonico vive già in src/data
  const nome = `pdnd-eservices-graph-${f.id}.${f.estensione}`;
  const contenuto = f.genera(data);
  fs.writeFileSync(path.join(OUT, nome), contenuto, "utf8");
  console.log(`  ${nome.padEnd(42)} ${(contenuto.length / 1024).toFixed(1)} KB`);
}

const README = `# Esportazioni

Il modello del grafo in formati di interscambio standard, generati da
\`src/data/pdnd-data.json\` con \`npm run export\`.

| File | Formato | Aperto con |
|---|---|---|
| \`pdnd-eservices-graph-graphml.graphml\` | GraphML | Gephi, NetworkX, igraph, yEd |
| \`pdnd-eservices-graph-gexf.gexf\` | GEXF | Gephi |
| \`pdnd-eservices-graph-nodi-csv.csv\` | CSV | Fogli di calcolo, R, pandas |
| \`pdnd-eservices-graph-archi-csv.csv\` | CSV | Fogli di calcolo, R, pandas |

## Come leggere questi dati

Il grafo è diretto e pesato. Un arco da *a* a *b* significa che *a* eroga
almeno un e-service consumato da *b*; il peso è il numero di e-service distinti
che vanno da *a* a *b*.

Due avvertenze sono essenziali e sono riportate anche dentro i file.

Le coppie puntuali erogatore-fruitore **non sono pubblicate come open data**.
Gli archi sono ricostruiti da documentazione pubblica, dal campo
\`attributes.certified\` del catalogo e dalle statistiche ufficiali di
connessioni e sessioni, aggregate per categoria di ente. Il campo \`origine\`
di ogni arco ne dichiara la provenienza (\`documentata\`, \`osservata\`,
\`certificata\`, \`ricostruita\`, \`inferita\`). I campi \`connessioni\` e
\`sessioni\`, dove presenti, sono minimi garantiti: le classifiche ufficiali
elencano solo i primi 10 e-service per categoria.

I nodi con \`aggregato=true\` sono 10 classi di enti allineate alle categorie
ufficiali PagoPA (Comuni, Regioni, Scuole, Sanità e altre), con il numero di
aderenti nel campo \`aderenti\`: \`comuni_agg\`, per esempio, sta per circa 7.650
Comuni in un solo nodo. Le misure di grado e le distribuzioni calcolate su
questo grafo **non sono confrontabili** con quelle di un grafo in cui ogni ente
è un nodo distinto.

## Esempio

\`\`\`python
import networkx as nx

G = nx.read_graphml("pdnd-eservices-graph-graphml.graphml")
print(G.number_of_nodes(), G.number_of_edges())

# Enti che servono il maggior numero di controparti
for n, d in sorted(G.out_degree, key=lambda x: -x[1])[:5]:
    print(G.nodes[n]["label"], d)
\`\`\`

## Licenze e citazione

Questi file sono distribuiti con licenza **CC BY 4.0**
(https://creativecommons.org/licenses/by/4.0/deed.it): puoi riusarli e
modificarli citando il progetto e indicando le modifiche (vedi LICENSE-DATA.md).

Dati di origine: PDND Open Data (\`italia/pdnd-opendata\`), Presidenza del Consiglio
dei Ministri – Dipartimento per la Trasformazione Digitale, licenza CC0 1.0,
rielaborati da questo progetto. Codice AGPL-3.0-or-later.
Se usi questi file, cita il progetto: DOI 10.5281/zenodo.19989954.
`;

fs.writeFileSync(path.join(OUT, "README.md"), README, "utf8");
console.log(`  ${"README.md".padEnd(42)} ${(README.length / 1024).toFixed(1)} KB`);
console.log("\nScritti in exports/\n");

// Misure di rete nel tempo, dalle istantanee mensili e dal grafo attuale: la
// scheda Numeri legge questo file invece di scaricare tutte le istantanee.
const SNAP = path.join(ROOT, "src/data/snapshots");
const istantanee = fs.readdirSync(SNAP)
  .map((f) => /^pdnd-data\.(\d{4}-\d{2}-\d{2})\.json$/.exec(f))
  .filter(Boolean)
  .map(([f, d]) => ({ data: d, modello: JSON.parse(fs.readFileSync(path.join(SNAP, f), "utf8")) }));
const storia = serieStorica(istantanee, data);
fs.writeFileSync(path.join(ROOT, "src/data/network-history.json"), JSON.stringify(storia, null, 1) + "\n", "utf8");
console.log(`Misure di rete nel tempo: ${storia.serie.length} date in src/data/network-history.json\n`);
