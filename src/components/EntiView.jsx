/**
 * Il tuo ente: ricerca fra tutti gli aderenti alla PDND, non solo i nodi della
 * mappa. Per l'ente scelto mostra la classe di appartenenza, gli e-service che
 * pubblica e, per il suo tipo di ente, i servizi usati e quelli abilitati.
 *
 * L'indice degli aderenti (src/data/aderenti-index.json, generato dalla
 * pipeline) si scarica solo all'apertura di questa vista. L'ente scelto resta
 * nell'indirizzo (?ente=codice IPA, o il nome se manca), così la scheda si può condividere.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import PDND_DATA from "../data/pdnd-data.json";
import { numero, breve, dataLunga } from "../utils/format";
import { useIsMobile } from "../utils/useIsMobile";
import Termine from "./Termine";

const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
const NOMI_MODELLO = new Map(PDND_DATA.enti.map((e) => [e.id, e.name]));
const ES_MODELLO = new Set(PDND_DATA.eservices.map((s) => s.id));

/** Servizi del modello usati da un nodo (ente a sé o classe), per provenienza. */
function serviziPerNodo(nodo) {
  const usati = [], abilitati = [];
  for (const s of PDND_DATA.eservices) {
    const a = (s.archi || []).find((x) => x.fruitore === nodo);
    if (!a) continue;
    const voce = { id: s.id, nome: s.nome, erogatore: NOMI_MODELLO.get(s.erogatore) || s.erogatore, sessioni: a.sessioni ?? null, connessioni: a.connessioni ?? null };
    if (a.origine === "osservata" || a.origine === "documentata") usati.push(voce);
    else if (a.origine === "certificata") abilitati.push(voce);
  }
  usati.sort((x, y) => (y.sessioni ?? -1) - (x.sessioni ?? -1) || (y.connessioni ?? -1) - (x.connessioni ?? -1));
  abilitati.sort((x, y) => x.erogatore.localeCompare(y.erogatore, "it") || x.nome.localeCompare(y.nome, "it"));
  return { usati, abilitati };
}

const box = { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "16px 18px", marginBottom: 14 };
const titoletto = { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: .7, color: "var(--ink-muted)", marginBottom: 10 };
const link = { background: "none", border: "none", padding: 0, color: "var(--ink-soft)", cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", textAlign: "left", textDecoration: "underline", textDecorationColor: "var(--underline)", textUnderlineOffset: 2 };
const azione = { padding: "7px 12px", borderRadius: 6, border: "1px solid var(--pa-blue)", background: "var(--pa-blue-soft)", color: "var(--ink)", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, cursor: "pointer" };

function leggiQuery() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("ente") || "";
}

export default function EntiView({ onOpenEntity, onOpenEservice, onExplore }) {
  const m = useIsMobile();
  const [indice, setIndice] = useState(null);
  const [errore, setErrore] = useState(null);
  const [q, setQ] = useState(leggiQuery);
  const [scelto, setScelto] = useState(null);
  const campo = useRef(null);

  useEffect(() => {
    let vivo = true;
    import("../data/aderenti-index.json")
      .then((mod) => {
        if (!vivo) return;
        setIndice(mod.default);
        // Un link condiviso (?ente=nome) apre direttamente la scheda.
        const iniziale = leggiQuery();
        const trovato = iniziale && (mod.default.enti.find((r) => r[1] === iniziale) || mod.default.enti.find((r) => norm(r[0]) === norm(iniziale)));
        if (trovato) { setScelto(trovato); setQ(trovato[0]); }
      })
      .catch(() => { if (vivo) setErrore("Impossibile caricare l'elenco degli aderenti."); });
    campo.current?.focus();
    return () => { vivo = false; };
  }, []);

  const righe = useMemo(() => (indice ? indice.enti.map((r) => ({ r, chiave: norm(`${r[0]} ${r[1]}`) })) : []), [indice]);

  // Ente scelto -> indirizzo, senza aggiungere voci alla cronologia.
  // Si aspetta l'indice: prima, un link condiviso non è ancora stato letto.
  useEffect(() => {
    if (!indice) return;
    const p = new URLSearchParams(window.location.search);
    if (scelto) p.set("ente", scelto[1] || scelto[0]); else p.delete("ente");
    const qs = p.toString();
    const url = window.location.pathname + (qs ? `?${qs}` : "");
    if (url !== window.location.pathname + window.location.search) window.history.replaceState({}, "", url);
  }, [indice, scelto]);

  const risultati = useMemo(() => {
    const t = norm(q);
    if (t.length < 2) return [];
    const parole = t.split(" ");
    const trovati = righe.filter(({ chiave }) => parole.every((p) => chiave.includes(p)));
    // Prima chi inizia con il testo cercato, poi i nomi più corti.
    trovati.sort((a, b) => (b.chiave.startsWith(t) - a.chiave.startsWith(t)) || a.r[0].length - b.r[0].length);
    return trovati.slice(0, 25).map((x) => x.r);
  }, [q, righe]);

  const classi = indice?.classi || {};
  // Un ente con un nodo proprio ha i suoi dati; gli altri quelli della classe.
  const nodoUso = scelto ? scelto[3] || scelto[2] : null;
  const proprio = Boolean(scelto?.[3]);
  const servizi = useMemo(() => (nodoUso ? serviziPerNodo(nodoUso) : null), [nodoUso]);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: m ? "16px 14px" : "24px 28px" }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <div style={{ fontSize: 11, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Il tuo ente</div>
        <h2 style={{ fontSize: m ? 19 : 23, fontWeight: 700, color: "var(--ink-strong)", marginBottom: 6 }}>Cerca un ente aderente alla PDND</h2>
        <p style={{ fontSize: 13, color: "var(--ink-muted)", lineHeight: 1.6, maxWidth: 760, marginBottom: 16 }}>
          Comuni, scuole, aziende sanitarie, università, gestori di servizi pubblici: tutti gli enti pubblici dell'elenco
          ufficiale, non solo quelli rappresentati nella mappa. Per ogni ente vedi il tipo di ente, gli <Termine id="eservice">e-service</Termine> che
          pubblica e i servizi usati dagli enti del suo tipo.
        </p>

        <label htmlFor="cerca-ente" style={{ display: "block", fontSize: 11, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: .6, marginBottom: 6 }}>Nome o codice IPA</label>
        <input id="cerca-ente" ref={campo} type="search" value={q} autoComplete="off"
          placeholder="Per esempio: Comune di Lecce, Liceo, ASL, c_e506"
          onChange={(e) => { setQ(e.target.value); setScelto(null); }}
          onKeyDown={(e) => { if (e.key === "Enter" && risultati[0]) setScelto(risultati[0]); }}
          aria-describedby="cerca-ente-stato"
          style={{ width: "100%", maxWidth: 560, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-strong)", background: "var(--input)", color: "var(--ink)", fontFamily: "inherit", fontSize: 15 }} />
        <div id="cerca-ente-stato" role="status" style={{ fontSize: 12, color: "var(--ink-faint)", margin: "8px 0 16px" }}>
          {errore || (!indice ? "Caricamento dell'elenco…"
            : scelto ? null
            : norm(q).length < 2 ? `${numero(indice.enti.length)} enti con codice IPA nell'elenco ufficiale al ${dataLunga(indice.meta.data)}. Scrivi almeno due lettere.`
            : `${risultati.length === 25 ? "Primi 25 risultati" : `${risultati.length} risultati`}${risultati.length ? ": Invio apre il primo" : ""}.`)}
        </div>

        {!scelto && risultati.length > 0 && (
          <ul style={{ listStyle: "none", ...box, padding: 6 }}>
            {risultati.map((r) => (
              <li key={`${r[0]}|${r[1]}`}>
                <button type="button" onClick={() => setScelto(r)}
                  style={{ display: "flex", justifyContent: "space-between", gap: 12, width: "100%", padding: "9px 10px", background: "none", border: "none", borderBottom: "1px solid var(--line)", color: "var(--ink)", fontFamily: "inherit", fontSize: 13.5, textAlign: "left", cursor: "pointer" }}>
                  <span>{r[0]}{r[3] && <span style={{ marginLeft: 8, fontSize: 11, color: "var(--pa-blue)" }}>nella mappa</span>}</span>
                  <span style={{ fontSize: 11.5, color: "var(--ink-faint)", whiteSpace: "nowrap" }}>{classi[r[2]]?.replace(" (aggregati)", "") || "—"}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {scelto && (
          <article aria-labelledby="ente-scelto">
            <button type="button" onClick={() => { setScelto(null); campo.current?.focus(); }} style={{ ...link, textDecoration: "none", color: "var(--ink-faint)", fontSize: 12, marginBottom: 10 }}>← Torna ai risultati</button>
            <div style={box}>
              <h3 id="ente-scelto" style={{ fontSize: m ? 18 : 21, fontWeight: 700, color: "var(--ink-strong)", marginBottom: 6 }}>{scelto[0]}</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 18px", fontSize: 13, color: "var(--ink-muted)", marginBottom: 12 }}>
                {scelto[1] && <span>Codice IPA <code className="tabular" style={{ color: "var(--ink)" }}>{scelto[1]}</code></span>}
                <span>{proprio ? <>Nella mappa: <strong style={{ color: "var(--ink)" }}>nodo proprio</strong></> : <>Tipo di ente: <strong style={{ color: "var(--ink)" }}>{classi[scelto[2]]?.replace(" (aggregati)", "") || "non classificato"}</strong></>}</span>
                <span>E-service pubblicati: <strong style={{ color: "var(--ink)" }}>{numero(scelto[4])}</strong></span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {scelto[3] && <button type="button" style={azione} onClick={() => onOpenEntity(scelto[3])}>Apri nella mappa</button>}
                {scelto[2] && !proprio && <button type="button" style={azione} onClick={() => onOpenEntity(scelto[2])}>Vedi la sua classe nella mappa</button>}
                {nodoUso && <button type="button" style={azione} onClick={() => onExplore(`fruitore=${nodoUso}&per=erogatore`)}>{proprio ? "Servizi che usa" : "Relazioni della classe"}</button>}
              </div>
              {!scelto[3] && (
                <p style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 10, lineHeight: 1.55 }}>
                  Nella mappa questo ente non è un nodo a sé: è compreso nella <Termine id="classe">classe</Termine> del suo tipo.
                </p>
              )}
            </div>

            {scelto[4] > 0 && (
              <div style={box}>
                <div style={titoletto}>E-service che pubblica ({numero(scelto[4])})</div>
                <ul style={{ listStyle: "none" }}>
                  {scelto[5].map(([id8, nome]) => {
                    const idModello = scelto[3] && `${scelto[3]}_${id8}`;
                    return (
                      <li key={id8 + nome} style={{ fontSize: 13, padding: "5px 0", borderBottom: "1px solid var(--line)" }}>
                        {idModello && ES_MODELLO.has(idModello)
                          ? <button type="button" style={link} onClick={() => onOpenEservice(idModello)}>{nome}</button>
                          : <span style={{ color: "var(--ink-soft)" }}>{nome}</span>}
                      </li>
                    );
                  })}
                </ul>
                {scelto[4] > scelto[5].length && <div style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 8 }}>e altri {numero(scelto[4] - scelto[5].length)} nel catalogo ufficiale.</div>}
              </div>
            )}

            {servizi && (
              <div style={box}>
                <div style={titoletto}>{proprio ? "Servizi che usa" : "Servizi usati dagli enti di questo tipo"}</div>
                {servizi.usati.length === 0 && <div style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>Nessun dato d'uso pubblicato{proprio ? " per questo ente" : " per questo tipo di ente"}.</div>}
                {servizi.usati.slice(0, 10).map((s) => (
                  <div key={s.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, padding: "5px 0", borderBottom: "1px solid var(--line)" }}>
                    <span style={{ minWidth: 0 }}>
                      <button type="button" style={link} onClick={() => onOpenEservice(s.id)}>{s.nome}</button>
                      <span style={{ display: "block", fontSize: 11, color: "var(--ink-faint)" }}>{s.erogatore}</span>
                    </span>
                    <span className="tabular" style={{ fontSize: 12, color: "var(--ink-muted)", whiteSpace: "nowrap", textAlign: "right" }}>
                      {s.sessioni != null ? `${breve(s.sessioni)} sessioni` : s.connessioni != null ? `${numero(s.connessioni)} enti` : ""}
                    </span>
                  </div>
                ))}
                {servizi.abilitati.length > 0 && (
                  <p style={{ fontSize: 12.5, color: "var(--ink-muted)", marginTop: 12 }}>
                    {proprio ? "L'ente è inoltre" : "Gli enti di questo tipo sono inoltre"} <Termine id="certificata">{proprio ? "abilitato" : "abilitati"}</Termine> dal catalogo a {numero(servizi.abilitati.length)} altri
                    e-service della mappa, senza dati d'uso pubblicati.
                  </p>
                )}
                <p style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 10, lineHeight: 1.55 }}>
                  {proprio ? "Dati d'uso dalle classifiche ufficiali e dalle fonti documentate." : "I dati d'uso ufficiali sono pubblicati per tipo di ente: la PDND non rende pubblico quali servizi usa il singolo ente."}{" "}
                  Valori minimi garantiti, dalle classifiche dei primi 10 e-service per categoria.
                </p>
              </div>
            )}
          </article>
        )}

        <p style={{ fontSize: 11, color: "var(--ink-faint)", lineHeight: 1.55, marginTop: 6 }}>
          Fonte: elenco degli aderenti e catalogo degli e-service di PagoPA (italia/pdnd-opendata, CC0 1.0). Sono elencati
          gli aderenti con codice IPA, compresi uffici e articolazioni interne registrati come aderenti a sé. Imprese e altri
          soggetti privati sono contati nella loro classe ma non elencati uno per uno: fra loro ci sono ditte e società che
          portano il nome di persone fisiche.
        </p>
      </div>
    </div>
  );
}
