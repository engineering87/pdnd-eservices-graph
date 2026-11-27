/**
 * Comunità della rete (metodo di Louvain, src/utils/communities.js): gruppi di
 * enti che si scambiano dati soprattutto fra loro. Ogni gruppo prende il nome
 * dai suoi enti più collegati; la quota di legami interni dice quanto il
 * gruppo è chiuso rispetto al resto della rete.
 */

import { useMemo, useState } from "react";
import PDND_DATA from "../data/pdnd-data.json";
import { comunitaDelModello, pesiNonOrientati } from "../utils/communities";
import { CATEGORY_COLORS } from "../constants/colors";
import { numero } from "../utils/format";

const ENTI = new Map(PDND_DATA.enti.map((e) => [e.id, e]));
const nome = (id) => ENTI.get(id)?.name.replace(" (aggregati)", "") || id;
const pct = (x) => `${Math.round(x * 100)}%`;

export default function CommunitiesCard({ onOpenEntity }) {
  const [escludiClassi, setEscludiClassi] = useState(false);
  const { q, gruppi } = useMemo(() => {
    const opzioni = { escludiAggregati: escludiClassi };
    const r = comunitaDelModello(PDND_DATA, opzioni);
    // Peso di ogni ente: numero di e-service che lo legano agli altri.
    const peso = new Map();
    for (const [a, b, w] of pesiNonOrientati(PDND_DATA, opzioni).archi) {
      peso.set(a, (peso.get(a) || 0) + w);
      peso.set(b, (peso.get(b) || 0) + w);
    }
    const gruppi = r.gruppi
      .filter((g) => g.membri.length > 1)
      .map((g) => ({ ...g, membri: [...g.membri].sort((a, b) => (peso.get(b) || 0) - (peso.get(a) || 0) || nome(a).localeCompare(nome(b), "it")) }));
    return { q: r.q, gruppi };
  }, [escludiClassi]);

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "20px 22px", flex: "1 1 100%", minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--acc-cyan)", textTransform: "uppercase", letterSpacing: .8, marginBottom: 6 }}>Comunità della rete</div>
      <p style={{ fontSize: 12.5, color: "var(--ink-muted)", lineHeight: 1.6, marginBottom: 12, maxWidth: 760 }}>
        Gruppi di enti che si scambiano dati soprattutto fra loro, trovati con il metodo di Louvain. Modularità{" "}
        <strong className="tabular" style={{ color: "var(--ink)" }}>{q.toLocaleString("it-IT", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</strong>:{" "}
        {q < 0.3
          ? "i gruppi esistono ma sono poco separati, perché i grandi erogatori servono quasi tutta la rete."
          : "i gruppi sono netti."}
      </p>
      <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--ink-muted)", cursor: "pointer", marginBottom: 14 }}>
        <input type="checkbox" checked={escludiClassi} onChange={(e) => setEscludiClassi(e.target.checked)} />
        Escludi le classi di enti
      </label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {gruppi.map((g, i) => {
          const interna = g.interni + g.esterni ? g.interni / (g.interni + g.esterni) : 0;
          return (
            <div key={g.membri[0]} style={{ flex: "1 1 260px", minWidth: 0, border: "1px solid var(--line)", borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink)", marginBottom: 2 }}>
                Gruppo {i + 1}: {g.membri.slice(0, 2).map(nome).join(", ")}
              </div>
              <div className="tabular" style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 8 }}>
                {numero(g.membri.length)} enti · legami interni {pct(interna)}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {g.membri.map((id) => (
                  <button key={id} type="button" onClick={() => onOpenEntity?.(id)} title={`Apri ${ENTI.get(id)?.name || id} nella mappa`}
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 7px", borderRadius: 10, border: "1px solid var(--line)", background: "transparent", color: "var(--ink-soft)", fontFamily: "inherit", fontSize: 11, cursor: "pointer" }}>
                    <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: CATEGORY_COLORS[ENTI.get(id)?.categoria] || "var(--ink-faint)" }} />
                    {nome(id)}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 12, lineHeight: 1.5 }}>
        Grafo non orientato: il legame fra due enti pesa quanto il numero di e-service che li collegano, in un verso o nell'altro.
        Legami interni: quota del peso di un gruppo che resta dentro il gruppo. Con pochi gruppi poco separati, piccole variazioni
        nei dati possono spostare un ente da un gruppo all'altro.
      </div>
    </div>
  );
}
