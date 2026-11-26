/**
 * Vista del grafo: simulazione a forze e disegno su canvas 2D.
 *
 * Il componente tiene la selezione allineata all'URL nelle due direzioni, così
 * ogni ente è indirizzabile. Le posizioni dei nodi sono mutate in posto dalla
 * simulazione e lette dal ciclo di disegno tramite ref, per evitare un render
 * di React a ogni fotogramma.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import PDND_DATA from "../data/pdnd-data.json";
import { CATEGORY_COLORS, ORIGIN_STYLES } from "../constants/colors";
import { ORIGINI } from "../utils/relations";
import { buildGraph } from "../utils/buildGraph";
import ClassInside from "./ClassInside";
import { apriClassi, classiApribili, legamiAppartenenza } from "../utils/expandClasses";
import { gR, mkSim, posizioneDaId } from "../utils/layout";
import { useIsMobile } from "../utils/useIsMobile";


// Tavolozze del canvas per i due temi. Il canvas non legge le variabili CSS:
// i colori degli archi, delle etichette e dei contorni vivono qui. Sul tema
// chiaro archi ed etichette sono più scuri e più opachi, per restare leggibili.
const TAVOLOZZE = {
  dark: {
    sfondo: ["rgba(20,28,50,.3)", "rgba(10,14,26,0)"],
    evidenziato: (a) => `rgba(200,220,255,${a})`, alone: "rgba(100,180,255,.3)", freccia: "rgba(200,220,255,.5)",
    attenuato: "rgba(100,120,140,.04)",
    osservato: (w) => `rgba(79,195,247,${.14 + w * .04})`,
    normale: (w) => `rgba(100,160,220,${.08 + w * .03})`,
    nodoSpento: "rgba(40,50,65,.15)",
    bordoSel: "#fff", bordoHov: "rgba(255,255,255,.8)", riflesso: "rgba(255,255,255,.12)",
    bordoBadge: "rgba(10,14,26,.6)",
    fondoEtichetta: "rgba(10,14,26,.8)", etichetta: "#cbd5e1", etichettaAttiva: "#fff",
  },
  light: {
    sfondo: ["rgba(190,208,232,.35)", "rgba(244,247,251,0)"],
    evidenziato: (a) => `rgba(15,40,90,${Math.min(.9, a + .1)})`, alone: "rgba(11,95,204,.25)", freccia: "rgba(15,40,90,.65)",
    attenuato: "rgba(60,80,110,.06)",
    osservato: (w) => `rgba(3,105,161,${.28 + w * .05})`,
    normale: (w) => `rgba(40,80,140,${.16 + w * .04})`,
    nodoSpento: "rgba(100,116,139,.18)",
    bordoSel: "#0f172a", bordoHov: "rgba(15,23,42,.7)", riflesso: "rgba(255,255,255,.35)",
    bordoBadge: "rgba(255,255,255,.95)",
    fondoEtichetta: "rgba(255,255,255,.9)", etichetta: "#1e293b", etichettaAttiva: "#0b1220",
  },
};

// Famiglie di categorie per la legenda: venti voci in fila non si leggono.
const FAMIGLIE = [
  ["Amministrazione centrale", ["Ministero", "Fisco", "Previdenza", "Lavoro", "Digitale", "Trasporti", "Anticorruzione", "Imprese", "Cultura", "Statistica", "Tecnologia", "Società pubblica", "Ordini"]],
  ["Territorio", ["Regione", "Comune"]],
  ["Classi di enti", ["Regioni Aggregate", "Comuni Aggregati", "Classi aggregate"]],
];


// Viste predefinite sulla provenienza degli archi. "Fonti ufficiali" tiene le
// prove ancorate a un dato pubblico puntuale o aggregato; "Senza stime" toglie
// solo le inferenze AI.
const VISTE_ARCHI = [
  { id: "tutti", label: "Tutti gli archi", origini: ORIGINI },
  { id: "osservata", label: "Solo uso osservato", origini: ["osservata"] },
  { id: "ufficiali", label: "Solo fonti ufficiali", origini: ["documentata", "osservata", "certificata"] },
  { id: "senza-stime", label: "Senza stime AI", origini: ["documentata", "osservata", "certificata", "ricostruita"] },
];


// Risoluzione del canvas. Tutto il disegno lavora in unità logiche pari al
// doppio dei pixel CSS (le misure di nodi, etichette e pannello sono pensate
// così); il buffer del canvas invece ha i pixel reali dello schermo, al massimo
// il doppio. Su uno schermo a densità 1 il canvas ha un quarto dei pixel di
// prima, con la stessa resa.
// Si legge a ogni ridimensionamento: cambia con lo zoom del browser o
// spostando la finestra su un altro schermo.
const risoluzione = () => (typeof window === "undefined" ? 2 : Math.min(2, Math.max(1, window.devicePixelRatio || 1)));
const logico = (cv) => ({ width: cv.clientWidth * 2, height: cv.clientHeight * 2 });

// Trasformazione che porta un nodo al centro della zona libera: il pannello
// dettagli copre 330 px a destra su desktop e la parte bassa su smartphone.
function bersaglioCentrato(canvas, kAttuale, nd) {
  const cv = logico(canvas);
  const k = Math.max(kAttuale, 1.1);
  const mobile = window.innerWidth < 768;
  const cx = mobile ? cv.width / 2 : (cv.width - 660) / 2;
  const cy = mobile ? cv.height * .22 : cv.height / 2;
  return { k, x: cx - nd.x * k, y: cy - nd.y * k };
}

// Nomi degli enti per i suggerimenti della ricerca.
const NOMI_ENTI = PDND_DATA.enti.map((e) => e.name).sort((a, b) => a.localeCompare(b, "it"));

// Preferenza di sistema "riduci movimento": niente animazioni di spostamento.
const MOTO_RIDOTTO = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Trasformazione che fa entrare tutti i nodi nel canvas, con un margine per
// le etichette, in unità logiche (2 × px CSS).
function calcolaInquadratura(nodes, canvas) {
  const cv = logico(canvas);
  const pronti = nodes.filter(n => Number.isFinite(n.x));
  if (!pronti.length || !cv.width) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  pronti.forEach(n => { const r = gR(n); x0 = Math.min(x0, n.x - r); y0 = Math.min(y0, n.y - r); x1 = Math.max(x1, n.x + r); y1 = Math.max(y1, n.y + r + 18); });
  const margine = 60;
  const k = Math.max(.15, Math.min(2.5, Math.min((cv.width - margine * 2) / (x1 - x0 || 1), (cv.height - margine * 2) / (y1 - y0 || 1))));
  return { k, x: cv.width / 2 - ((x0 + x1) / 2) * k, y: cv.height / 2 - ((y0 + y1) / 2) * k };
}

// Sfumature dei nodi (alone e corpo) disegnate una volta su un piccolo canvas
// e poi copiate: creare due gradienti radiali per nodo a ogni fotogramma era
// la parte più costosa del disegno. Contorno e riflesso restano vettoriali,
// così restano nitidi anche con lo zoom.
const SPRITE = new Map();
const SPRITE_SCALA = 2;
function spriteNodo(col, r) {
  const chiave = `${col}|${r.toFixed(1)}`;
  let c = SPRITE.get(chiave);
  if (c) return c;
  const lato = Math.ceil(4 * r * SPRITE_SCALA);
  c = document.createElement("canvas");
  c.width = c.height = lato;
  const g = c.getContext("2d");
  g.scale(SPRITE_SCALA, SPRITE_SCALA);
  const o = 2 * r;
  const alone = g.createRadialGradient(o, o, r, o, o, r * 2);
  alone.addColorStop(0, col + "12"); alone.addColorStop(1, col + "00");
  g.beginPath(); g.arc(o, o, r * 2, 0, Math.PI * 2); g.fillStyle = alone; g.fill();
  const corpo = g.createRadialGradient(o - r * .35, o - r * .35, 0, o, o, r);
  corpo.addColorStop(0, lgt(col, 60)); corpo.addColorStop(.7, col); corpo.addColorStop(1, lgt(col, -20));
  g.beginPath(); g.arc(o, o, r, 0, Math.PI * 2); g.fillStyle = corpo; g.fill();
  SPRITE.set(chiave, c);
  return c;
}

// Larghezza delle etichette misurata una volta a 100 px e poi scalata: la
// larghezza del testo è proporzionale alla dimensione del carattere.
const LARGHEZZE = new Map();
function larghezzaEtichetta(ctx, testo, fs) {
  let w = LARGHEZZE.get(testo);
  if (w == null) {
    const prima = ctx.font;
    ctx.font = "600 100px 'Titillium Web',-apple-system,sans-serif";
    w = ctx.measureText(testo).width;
    ctx.font = prima;
    LARGHEZZE.set(testo, w);
  }
  return (w * fs) / 100;
}

// Un solo tratto per coppia di enti e provenienza: gli archi di più e-service
// fra gli stessi due enti cadono sulla stessa curva, e lo spessore porta già il
// loro numero. Prima ogni e-service era un tratto a sé, uno sopra l'altro.
function archiDaDisegnare(links) {
  const visti = new Map();
  for (const l of links) {
    const k = `${l.source.id}>${l.target.id}>${l.origine}`;
    if (!visti.has(k)) visti.set(k, l);
  }
  return [...visti.values()];
}

// Classi aperte nei loro tipi di ente (src/utils/expandClasses.js). Anche
// questa scelta vive nella query string (?aperte=sanita_agg), come il filtro.
const APRIBILI = new Set(classiApribili(PDND_DATA));
function leggiAperte() {
  if (typeof window === "undefined") return new Set();
  const p = new URLSearchParams(window.location.search).get("aperte");
  return new Set((p || "").split(",").filter((id) => APRIBILI.has(id)));
}

// Grafo da disegnare: il modello con le classi aperte, più i legami di
// appartenenza fra una classe aperta e i suoi tipi di ente.
function costruisciVista(aperte) {
  const modello = apriClassi(PDND_DATA, aperte);
  const g = buildGraph(modello);
  return { ...g, links: [...g.links, ...legamiAppartenenza(modello)] };
}

// Archi con id di erogatore e fruitore, mai mutati dalla simulazione.
const archiDi = (vista) => vista.links.filter((l) => l.origine !== "appartenenza").map((l) => ({ source: l.source, target: l.target, origine: l.origine }));

function vistaDi(origini) {
  const chiave = [...origini].sort().join(",");
  return VISTE_ARCHI.find((v) => [...v.origini].sort().join(",") === chiave)?.id || "personalizzata";
}

// Il filtro vive nella query string (?archi=osservata,certificata), così una
// vista filtrata del grafo si può condividere.
function leggiOrigini() {
  if (typeof window === "undefined") return new Set(ORIGINI);
  const p = new URLSearchParams(window.location.search).get("archi");
  const lista = (p || "").split(",").filter((o) => ORIGINI.includes(o));
  return new Set(lista.length ? lista : ORIGINI);
}

function lgt(hex, amount) {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgb(${Math.max(0, Math.min(255, (n >> 16) + amount))},${Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amount))},${Math.max(0, Math.min(255, (n & 0xff) + amount))})`;
}

export default function GraphView({ entityId = null, onEntityChange, onOpenEservice, onOpenAderente, tema = "dark" }) {
  const P = TAVOLOZZE[tema] || TAVOLOZZE.dark;
  const m = useIsMobile();
  const canvasRef = useRef(null);
  const [dim, setDim] = useState({ w: 960, h: 700 });
  const [selNode, setSelNode] = useState(null);
  const [hovNode, setHovNode] = useState(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("Tutte");
  const [copiato, setCopiato] = useState(false);
  const [origini, setOrigini] = useState(leggiOrigini);
  const filtroArchi = origini.size < ORIGINI.length;
  const simRef = useRef(null);
  const nodesRef = useRef([]);
  const linksRef = useRef([]);
  const tRef = useRef({ x: 0, y: 0, k: 1.5 });
  const dragRef = useRef(null);
  const panRef = useRef(null);
  const afRef = useRef(null);
  const lcRef = useRef({});
  const disegnoRef = useRef([]);
  // Disegno su richiesta: il ciclo di fotogrammi gira solo mentre qualcosa si
  // muove (simulazione, animazione dell'inquadratura, trascinamento) e si
  // ferma a mappa immobile. ridisegna() lo riavvia.
  const drawRef = useRef(null);
  const ridisegnaRef = useRef(() => {});
  const ridisegna = () => ridisegnaRef.current();
  const [aperte, setAperte] = useState(leggiAperte);
  const [vistaIniziale] = useState(() => costruisciVista(aperte));
  const graph = useRef(vistaIniziale);
  const archiBase = useMemo(() => archiDi(costruisciVista(aperte)), [aperte]);
  const totLegami = useMemo(() => new Set(archiBase.map((l) => `${l.source}->${l.target}`)).size, [archiBase]);
  const cats = useMemo(() => ["Tutte", ...new Set(PDND_DATA.enti.map(e => e.categoria))], []);
  const lastTouchDist = useRef(null);
  // Inquadratura: al primo disegno con le dimensioni reali il grafo viene
  // adattato allo schermo; il pulsante "Centra" lo rifà con un'animazione.
  const fitPendingRef = useRef(true);
  const tTargetRef = useRef(null);
  // Su schermi bassi la legenda aperta coprirebbe parte della mappa: parte chiusa.
  const [legendaAperta, setLegendaAperta] = useState(() => typeof window === "undefined" || window.innerHeight >= 900);

  // ── Sincronizzazione con l'URL ──────────────────────────────
  // Le due direzioni sono guardate dal confronto sull'identificativo: senza di
  // esso la selezione aggiornerebbe l'URL, che riapplicherebbe la selezione, in
  // ciclo.

  // URL -> selezione. Il nodo viene anche portato al centro: un collegamento
  // diretto che seleziona un ente lasciandolo fuori dall'inquadratura sarebbe
  // inutile. La centratura è differita perché all'avvio le posizioni sono
  // ancora casuali e la simulazione deve assestarsi.
  //
  // Le dipendenze sono volutamente limitate a `entityId`: includere `selNode`
  // riattiverebbe l'effetto a ogni selezione, riapplicando la selezione
  // dall'URL in ciclo. È la ragione per cui le due direzioni sono guardate dal
  // confronto sull'identificativo.
  useEffect(() => {
    // L'URL è un sistema esterno: allinearvi la selezione è l'uso previsto.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!entityId) { setSelNode(cur => (cur ? null : cur)); return; }
    if (selNode && selNode.id === entityId) return;
    const nd = graph.current.nodes.find(n => n.id === entityId);
    if (!nd) return;
    setSelNode(nd);
    const centra = () => {
      const cv = canvasRef.current;
      if (!cv || nd.x == null) return;
      tTargetRef.current = bersaglioCentrato(cv, tRef.current.k, nd);
      ridisegnaRef.current();
    };
    const id = setTimeout(centra, 250);
    return () => clearTimeout(id);
    // Vedi sopra: `selNode` resta fuori di proposito, per non riaprire il ciclo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId]);

  // selezione -> URL. La notifica è esplicita, legata alle azioni dell'utente,
  // e non affidata a un effetto che osserva `selNode`.
  //
  // Un effetto reattivo qui produce un ciclo: al montaggio scatterebbe con
  // `selNode` ancora nullo, cancellando l'ente dall'URL; l'effetto opposto
  // reagirebbe azzerando la selezione, e i due continuerebbero a rincorrersi,
  // chiamando pushState a ogni giro. Le due direzioni devono restare
  // asimmetriche: l'URL guida la selezione, la selezione notifica solo quando
  // è l'utente a cambiarla.
  const selectNode = (n) => {
    setSelNode(n);
    onEntityChange?.(n ? n.id : null);
  };

  const tastoRicerca = (e) => {
    if (e.key === "Enter") {
      const q = search.trim().toLowerCase();
      if (!q) return;
      const nodi = graph.current.nodes;
      const nd = nodi.find(n => n.name.toLowerCase() === q) || nodi.find(n => n.name.toLowerCase().startsWith(q)) || nodi.find(n => n.name.toLowerCase().includes(q));
      if (!nd) return;
      selectNode(nd);
      const cv = canvasRef.current;
      if (cv && nd.x != null) { tTargetRef.current = bersaglioCentrato(cv, tRef.current.k, nd); ridisegna(); }
    } else if (e.key === "Escape") {
      if (search) setSearch(""); else selectNode(null);
    }
  };

  // Filtro di provenienza -> query string. replaceState: cambiare filtro non
  // aggiunge voci alla cronologia.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (filtroArchi) p.set("archi", ORIGINI.filter((o) => origini.has(o)).join(","));
    else p.delete("archi");
    const q = p.toString().replace(/%2C/g, ",");
    const url = window.location.pathname + (q ? `?${q}` : "");
    if (url !== window.location.pathname + window.location.search) window.history.replaceState({}, "", url);
  }, [origini, filtroArchi]);

  const toggleOrigine = (o) => setOrigini((cur) => {
    const next = new Set(cur);
    if (next.has(o)) next.delete(o); else next.add(o);
    return next.size ? next : new Set(ORIGINI);
  });

  // Archi e nodi che restano visibili con il filtro di provenienza. Il peso di
  // una coppia conta solo gli archi visibili, così lo spessore resta coerente.
  const visibili = useMemo(() => {
    const conta = {};
    const nodi = new Set();
    const diretti = new Set();
    for (const l of archiBase) {
      if (!origini.has(l.origine)) continue;
      const k = [l.source, l.target].sort().join("--");
      conta[k] = (conta[k] || 0) + 1;
      diretti.add(`${l.source}->${l.target}`);
      nodi.add(l.source); nodi.add(l.target);
    }
    // Archi distinti diretti erogatore -> fruitore, come nel resto del progetto.
    return { conta, nodi, archi: diretti.size };
  }, [origini, archiBase]);

  // Classi aperte -> query string, senza voci nella cronologia.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (aperte.size) p.set("aperte", [...aperte].sort().join(",")); else p.delete("aperte");
    const q = p.toString().replace(/%2C/g, ",");
    const url = window.location.pathname + (q ? `?${q}` : "");
    if (url !== window.location.pathname + window.location.search) window.history.replaceState({}, "", url);
  }, [aperte]);

  // Apre o richiude una classe. I nodi che restano conservano posizione e
  // identità (la simulazione lavora sugli stessi array); i tipi di ente nuovi
  // partono in cerchio attorno alla loro classe.
  const alternaClasse = (id) => {
    const next = new Set(aperte);
    if (next.has(id)) next.delete(id); else next.add(id);
    const vista = costruisciVista(next);
    const vecchi = new Map(nodesRef.current.map((n) => [n.id, n]));
    const fratelli = new Map();
    const nodi = vista.nodes.map((n) => {
      const v = vecchi.get(n.id);
      if (v) { const { x, y, vx, vy, fx, fy } = v; return Object.assign(v, n, { x, y, vx, vy, fx, fy }); }
      const padre = vecchi.get(n.sottotipo_di);
      const i = fratelli.get(n.sottotipo_di) || 0;
      fratelli.set(n.sottotipo_di, i + 1);
      const tot = PDND_DATA.enti.find((e) => e.id === n.sottotipo_di)?.sottotipi?.length || 1;
      const ang = (i / tot) * Math.PI * 2;
      return Object.assign(n, { x: (padre?.x ?? dim.w / 2) + Math.cos(ang) * 90, y: (padre?.y ?? dim.h / 2) + Math.sin(ang) * 90, vx: 0, vy: 0 });
    });
    const perId = new Map(nodi.map((n) => [n.id, n]));
    nodesRef.current.splice(0, nodesRef.current.length, ...nodi);
    linksRef.current.splice(0, linksRef.current.length, ...vista.links.map((l) => ({ ...l, source: perId.get(l.source), target: perId.get(l.target) })));
    lcRef.current = vista.linkCounts;
    disegnoRef.current = archiDaDisegnare(linksRef.current);
    graph.current = { ...vista, nodes: nodi };
    const sim = simRef.current;
    if (sim) {
      sim.alpha.current = .5;
      if (MOTO_RIDOTTO) { for (let k = 0; k < 200; k++) sim.tick(); sim.alpha.current = 0; }
    }
    setAperte(next);
    ridisegna();
    // Un tipo di ente selezionato sparisce quando si richiude la sua classe.
    if (selNode && !perId.has(selNode.id)) selectNode(perId.get(selNode.sottotipo_di) || null);
  };

  // ── Simulation ──────────────────────────────────────────────

  useEffect(() => {
    const { nodes, links, linkCounts } = graph.current;
    lcRef.current = linkCounts;
    const cx = dim.w / 2, cy = dim.h / 2;
    // Posizioni iniziali deterministiche, ricavate dall'id di ogni ente: la
    // mappa ha la stessa forma a ogni apertura e un ente nuovo non sposta gli altri.
    nodes.forEach(n => { const [u, v] = posizioneDaId(n.id); n.x = cx + (u - .5) * 500; n.y = cy + (v - .5) * 400; });
    // I tipi di ente di una classe già aperta partono in cerchio attorno a essa.
    const giro = new Map();
    nodes.forEach(n => {
      const p = n.sottotipo_di && nodes.find(x => x.id === n.sottotipo_di);
      if (!p) return;
      const i = giro.get(p.id) || 0, tot = nodes.filter(x => x.sottotipo_di === p.id).length;
      giro.set(p.id, i + 1);
      n.x = p.x + Math.cos((i / tot) * Math.PI * 2) * 90; n.y = p.y + Math.sin((i / tot) * Math.PI * 2) * 90;
    });
    nodesRef.current = nodes;
    const perId = new Map(nodes.map(n => [n.id, n]));
    linksRef.current = links.map(l => ({ ...l, source: perId.get(l.source) || l.source, target: perId.get(l.target) || l.target }));
    disegnoRef.current = archiDaDisegnare(linksRef.current);
    const k = tRef.current.k;
    tRef.current.x = (dim.w * 2) / 2 - cx * k;
    tRef.current.y = (dim.h * 2) / 2 - cy * k;
    simRef.current = mkSim(nodesRef.current, linksRef.current, cx, cy);
    for (let i = 0; i < 320; i++) simRef.current.tick();
    if (MOTO_RIDOTTO) simRef.current.alpha.current = 0;
    // Il ciclo di disegno parte dall'effetto su `draw` più sotto, eseguito
    // nello stesso commit subito dopo questo.
    return () => { simRef.current.stop(); cancelAnimationFrame(afRef.current); afRef.current = null; };
    // Inizializzazione una tantum al montaggio: le dimensioni successive non
    // devono riposizionare i nodi né riavviare la simulazione.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Drawing ─────────────────────────────────────────────────

  const draw = useCallback(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d"), t = tRef.current;
    if (simRef.current && !simRef.current.stopped) simRef.current.tick();
    const parent = cv.parentElement;
    // Da qui in poi si disegna in unità logiche (2 × px CSS).
    const R = cv.clientWidth ? cv.width / cv.clientWidth : 2;
    ctx.setTransform(R / 2, 0, 0, R / 2, 0, 0);
    const W = cv.width * 2 / R, H = cv.height * 2 / R;
    if (fitPendingRef.current && parent && cv.width === Math.round(parent.clientWidth * risoluzione()) && parent.clientWidth > 0) {
      const fit = calcolaInquadratura(nodesRef.current, cv);
      if (fit) Object.assign(t, fit);
      fitPendingRef.current = false;
    }
    if (tTargetRef.current && MOTO_RIDOTTO) { Object.assign(t, tTargetRef.current); tTargetRef.current = null; }
    if (tTargetRef.current) {
      const g = tTargetRef.current;
      t.x += (g.x - t.x) * .2; t.y += (g.y - t.y) * .2; t.k += (g.k - t.k) * .2;
      if (Math.abs(g.k - t.k) < .002 && Math.abs(g.x - t.x) < 1 && Math.abs(g.y - t.y) < 1) { Object.assign(t, g); tTargetRef.current = null; }
    }
    ctx.clearRect(0, 0, W, H);

    const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * .6);
    bgGrad.addColorStop(0, P.sfondo[0]); bgGrad.addColorStop(1, P.sfondo[1]);
    ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, W, H);

    ctx.save(); ctx.translate(t.x, t.y); ctx.scale(t.k, t.k);
    const nodes = nodesRef.current, links = disegnoRef.current;
    const isFilt = filterCat !== "Tutte" || search || filtroArchi;
    const vis = new Set();
    nodes.forEach(n => { if ((filterCat === "Tutte" || n.categoria === filterCat) && (!search || n.name.toLowerCase().includes(search.toLowerCase())) && (!filtroArchi || visibili.nodi.has(n.id))) vis.add(n.id); });

    // Links
    links.forEach(l => {
      const s = l.source, tg = l.target; if (!s.x || !tg.x) return;
      // Appartenenza di un tipo di ente alla sua classe aperta: tratto sottile
      // a puntini, senza freccia, non soggetto al filtro di provenienza.
      if (l.origine === "appartenenza") {
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(tg.x, tg.y);
        ctx.strokeStyle = P.normale(4); ctx.lineWidth = 1.2; ctx.setLineDash([2, 5]); ctx.stroke(); ctx.setLineDash([]);
        return;
      }
      if (!origini.has(l.origine)) return;
      if (isFilt && !vis.has(s.id) && !vis.has(tg.id)) return;
      const k = [s.id, tg.id].sort().join("--"), w = (filtroArchi ? visibili.conta[k] : lcRef.current[k]) || 1;
      const hl = (selNode && (s.id === selNode.id || tg.id === selNode.id)) || (hovNode && (s.id === hovNode.id || tg.id === hovNode.id));
      const dim2 = isFilt && (!vis.has(s.id) || !vis.has(tg.id));
      const mx = (s.x + tg.x) / 2, my = (s.y + tg.y) / 2;
      const dx = tg.x - s.x, dy = tg.y - s.y, dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const curvature = w > 1 ? 12 : 0;
      const cx2 = mx + (-dy / dist) * curvature, cy2 = my + (dx / dist) * curvature;

      ctx.beginPath();
      if (curvature > 0) { ctx.moveTo(s.x, s.y); ctx.quadraticCurveTo(cx2, cy2, tg.x, tg.y); }
      else { ctx.moveTo(s.x, s.y); ctx.lineTo(tg.x, tg.y); }

      if (hl) { ctx.strokeStyle = P.evidenziato(.4 + w * .06); ctx.lineWidth = 1.5 + w * .5; ctx.shadowColor = P.alone; ctx.shadowBlur = 6; }
      else if (dim2) { ctx.strokeStyle = P.attenuato; ctx.lineWidth = .3; }
      // Gli archi osservati (fruizione reale registrata dalla PDND) hanno una tinta più
      // chiara e satura: sono la prova più forte del modello dopo quelli documentati.
      else if (l.origine === "osservata") { ctx.strokeStyle = P.osservato(w); ctx.lineWidth = .7 + w * .3; }
      else { ctx.strokeStyle = P.normale(w); ctx.lineWidth = .5 + w * .3; }
      // Stile per provenienza: continuo = ancorato a fonte (documentata/certificata),
      // tratto lungo = ricostruito da documentazione, punteggiato = inferito dall'AI.
      if (l.origine === "inferita") ctx.setLineDash([6, 5]);
      else if (l.origine === "ricostruita") ctx.setLineDash([12, 4]);
      else ctx.setLineDash([]);
      ctx.stroke(); ctx.setLineDash([]); ctx.shadowBlur = 0;

      if (hl) {
        const angle = curvature > 0 ? Math.atan2(tg.y - cy2, tg.x - cx2) : Math.atan2(tg.y - s.y, tg.x - s.x);
        const nr = gR(tg), ax = tg.x - Math.cos(angle) * (nr + 5), ay = tg.y - Math.sin(angle) * (nr + 5);
        ctx.beginPath(); ctx.moveTo(ax, ay);
        ctx.lineTo(ax - Math.cos(angle - .35) * 8, ay - Math.sin(angle - .35) * 8);
        ctx.lineTo(ax - Math.cos(angle + .35) * 8, ay - Math.sin(angle + .35) * 8);
        ctx.closePath(); ctx.fillStyle = P.freccia; ctx.fill();
      }
    });

    // Nodes
    nodes.forEach(n => {
      if (!n.x) return;
      if (isFilt && !vis.has(n.id)) { const r = gR(n) * .35; ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.fillStyle = P.nodoSpento; ctx.fill(); return; }
      const r = gR(n), col = CATEGORY_COLORS[n.categoria] || "#667", isSel = selNode?.id === n.id, isHov = hovNode?.id === n.id;

      if (isSel || isHov) {
        const g = ctx.createRadialGradient(n.x, n.y, r * .5, n.x, n.y, r * 4);
        g.addColorStop(0, col + "55"); g.addColorStop(.5, col + "18"); g.addColorStop(1, col + "00");
        ctx.beginPath(); ctx.arc(n.x, n.y, r * 4, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
      }

      ctx.drawImage(spriteNodo(col, r), n.x - 2 * r, n.y - 2 * r, 4 * r, 4 * r);

      ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2);

      ctx.strokeStyle = isSel ? P.bordoSel : isHov ? P.bordoHov : col + "40";
      ctx.lineWidth = isSel ? 2.5 : isHov ? 2 : 1; ctx.stroke();

      ctx.beginPath(); ctx.arc(n.x, n.y, r * .75, Math.PI * 1.1, Math.PI * 1.7);
      ctx.strokeStyle = P.riflesso; ctx.lineWidth = 1.5; ctx.stroke();

      // Badge con il numero di legami: solo quando il nodo è abbastanza grande
      // sullo schermo da ospitarlo, o se è selezionato o sotto il puntatore.
      if (n.totalConnections > 5 && (isSel || isHov || r * t.k > 44)) {
        const bx = n.x + r * .7, by = n.y - r * .7, br = 16 / t.k;
        ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fillStyle = n.erogati > 0 ? "#06d6a0" : "#118ab2"; ctx.fill();
        ctx.strokeStyle = P.bordoBadge; ctx.lineWidth = 3 / t.k; ctx.stroke();
        ctx.font = `bold ${17 / t.k}px 'Titillium Web',sans-serif`; ctx.fillStyle = "#fff";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(n.totalConnections, bx, by + 1 / t.k);
      }
    });

    // Etichette. Dimensione costante sullo schermo (circa 12 px) e nessuna
    // sovrapposizione: si disegnano in ordine di importanza (selezionato, sotto
    // il puntatore, vicini del selezionato, risultati della ricerca, nodi più
    // grandi) e un'etichetta che coprirebbe una già disegnata viene saltata.
    // Zoomando, lo spazio cresce e compaiono le altre.
    const vicini = new Set();
    if (selNode) links.forEach(l => { if (l.source.id === selNode.id) vicini.add(l.target.id); if (l.target.id === selNode.id) vicini.add(l.source.id); });
    const priorita = (n) => (selNode?.id === n.id ? 1e6 : hovNode?.id === n.id ? 9e5 : vicini.has(n.id) ? 5e5 + gR(n) : search && vis.has(n.id) ? 4e5 + gR(n) : gR(n));
    const fsW = 24 / t.k, padW = 8 / t.k;
    ctx.font = `600 ${fsW}px 'Titillium Web',-apple-system,sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const occupati = [];
    nodes
      .filter(n => n.x && (!isFilt || vis.has(n.id)))
      .sort((a, b) => priorita(b) - priorita(a))
      .forEach(n => {
        const r = gR(n), w = larghezzaEtichetta(ctx, n.name, fsW) + padW * 2, h = fsW + padW;
        const x = n.x - w / 2, y = n.y + r + 4 / t.k;
        // Solo il nodo selezionato e quello sotto il puntatore hanno sempre
        // l'etichetta; vicini e risultati della ricerca hanno la precedenza ma
        // rispettano lo spazio, altrimenti un hub con 80 vicini è illeggibile.
        const forzata = priorita(n) >= 9e5;
        if (!forzata && occupati.some(o => x < o.x + o.w && x + w > o.x && y < o.y + o.h && y + h > o.y)) return;
        occupati.push({ x, y, w, h });
        const isSel = selNode?.id === n.id, isHov = hovNode?.id === n.id;
        ctx.fillStyle = P.fondoEtichetta;
        ctx.beginPath(); ctx.roundRect(x, y, w, h, 6 / t.k); ctx.fill();
        ctx.fillStyle = isSel || isHov ? P.etichettaAttiva : P.etichetta;
        ctx.fillText(n.name, n.x, y + h / 2 + 1 / t.k);
      });
    ctx.restore();
    // Serve un altro fotogramma? Sì finché la simulazione o l'inquadratura si
    // muovono o l'utente trascina; altrimenti il ciclo si ferma.
    const sim = simRef.current;
    let moto = 0;
    if (sim && !sim.stopped) for (const n of nodes) moto = Math.max(moto, Math.abs(n.vx || 0) + Math.abs(n.vy || 0));
    return Boolean((sim && !sim.stopped && (sim.alpha.current > 0 || moto > .05)) || tTargetRef.current || dragRef.current || panRef.current || fitPendingRef.current);
  }, [selNode, hovNode, filterCat, search, origini, filtroArchi, visibili, P]);

  // Ciclo di fotogrammi: chiama l'ultima versione di draw finché serve.
  useEffect(() => {
    const fotogramma = () => { afRef.current = null; if (drawRef.current?.()) afRef.current = requestAnimationFrame(fotogramma); };
    ridisegnaRef.current = () => { if (afRef.current == null) afRef.current = requestAnimationFrame(fotogramma); };
    return () => { cancelAnimationFrame(afRef.current); afRef.current = null; };
  }, []);
  useEffect(() => { drawRef.current = draw; ridisegnaRef.current(); }, [draw]);

  // ── Mouse interaction ───────────────────────────────────────

  function s2w(sx, sy) { const t = tRef.current; return { x: (sx - t.x) / t.k, y: (sy - t.y) / t.k }; }
  function findN(wx, wy) { for (let i = nodesRef.current.length - 1; i >= 0; i--) { const n = nodesRef.current[i], r = gR(n) + 4; if ((n.x - wx) ** 2 + (n.y - wy) ** 2 < r ** 2) return n; } return null; }
  const getXY = (e) => { const rc = canvasRef.current.getBoundingClientRect(); return { sx: (e.clientX - rc.left) * 2, sy: (e.clientY - rc.top) * 2 }; };

  const onMD = e => { const { sx, sy } = getXY(e); const { x: wx, y: wy } = s2w(sx, sy), nd = findN(wx, wy); if (nd) { dragRef.current = { node: nd, ox: wx - nd.x, oy: wy - nd.y }; nd.fx = nd.x; nd.fy = nd.y; selectNode(nd); simRef.current?.reheat(); } else { panRef.current = { sx: e.clientX, sy: e.clientY, tx: tRef.current.x, ty: tRef.current.y }; selectNode(null); } };
  const onMM = e => { const { sx, sy } = getXY(e); const { x: wx, y: wy } = s2w(sx, sy); if (dragRef.current) { dragRef.current.node.fx = wx - dragRef.current.ox; dragRef.current.node.fy = wy - dragRef.current.oy; simRef.current?.reheat(); } else if (panRef.current) { tRef.current.x = panRef.current.tx + e.clientX - panRef.current.sx; tRef.current.y = panRef.current.ty + e.clientY - panRef.current.sy; } else { const nd = findN(wx, wy); setHovNode(nd); canvasRef.current.style.cursor = nd ? "pointer" : "grab"; } };
  const onMU = () => { if (dragRef.current) { dragRef.current.node.fx = null; dragRef.current.node.fy = null; dragRef.current = null; simRef.current?.reheat(); } panRef.current = null; };
  const onWh = e => { e.preventDefault(); const { sx: mx, sy: my } = getXY(e); const t = tRef.current, f = e.deltaY < 0 ? 1.08 : .93, nk = Math.max(.15, Math.min(5, t.k * f)); t.x = mx - (mx - t.x) * (nk / t.k); t.y = my - (my - t.y) * (nk / t.k); t.k = nk; };

  // ── Touch interaction ───────────────────────────────────────

  const getTouchXY = (touch) => { const rc = canvasRef.current.getBoundingClientRect(); return { sx: (touch.clientX - rc.left) * 2, sy: (touch.clientY - rc.top) * 2 }; };

  const onTS = e => {
    e.preventDefault();
    if (e.touches.length === 1) {
      const { sx, sy } = getTouchXY(e.touches[0]);
      const { x: wx, y: wy } = s2w(sx, sy), nd = findN(wx, wy);
      if (nd) { dragRef.current = { node: nd, ox: wx - nd.x, oy: wy - nd.y }; nd.fx = nd.x; nd.fy = nd.y; selectNode(nd); simRef.current?.reheat(); }
      else { panRef.current = { sx: e.touches[0].clientX, sy: e.touches[0].clientY, tx: tRef.current.x, ty: tRef.current.y }; selectNode(null); }
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist.current = Math.sqrt(dx * dx + dy * dy);
    }
  };

  const onTM = e => {
    e.preventDefault();
    if (e.touches.length === 1) {
      if (dragRef.current) {
        const { sx, sy } = getTouchXY(e.touches[0]);
        const { x: wx, y: wy } = s2w(sx, sy);
        dragRef.current.node.fx = wx - dragRef.current.ox;
        dragRef.current.node.fy = wy - dragRef.current.oy;
        simRef.current?.reheat();
      } else if (panRef.current) {
        tRef.current.x = panRef.current.tx + e.touches[0].clientX - panRef.current.sx;
        tRef.current.y = panRef.current.ty + e.touches[0].clientY - panRef.current.sy;
      }
    } else if (e.touches.length === 2 && lastTouchDist.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const scale = dist / lastTouchDist.current;
      const t = tRef.current;
      const rc = canvasRef.current.getBoundingClientRect();
      const mx = ((e.touches[0].clientX + e.touches[1].clientX) / 2 - rc.left) * 2;
      const my = ((e.touches[0].clientY + e.touches[1].clientY) / 2 - rc.top) * 2;
      const nk = Math.max(.15, Math.min(5, t.k * scale));
      t.x = mx - (mx - t.x) * (nk / t.k);
      t.y = my - (my - t.y) * (nk / t.k);
      t.k = nk;
      lastTouchDist.current = dist;
    }
  };

  const onTE = e => {
    e.preventDefault();
    if (dragRef.current) { dragRef.current.node.fx = null; dragRef.current.node.fy = null; dragRef.current = null; simRef.current?.reheat(); }
    panRef.current = null;
    lastTouchDist.current = null;
  };

  // Rotella e tocco vanno registrati come listener non passivi. React li
  // registra passivi, e in un listener passivo preventDefault() viene ignorato
  // con un errore in console: la rotella farebbe anche scorrere la pagina e il
  // tocco genererebbe eventi mouse emulati. I gestori cambiano a ogni render,
  // quindi il listener stabile chiama sempre l'ultima versione tramite ref.
  const gestoriRef = useRef({});
  useEffect(() => { gestoriRef.current = { onWh, onTS, onTM, onTE }; });
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    // Qualunque interazione riavvia il ciclo di disegno, se era fermo.
    const sveglia = () => ridisegnaRef.current();
    const risveglio = ["pointerdown", "pointermove", "pointerup", "wheel", "touchstart", "touchmove"];
    risveglio.forEach((tipo) => cv.addEventListener(tipo, sveglia, { passive: true }));
    window.addEventListener("pointerup", sveglia);
    const eventi = [
      ["wheel", (e) => gestoriRef.current.onWh(e)],
      ["touchstart", (e) => gestoriRef.current.onTS(e)],
      ["touchmove", (e) => gestoriRef.current.onTM(e)],
      ["touchend", (e) => gestoriRef.current.onTE(e)],
      ["touchcancel", (e) => gestoriRef.current.onTE(e)],
    ];
    eventi.forEach(([tipo, fn]) => cv.addEventListener(tipo, fn, { passive: false }));
    return () => {
      eventi.forEach(([tipo, fn]) => cv.removeEventListener(tipo, fn));
      risveglio.forEach((tipo) => cv.removeEventListener(tipo, sveglia));
      window.removeEventListener("pointerup", sveglia);
    };
  }, []);

  // ── Resize ──────────────────────────────────────────────────

  useEffect(() => {
    const rs = () => { const c = canvasRef.current?.parentElement; if (!c) return; setDim({ w: c.clientWidth, h: c.clientHeight }); if (canvasRef.current) { const r = risoluzione(); canvasRef.current.width = Math.round(c.clientWidth * r); canvasRef.current.height = Math.round(c.clientHeight * r); } ridisegnaRef.current(); };
    rs(); window.addEventListener("resize", rs); return () => window.removeEventListener("resize", rs);
  }, []);

  // ── Render ──────────────────────────────────────────────────

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: m ? "6px 10px" : "6px 20px", background: "var(--card)", borderBottom: "1px solid var(--line)", flexWrap: "wrap", zIndex: 10 }}>
        <input type="search" list="elenco-enti" placeholder="Cerca un ente…" aria-label="Cerca un ente: Invio per aprirlo, Esc per annullare" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={tastoRicerca} style={{ background: "var(--input)", border: "1px solid var(--border)", borderRadius: 6, padding: "5px 10px", color: "var(--ink)", fontSize: 12, outline: "none", width: m ? 120 : 160, flex: m ? 1 : undefined }} />
        <datalist id="elenco-enti">{NOMI_ENTI.map(n => <option key={n} value={n} />)}</datalist>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ background: "var(--input)", border: "1px solid var(--border)", borderRadius: 6, padding: "5px 8px", color: "var(--ink)", fontSize: m ? 11 : 12, outline: "none" }}>{cats.map(c => <option key={c} value={c}>{c}</option>)}</select>
        <select
          value={vistaDi(origini)}
          onChange={e => { const v = VISTE_ARCHI.find(x => x.id === e.target.value); if (v) setOrigini(new Set(v.origini)); }}
          aria-label="Filtra gli archi per provenienza"
          style={{ background: filtroArchi ? "var(--pa-blue-soft)" : "var(--input)", border: `1px solid ${filtroArchi ? "var(--acc-cyan)" : "var(--border)"}`, borderRadius: 6, padding: "5px 8px", color: "var(--ink)", fontSize: m ? 11 : 12, outline: "none" }}
        >
          {VISTE_ARCHI.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
          {vistaDi(origini) === "personalizzata" && <option value="personalizzata">Provenienze scelte</option>}
        </select>
        <button
          type="button"
          onClick={() => { const cv = canvasRef.current; const fit = cv && calcolaInquadratura(nodesRef.current, cv); if (fit) { tTargetRef.current = fit; ridisegna(); } }}
          title="Adatta la mappa allo schermo"
          style={{ background: "var(--input)", border: "1px solid var(--border)", borderRadius: 6, padding: "5px 10px", color: "var(--ink)", fontSize: m ? 11 : 12, cursor: "pointer", fontFamily: "inherit" }}
        >
          ⤢ Centra
        </button>
        {filtroArchi && (
          <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>
            <span className="tabular" style={{ color: "var(--acc-cyan)", fontWeight: 600 }}>{visibili.archi}</span> legami visibili su {totLegami}
          </span>
        )}
      </div>

      {/* Canvas. `minHeight: 0` è necessario: in una colonna flex il valore
          predefinito `min-height: auto` impedisce all'elemento di restringersi
          sotto la dimensione del contenuto, quindi il contenitore resterebbe
          alto quanto il canvas iniziale, sforando il viewport e spingendo fuori
          schermo il bordo inferiore del grafo e le legende. */}
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <canvas ref={canvasRef}
          role="img"
          aria-label="Mappa degli scambi di dati fra Pubbliche Amministrazioni sulla PDND. Per aprire un ente da tastiera usa la ricerca e premi Invio; lo stesso contenuto è disponibile in forma testuale nelle schede Relazioni e Numeri."
          style={{ width: "100%", height: "100%", cursor: "grab", touchAction: "none" }}
          onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU}
        />

        {/* Legenda dei colori, per famiglie, richiudibile. */}
        <div className="graph-legend-desktop" style={{ position: "absolute", bottom: 12, left: 12, zIndex: 5, background: "var(--panel)", borderRadius: 8, border: "1px solid var(--border)", padding: legendaAperta ? "10px 14px 12px" : "6px 12px", maxWidth: 440 }}>
          <button type="button" onClick={() => setLegendaAperta(a => !a)} aria-expanded={legendaAperta}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 10, textTransform: "uppercase", letterSpacing: .6, color: "var(--ink-faint)", display: "flex", alignItems: "center", gap: 6 }}>
            {legendaAperta ? "▾" : "▸"} Tipi di ente · clic per filtrare
          </button>
          {legendaAperta && FAMIGLIE.map(([famiglia, categorie]) => {
            const presenti = categorie.filter(c => cats.includes(c));
            if (!presenti.length) return null;
            return (
              <div key={famiglia} style={{ marginTop: 8 }}>
                <div style={{ fontSize: 10.5, color: "var(--ink-muted)", fontWeight: 600, marginBottom: 4 }}>{famiglia}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px" }}>
                  {presenti.map(cat => (
                    <button key={cat} type="button" onClick={() => setFilterCat(filterCat === cat ? "Tutte" : cat)} aria-pressed={filterCat === cat}
                      style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, cursor: "pointer", background: "none", border: "none", padding: 0, fontFamily: "inherit", color: "var(--ink-muted)", opacity: filterCat === "Tutte" || filterCat === cat ? 1 : .4 }}>
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: CATEGORY_COLORS[cat] || "#667", display: "inline-block" }} />
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legenda provenienza archi */}
        <div className="graph-legend-desktop" style={{ position: "absolute", bottom: 12, right: 12, zIndex: 5, background: "var(--panel)", borderRadius: 8, border: "1px solid var(--border)", padding: "8px 12px", display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--ink-muted)" }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: .6, color: "var(--ink-faint)", marginBottom: 2 }}>Da dove viene il legame · clic per filtrare</div>
            {[
              ["documentata", "Documentata", "var(--acc-blue2)", null, 1.6],
              ["osservata", "Osservata (uso reale)", "var(--acc-cyan)", null, 1.8],
              ["certificata", "Certificata (catalogo)", "var(--acc-blue2)", null, 1.6],
              ["ricostruita", "Ricostruita (documentazione)", "var(--acc-blue2)", "10,3", 1.6],
              ["inferita", "Inferita (AI)", "var(--acc-blue2)", "5,4", 1.6],
            ].map(([o, label, stroke, dash, sw]) => {
              const on = origini.has(o);
              return (
                <button key={o} type="button" onClick={() => toggleOrigine(o)} aria-pressed={on}
                  title={on ? `Nascondi gli archi di provenienza ${ORIGIN_STYLES[o].nome.toLowerCase()}` : `Mostra gli archi di provenienza ${ORIGIN_STYLES[o].nome.toLowerCase()}`}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 11, color: "var(--ink-muted)", opacity: on ? 1 : .35, textAlign: "left" }}>
                  <svg width="22" height="6" aria-hidden="true"><line x1="0" y1="3" x2="22" y2="3" stroke={stroke} strokeWidth={sw} strokeDasharray={dash || undefined} /></svg>
                  <span style={{ textDecoration: on ? "none" : "line-through" }}>{label}</span>
                </button>
              );
            })}
        </div>

        {/* Detail panel */}
        {selNode && (
          <div style={{
            position: "absolute", right: 0, bottom: 0,
            ...(m ? { left: 0, top: "40%", borderTop: "1px solid var(--border)", borderRadius: "14px 14px 0 0" } : { top: 0, width: 330, borderLeft: "1px solid var(--border)" }),
            background: "var(--panel)", padding: 16, overflowY: "auto", backdropFilter: "blur(14px)", zIndex: 10,
          }}>
            <button onClick={() => selectNode(null)} aria-label="Chiudi dettaglio" style={{ position: "absolute", top: 10, right: 12, background: "none", border: "none", color: "var(--ink-faint)", fontSize: 16, cursor: "pointer", lineHeight: 1, zIndex: 1 }}>✕</button>
            <button
              onClick={() => { navigator.clipboard?.writeText(window.location.href); setCopiato(true); setTimeout(() => setCopiato(false), 1800); }}
              title="Copia il collegamento diretto a questo ente"
              style={{ position: "absolute", top: 10, right: 40, background: "none", border: "none", color: copiato ? "var(--pa-blue)" : "var(--ink-faint)", fontSize: 10, fontWeight: 600, cursor: "pointer", lineHeight: 1, zIndex: 1, fontFamily: "inherit", letterSpacing: .3 }}
            >{copiato ? "COPIATO" : "COPIA LINK"}</button>
            {m && <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border)", margin: "0 auto 12px" }} />}
            {(() => { const col = CATEGORY_COLORS[selNode.categoria] || "#667"; return (<div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: `linear-gradient(135deg,${col},${col}88)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, flexShrink: 0 }}>{selNode.name[0]}</div>
                <div><div style={{ fontWeight: 700, fontSize: 14 }}>{selNode.name}</div><div style={{ fontSize: 10, color: "var(--ink-faint)" }}>{selNode.categoria} · {selNode.tipo}</div></div>
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-muted)", marginBottom: 14 }}>{selNode.descrizione}</div>
              {selNode.aggregato && selNode.aderenti > 0 && (
                <div style={{ marginBottom: 14, fontSize: 11, color: "var(--ink-muted)" }}>
                  {selNode.sottotipo_di ? "Tipo di ente" : "Classe di enti"}: <strong style={{ color: "var(--ink)" }}>{selNode.aderenti.toLocaleString("it-IT")} aderenti</strong> alla PDND <span style={{ color: "var(--ink-faint)" }}>({selNode.aderenti_fonte})</span>
                </div>
              )}
              {selNode.sottotipo_di && (
                <div style={{ marginBottom: 14, fontSize: 11, color: "var(--ink-muted)", lineHeight: 1.55 }}>
                  Parte della classe{" "}
                  <button type="button" onClick={() => { const p = nodesRef.current.find((n) => n.id === selNode.sottotipo_di); if (p) selectNode(p); }}
                    style={{ background: "none", border: "none", padding: 0, color: "var(--ink)", font: "inherit", cursor: "pointer", textDecoration: "underline", textDecorationColor: "var(--underline)", textUnderlineOffset: 2 }}>
                    {PDND_DATA.enti.find((e) => e.id === selNode.sottotipo_di)?.name.replace(" (aggregati)", "")}
                  </button>.{" "}
                  <button type="button" onClick={() => alternaClasse(selNode.sottotipo_di)}
                    style={{ background: "none", border: "none", padding: 0, color: "var(--pa-blue)", font: "inherit", cursor: "pointer" }}>
                    Richiudi la classe
                  </button>
                </div>
              )}
              {selNode.aggregato && !selNode.sottotipo_di && (
                <ClassInside key={selNode.id} nodo={selNode} onOpenAderente={onOpenAderente} onOpenEservice={onOpenEservice}
                  aperta={aperte.has(selNode.id)} onToggleAperta={APRIBILI.has(selNode.id) ? () => alternaClasse(selNode.id) : undefined} />
              )}
              {selNode.id === "comuni_agg" && (
                <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 6, background: "rgba(255,209,102,.05)", border: "1px solid rgba(255,209,102,.18)" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--cite)", textTransform: "uppercase", letterSpacing: .8, marginBottom: 4 }}>ⓘ Tipi di servizio</div>
                  <div style={{ fontSize: 11, color: "var(--ink-muted)", lineHeight: 1.55 }}>
                    Gli e-service elencati qui sotto sono <strong style={{ color: "var(--ink)" }}>tipi di servizio</strong> aggregati: nel catalogo PDND ciascuno corrisponde a centinaia o migliaia di endpoint reali, uno per ogni Comune che lo pubblica. Per i dettagli vedi <em>Metodologia</em>.
                  </div>
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                {[["Servizi offerti", selNode.erogati, "var(--acc-green)"], ["Servizi usati", selNode.fruiti, "var(--pa-blue)"], ["Legami", selNode.totalConnections, "var(--acc-red)"]].map(([l, v, c]) => (
                  <div key={l} style={{ flex: 1, textAlign: "center", padding: "6px 2px", background: "var(--card-inset)", borderRadius: 6, border: `1px solid ${c}22` }}><div style={{ fontSize: 16, fontWeight: 800, color: c }}>{v}</div><div style={{ fontSize: 9.5, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: .5 }}>{l}</div></div>
                ))}
              </div>
              {selNode.servizi_erogati?.length > 0 && <div style={{ marginBottom: 14 }}><div style={{ fontSize: 11, fontWeight: 700, color: "var(--acc-green)", textTransform: "uppercase", letterSpacing: .8, marginBottom: 6 }}>Servizi che offre ({selNode.servizi_erogati.length})</div>{selNode.servizi_erogati.map(es => (
                <div key={es.id} style={{ padding: "6px 8px", marginBottom: 3, borderRadius: 5, background: "rgba(6,214,160,.05)", border: "1px solid rgba(6,214,160,.08)", fontSize: 12 }}><button type="button" onClick={() => onOpenEservice?.(es.id)} title="Apri la scheda dell'e-service" style={{ fontWeight: 600, background: "none", border: "none", padding: 0, color: "inherit", font: "inherit", textAlign: "left", cursor: "pointer", textDecoration: "underline", textDecorationColor: "var(--underline)", textUnderlineOffset: 2 }}>{es.nome}</button>{es.descrizione && <div style={{ color: "var(--ink-faint)", fontSize: 10.5, marginTop: 1 }}>{es.descrizione}</div>}<div style={{ color: "var(--ink-faint)", fontSize: 10.5, marginTop: 2 }}>v{es.versione} · {es.stato} · {es.fruitori.length} fruitori{es.enti_abilitati_min ? ` · ≥${es.enti_abilitati_min.toLocaleString("it-IT")} enti abilitati` : ""}{es.sessioni_min ? ` · ≥${(es.sessioni_min / 1e6).toLocaleString("it-IT", { maximumFractionDigits: 1 })} M sessioni` : ""}</div></div>
              ))}</div>}
              {selNode.servizi_fruiti?.length > 0 && <div><div style={{ fontSize: 11, fontWeight: 700, color: "var(--pa-blue)", textTransform: "uppercase", letterSpacing: .8, marginBottom: 6 }}>Servizi che usa ({selNode.servizi_fruiti.length})</div>{selNode.servizi_fruiti.map(es => { const er = PDND_DATA.enti.find(e => e.id === es.erogatore); return (
                <div key={es.id + selNode.id} style={{ padding: "6px 8px", marginBottom: 3, borderRadius: 5, background: "rgba(17,138,178,.05)", border: "1px solid rgba(17,138,178,.08)", fontSize: 12 }}><button type="button" onClick={() => onOpenEservice?.(es.id)} title="Apri la scheda dell'e-service" style={{ fontWeight: 600, background: "none", border: "none", padding: 0, color: "inherit", font: "inherit", textAlign: "left", cursor: "pointer", textDecoration: "underline", textDecorationColor: "var(--underline)", textUnderlineOffset: 2 }}>{es.nome}</button><div style={{ color: "var(--ink-faint)", fontSize: 10.5, marginTop: 1 }}>da {er?.name} · v{es.versione}</div></div>
              ); })}</div>}
            </div>); })()}
          </div>
        )}
      </div>
    </div>
  );
}
