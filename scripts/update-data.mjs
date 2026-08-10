#!/usr/bin/env node
/**
 * update-data.mjs
 * ───────────────
 * Scarica il CSV aggiornato dal repository ufficiale PDND open data
 * e genera un riepilogo degli e-services per categoria.
 *
 * Uso:   npm run update-data
 * Fonte: https://github.com/italia/pdnd-opendata
 *
 * NOTA: Questo script scarica il catalogo grezzo (2000+ entries).
 * I dati curati in src/data/pdnd-data.json sono mantenuti manualmente
 * perché aggregano i servizi comunali duplicati e mappano le relazioni
 * erogatore-fruitore che non sono esplicite nel CSV grezzo.
 *
 * Lo script serve come utilità per:
 * - Verificare quante API sono attive nel catalogo
 * - Scoprire nuovi erogatori centrali da aggiungere al grafo
 * - Generare statistiche aggiornate
 */

const CSV_URL =
  "https://raw.githubusercontent.com/italia/pdnd-opendata/main/data/eservice_a_catalogo.csv";

async function main() {
  console.log("📡 Scaricamento catalogo PDND...\n");

  const res = await fetch(CSV_URL);
  if (!res.ok) {
    console.error(`❌ Errore HTTP ${res.status}`);
    process.exit(1);
  }

  const text = await res.text();
  const lines = text.split("\n").filter((l) => l.trim());

  console.log(`✅ Scaricate ${lines.length - 1} righe\n`);

  // Parse CSV (gestione base — i campi con virgole sono tra virgolette)
  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length >= 6) {
      records.push({
        id: fields[0],
        name: fields[1],
        description: fields[2],
        technology: fields[3],
        producerId: fields[4],
        producerName: fields[5],
        state: fields[10] || "UNKNOWN",
      });
    }
  }

  // Statistiche per erogatore
  const byProducer = {};
  records.forEach((r) => {
    const key = r.producerName || "Sconosciuto";
    if (!byProducer[key]) byProducer[key] = { total: 0, published: 0 };
    byProducer[key].total++;
    if (r.state === "PUBLISHED") byProducer[key].published++;
  });

  const sorted = Object.entries(byProducer)
    .sort((a, b) => b[1].published - a[1].published);

  // Statistiche per tipo di servizio
  const serviceTypes = {};
  records.forEach((r) => {
    const name = r.name.toLowerCase();
    let type = "Altro";
    if (name.includes("albo pretorio")) type = "Albo Pretorio";
    else if (name.includes("suap")) type = "SUAP";
    else if (name.includes("civici") || name.includes("stradario")) type = "Civici/Stradario";
    else if (name.includes("protocollo")) type = "Protocollo";
    else if (name.includes("trasparente") || name.includes("legge 190")) type = "Trasparenza";
    else if (name.includes("welfare") || name.includes("waas")) type = "WaaS";
    else if (name.includes("demografic") || name.includes("soggett") || name.includes("famiglia")) type = "Demografici";
    else if (name.includes("tribut") || name.includes("imu") || name.includes("tari")) type = "Tributi";
    else if (name.includes("ifs0") || name.includes("accademic") || name.includes("titoli")) type = "Università (IFS)";
    else if (name.includes("i.pac") || name.includes("ipac")) type = "I.PaC (Cultura)";
    else if (name.includes("iot") || name.includes("sensor")) type = "IoT";
    serviceTypes[type] = (serviceTypes[type] || 0) + 1;
  });

  // Output
  console.log("═══════════════════════════════════════════════════");
  console.log("  RIEPILOGO CATALOGO PDND");
  console.log("═══════════════════════════════════════════════════\n");
  console.log(`  Totale API:       ${records.length}`);
  console.log(`  Pubblicate:       ${records.filter(r => r.state === "PUBLISHED").length}`);
  console.log(`  Sospese:          ${records.filter(r => r.state === "SUSPENDED").length}`);
  console.log(`  Enti erogatori:   ${Object.keys(byProducer).length}\n`);

  console.log("───────────────────────────────────────────────────");
  console.log("  TOP 30 EROGATORI (per API pubblicate)");
  console.log("───────────────────────────────────────────────────");
  sorted.slice(0, 30).forEach(([name, s], i) => {
    console.log(`  ${String(i + 1).padStart(2)}. ${name.substring(0, 45).padEnd(45)} ${String(s.published).padStart(4)} API`);
  });

  console.log("\n───────────────────────────────────────────────────");
  console.log("  DISTRIBUZIONE PER TIPO DI SERVIZIO");
  console.log("───────────────────────────────────────────────────");
  Object.entries(serviceTypes)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`  ${type.padEnd(25)} ${String(count).padStart(5)} API`);
    });

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  Per aggiornare il grafo, modifica:");
  console.log("  src/data/pdnd-data.json");
  console.log("═══════════════════════════════════════════════════\n");
}

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

main().catch(console.error);
