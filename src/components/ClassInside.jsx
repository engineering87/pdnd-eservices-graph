/**
 * Dentro la classe: cosa c'è in un nodo aggregato della mappa. Mostra i tipi di
 * ente che compongono la classe (sottotipi di pipeline/classi.json) con il
 * numero di aderenti e gli e-service abilitati solo a quel tipo, poi gli enti
 * della classe dall'elenco ufficiale, con chi pubblica più e-service e una
 * ricerca che porta alla scheda «Il tuo ente».
 *
 * L'elenco degli aderenti si scarica solo quando si apre questa sezione.
 */

import { useEffect, useMemo, useState } from "react";
import PDND_DATA from "../data/pdnd-data.json";
import { numero } from "../utils/format";

const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** E-service abilitati dal catalogo solo ad alcuni tipi di ente della classe. */
function serviziPerSottotipo(classe) {
  const per = new Map();
  for (const s of PDND_DATA.eservices) {
    const a = (s.archi || []).find((x) => x.fruitore === classe && x.sottotipi);
    if (!a) continue;
    for (const t of a.sottotipi) per.set(t, [...(per.get(t) || []), s]);
  }
  return per;
}

const titoletto = { fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: .8, margin: "4px 0 8px" };
const link = { background: "none", border: "none", padding: 0, color: "inherit", font: "inherit", textAlign: "left", cursor: "pointer", textDecoration: "underline", textDecorationColor: "var(--underline)", textUnderlineOffset: 2 };

export default function ClassInside({ nodo, onOpenAderente, onOpenEservice, aperta, onToggleAperta }) {
  const [aperto, setAperto] = useState(false);
  const [indice, setIndice] = useState(null);
  const [tipo, setTipo] = useState("");
  const [q, setQ] = useState("");
  const sottotipi = nodo.sottotipi || [];
  const specifici = useMemo(() => serviziPerSottotipo(nodo.id), [nodo.id]);

  useEffect(() => {
    if (!aperto || indice) return;
    let vivo = true;
    import("../data/aderenti-index.json").then((mod) => { if (vivo) setIndice(mod.default); }).catch(() => {});
    return () => { vivo = false; };
  }, [aperto, indice]);

  const membri = useMemo(() => (indice ? indice.enti.filter((r) => r[2] === nodo.id) : []), [indice, nodo.id]);
  const filtrati = useMemo(() => membri.filter((r) => !tipo || r[6] === tipo), [membri, tipo]);
  const editori = useMemo(() => [...filtrati].filter((r) => r[4] > 0).sort((a, b) => b[4] - a[4] || a[0].localeCompare(b[0], "it")).slice(0, 5), [filtrati]);
  const trovati = useMemo(() => {
    const t = norm(q.trim());
    return t.length < 2 ? [] : filtrati.filter((r) => norm(`${r[0]} ${r[1]}`).includes(t)).slice(0, 8);
  }, [filtrati, q]);
  const maxSotto = Math.max(1, ...sottotipi.map((t) => t.aderenti));

  return (
    <div style={{ marginBottom: 16, padding: "10px 12px", borderRadius: 8, background: "var(--card-inset)", border: "1px solid var(--line)" }}>
      <button type="button" onClick={() => setAperto((x) => !x)} aria-expanded={aperto}
        style={{ ...link, textDecoration: "none", display: "flex", justifyContent: "space-between", width: "100%", fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
        <span>Dentro la classe</span><span aria-hidden="true" style={{ color: "var(--ink-faint)" }}>{aperto ? "▴" : "▾"}</span>
      </button>

      {aperto && (
        <div style={{ marginTop: 10 }}>
          {sottotipi.length > 1 ? (
            <>
              <div style={titoletto}>Tipi di ente</div>
              {sottotipi.map((t) => {
                const sel = tipo === t.id, n = specifici.get(t.id)?.length || 0;
                return (
                  <button key={t.id} type="button" onClick={() => setTipo(sel ? "" : t.id)} aria-pressed={sel}
                    title={sel ? "Mostra tutti i tipi" : `Mostra solo: ${t.nome}`}
                    style={{ display: "block", width: "100%", textAlign: "left", background: sel ? "var(--pa-blue-soft)" : "none", border: "none", borderRadius: 4, padding: "4px 6px", marginBottom: 2, cursor: "pointer", fontFamily: "inherit", color: "var(--ink-soft)" }}>
                    <span style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 11.5 }}>
                      <span>{t.nome}</span><span className="tabular" style={{ color: "var(--ink-muted)" }}>{numero(t.aderenti)}</span>
                    </span>
                    <span style={{ display: "block", height: 4, background: "var(--track)", borderRadius: 2, marginTop: 3 }}>
                      <span style={{ display: "block", height: "100%", width: `${(t.aderenti / maxSotto) * 100}%`, background: "var(--pa-blue)", borderRadius: 2 }} />
                    </span>
                    {n > 0 && <span style={{ display: "block", fontSize: 10, color: "var(--ink-faint)", marginTop: 2 }}>{n} e-service abilitati solo a questo tipo</span>}
                  </button>
                );
              })}
              {tipo && specifici.get(tipo)?.length > 0 && (
                <div style={{ margin: "6px 0 4px", fontSize: 11 }}>
                  {specifici.get(tipo).map((s) => (
                    <div key={s.id} style={{ padding: "2px 0" }}>
                      <button type="button" style={link} onClick={() => onOpenEservice?.(s.id)}>{s.nome}</button>
                    </div>
                  ))}
                </div>
              )}
              {onToggleAperta && (
                <button type="button" onClick={onToggleAperta}
                  style={{ marginTop: 8, padding: "6px 10px", borderRadius: 6, border: "1px solid var(--pa-blue)", background: "var(--pa-blue-soft)", color: "var(--ink)", fontFamily: "inherit", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>
                  {aperta ? "Richiudi la classe nella mappa" : "Apri nella mappa per tipo di ente"}
                </button>
              )}
              <div style={{ fontSize: 10, color: "var(--ink-faint)", margin: "6px 0 10px", lineHeight: 1.5 }}>
                Aderenti contati sull'elenco ufficiale per attributo certificato: la somma può differire dal totale della classe.
              </div>
            </>
          ) : (
            <div style={{ fontSize: 11, color: "var(--ink-muted)", marginBottom: 10, lineHeight: 1.5 }}>Nel catalogo la classe corrisponde a un solo tipo di ente.</div>
          )}

          {!indice ? <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>Caricamento dell'elenco…</div> : membri.length === 0 ? (
            <div style={{ fontSize: 11, color: "var(--ink-muted)", lineHeight: 1.5 }}>
              Gli enti di questa classe non hanno codice IPA e non sono elencati uno per uno: fra loro ci sono ditte e società
              che portano il nome di persone fisiche. Sono contati nei totali.
            </div>
          ) : (
            <>
              <div style={titoletto}>Chi pubblica più e-service</div>
              {editori.length === 0 && <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>Nessun ente di questo tipo pubblica e-service.</div>}
              {editori.map((r) => (
                <div key={r[0] + r[1]} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 11.5, padding: "2px 0" }}>
                  <button type="button" style={link} onClick={() => onOpenAderente?.(r[1] || r[0])}>{r[0]}</button>
                  <span className="tabular" style={{ color: "var(--ink-muted)", whiteSpace: "nowrap" }}>{numero(r[4])}</span>
                </div>
              ))}
              <label htmlFor={`cerca-${nodo.id}`} style={{ ...titoletto, display: "block", marginTop: 12 }}>
                Cerca fra {numero(filtrati.length)} enti
              </label>
              <input id={`cerca-${nodo.id}`} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome o codice IPA"
                style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border-strong)", background: "var(--input)", color: "var(--ink)", fontFamily: "inherit", fontSize: 12 }} />
              {trovati.map((r) => (
                <div key={r[0] + r[1]} style={{ fontSize: 11.5, padding: "3px 0" }}>
                  <button type="button" style={link} onClick={() => onOpenAderente?.(r[1] || r[0])}>{r[0]}</button>
                </div>
              ))}
              <div style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 8, lineHeight: 1.5 }}>
                L'uso dei servizi è pubblicato per tipo di ente: i legami della mappa valgono per la classe, non per il singolo ente.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
