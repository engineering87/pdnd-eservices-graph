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
import { CATEGORY_COLORS } from "../constants/colors";
import { buildGraph } from "../utils/buildGraph";
import { useIsMobile } from "../utils/useIsMobile";

function gR(n) { return 14 + Math.sqrt(n.totalConnections) * 4.5; }

function lgt(hex, amount) {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgb(${Math.max(0, Math.min(255, (n >> 16) + amount))},${Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amount))},${Math.max(0, Math.min(255, (n & 0xff) + amount))})`;
}

export default function GraphView({ entityId = null, onEntityChange }) {
  const m = useIsMobile();
  const canvasRef = useRef(null);
  const [dim, setDim] = useState({ w: 960, h: 700 });
  const [selNode, setSelNode] = useState(null);
  const [hovNode, setHovNode] = useState(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("Tutte");
  const [copiato, setCopiato] = useState(false);
  const simRef = useRef(null);
  const nodesRef = useRef([]);
  const linksRef = useRef([]);
  const tRef = useRef({ x: 0, y: 0, k: 1.5 });
  const dragRef = useRef(null);
  const panRef = useRef(null);
  const afRef = useRef(null);
  const lcRef = useRef({});
  const graph = useRef(buildGraph(PDND_DATA));
  const cats = useMemo(() => ["Tutte", ...new Set(PDND_DATA.enti.map(e => e.categoria))], []);
  const lastTouchDist = useRef(null);

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
  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!entityId) { setSelNode(cur => (cur ? null : cur)); return; }
    if (selNode && selNode.id === entityId) return;
    const nd = graph.current.nodes.find(n => n.id === entityId);
    if (!nd) return;
    setSelNode(nd);
    const centra = () => {
      const cv = canvasRef.current;
      if (!cv || nd.x == null) return;
      const k = tRef.current.k;
      tRef.current.x = cv.width / 2 - nd.x * k;
      tRef.current.y = cv.height / 2 - nd.y * k;
    };
    const id = setTimeout(centra, 900);
    return () => clearTimeout(id);
  }, [entityId]);

  // selezione -> URL. `onEntityChange` è escluso dalle dipendenze di proposito:
  // se il genitore lo ridefinisce a ogni render, includerlo farebbe scattare
  // l'effetto in continuazione.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    onEntityChange?.(selNode ? selNode.id : null);
  }, [selNode]);

  // ── Simulation ──────────────────────────────────────────────

  useEffect(() => {
    const { nodes, links, linkCounts } = graph.current;
    lcRef.current = linkCounts;
    const cx = dim.w / 2, cy = dim.h / 2;
    nodes.forEach(n => { n.x = cx + (Math.random() - .5) * 500; n.y = cy + (Math.random() - .5) * 400; });
    nodesRef.current = nodes;
    linksRef.current = links.map(l => ({ ...l, source: nodes.find(n => n.id === l.source) || l.source, target: nodes.find(n => n.id === l.target) || l.target }));
    const k = tRef.current.k;
    tRef.current.x = (dim.w * 2) / 2 - cx * k;
    tRef.current.y = (dim.h * 2) / 2 - cy * k;
    simRef.current = mkSim(nodesRef.current, linksRef.current, cx, cy);
    // `draw` è dichiarata più sotto: l'accesso è valido perché gli effetti
    // vengono eseguiti dopo l'esecuzione del corpo del componente.
    draw();
    return () => { simRef.current.stop(); cancelAnimationFrame(afRef.current); };
  }, []);

  function mkSim(nodes, links, cx, cy) {
    const a = { current: 1 };
    function tick() {
      a.current *= .985; if (a.current < .001) a.current = 0;
      nodes.forEach(n => { n.vx = (n.vx || 0) + (cx - n.x) * .005 * a.current; n.vy = (n.vy || 0) + (cy - n.y) * .005 * a.current; });
      links.forEach(l => { const dx = l.target.x - l.source.x, dy = l.target.y - l.source.y, d = Math.sqrt(dx * dx + dy * dy) || 1, f = (d - 220) * .003 * a.current; l.source.vx += dx / d * f; l.source.vy += dy / d * f; l.target.vx -= dx / d * f; l.target.vy -= dy / d * f; });
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) { const dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y, d = Math.sqrt(dx * dx + dy * dy) || 1, f = -3500 / (d * d) * a.current; nodes[i].vx += dx / d * f; nodes[i].vy += dy / d * f; nodes[j].vx -= dx / d * f; nodes[j].vy -= dy / d * f; }
      nodes.forEach(n => { if (n.fx != null) { n.x = n.fx; n.vx = 0; } else { n.vx *= .55; n.x += n.vx; } if (n.fy != null) { n.y = n.fy; n.vy = 0; } else { n.vy *= .55; n.y += n.vy; } });
    }
    return { alpha: a, tick, stopped: false, reheat() { a.current = .3; }, stop() { this.stopped = true; } };
  }

  // ── Drawing ─────────────────────────────────────────────────

  const draw = useCallback(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d"), t = tRef.current;
    if (simRef.current && !simRef.current.stopped) simRef.current.tick();
    ctx.clearRect(0, 0, cv.width, cv.height);

    const bgGrad = ctx.createRadialGradient(cv.width / 2, cv.height / 2, 0, cv.width / 2, cv.height / 2, cv.width * .6);
    bgGrad.addColorStop(0, "rgba(20,28,50,.3)"); bgGrad.addColorStop(1, "rgba(10,14,26,0)");
    ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, cv.width, cv.height);

    ctx.save(); ctx.translate(t.x, t.y); ctx.scale(t.k, t.k);
    const nodes = nodesRef.current, links = linksRef.current;
    const isFilt = filterCat !== "Tutte" || search;
    const vis = new Set();
    nodes.forEach(n => { if ((filterCat === "Tutte" || n.categoria === filterCat) && (!search || n.name.toLowerCase().includes(search.toLowerCase()))) vis.add(n.id); });

    // Links
    links.forEach(l => {
      const s = l.source, tg = l.target; if (!s.x || !tg.x) return;
      if (isFilt && !vis.has(s.id) && !vis.has(tg.id)) return;
      const k = [s.id, tg.id].sort().join("--"), w = lcRef.current[k] || 1;
      const hl = (selNode && (s.id === selNode.id || tg.id === selNode.id)) || (hovNode && (s.id === hovNode.id || tg.id === hovNode.id));
      const dim2 = isFilt && (!vis.has(s.id) || !vis.has(tg.id));
      const mx = (s.x + tg.x) / 2, my = (s.y + tg.y) / 2;
      const dx = tg.x - s.x, dy = tg.y - s.y, dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const curvature = w > 1 ? 12 : 0;
      const cx2 = mx + (-dy / dist) * curvature, cy2 = my + (dx / dist) * curvature;

      ctx.beginPath();
      if (curvature > 0) { ctx.moveTo(s.x, s.y); ctx.quadraticCurveTo(cx2, cy2, tg.x, tg.y); }
      else { ctx.moveTo(s.x, s.y); ctx.lineTo(tg.x, tg.y); }

      if (hl) { ctx.strokeStyle = `rgba(200,220,255,${.4 + w * .06})`; ctx.lineWidth = 1.5 + w * .5; ctx.shadowColor = "rgba(100,180,255,.3)"; ctx.shadowBlur = 6; }
      else if (dim2) { ctx.strokeStyle = "rgba(100,120,140,.04)"; ctx.lineWidth = .3; }
      else { ctx.strokeStyle = `rgba(100,160,220,${.08 + w * .03})`; ctx.lineWidth = .5 + w * .3; }
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
        ctx.closePath(); ctx.fillStyle = "rgba(200,220,255,.5)"; ctx.fill();
      }
    });

    // Nodes
    nodes.forEach(n => {
      if (!n.x) return;
      if (isFilt && !vis.has(n.id)) { const r = gR(n) * .35; ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.fillStyle = "rgba(40,50,65,.15)"; ctx.fill(); return; }
      const r = gR(n), col = CATEGORY_COLORS[n.categoria] || "#667", isSel = selNode?.id === n.id, isHov = hovNode?.id === n.id;

      if (isSel || isHov) {
        const g = ctx.createRadialGradient(n.x, n.y, r * .5, n.x, n.y, r * 4);
        g.addColorStop(0, col + "55"); g.addColorStop(.5, col + "18"); g.addColorStop(1, col + "00");
        ctx.beginPath(); ctx.arc(n.x, n.y, r * 4, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
      }

      const ambGlow = ctx.createRadialGradient(n.x, n.y, r, n.x, n.y, r * 2);
      ambGlow.addColorStop(0, col + "12"); ambGlow.addColorStop(1, col + "00");
      ctx.beginPath(); ctx.arc(n.x, n.y, r * 2, 0, Math.PI * 2); ctx.fillStyle = ambGlow; ctx.fill();

      ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      const g2 = ctx.createRadialGradient(n.x - r * .35, n.y - r * .35, 0, n.x, n.y, r);
      g2.addColorStop(0, lgt(col, 60)); g2.addColorStop(.7, col); g2.addColorStop(1, lgt(col, -20));
      ctx.fillStyle = g2; ctx.fill();

      ctx.strokeStyle = isSel ? "#fff" : isHov ? "rgba(255,255,255,.8)" : col + "40";
      ctx.lineWidth = isSel ? 2.5 : isHov ? 2 : 1; ctx.stroke();

      ctx.beginPath(); ctx.arc(n.x, n.y, r * .75, Math.PI * 1.1, Math.PI * 1.7);
      ctx.strokeStyle = "rgba(255,255,255,.12)"; ctx.lineWidth = 1.5; ctx.stroke();

      const fs = Math.max(8, Math.min(12, r * .6));
      ctx.font = `600 ${fs}px 'Titillium Web',-apple-system,sans-serif`;
      const textW = ctx.measureText(n.name).width;
      const labelY = n.y + r + fs + 4;
      ctx.fillStyle = "rgba(10,14,26,.75)";
      const pad = 5;
      ctx.beginPath(); ctx.roundRect(n.x - textW / 2 - pad, labelY - fs / 2 - 2, textW + pad * 2, fs + 4, 4); ctx.fill();
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = isSel || isHov ? "#fff" : "#cbd5e1";
      ctx.fillText(n.name, n.x, labelY);

      if (n.totalConnections > 5) {
        const bx = n.x + r * .7, by = n.y - r * .7;
        ctx.beginPath(); ctx.arc(bx, by, 8, 0, Math.PI * 2);
        ctx.fillStyle = n.erogati > 0 ? "#06d6a0" : "#118ab2"; ctx.fill();
        ctx.strokeStyle = "rgba(10,14,26,.6)"; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.font = "bold 8px 'Titillium Web',sans-serif"; ctx.fillStyle = "#fff";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(n.totalConnections, bx, by + .5);
      }
    });
    ctx.restore();
    afRef.current = requestAnimationFrame(draw);
  }, [selNode, hovNode, filterCat, search]);

  useEffect(() => { cancelAnimationFrame(afRef.current); draw(); }, [draw]);

  // ── Mouse interaction ───────────────────────────────────────

  function s2w(sx, sy) { const t = tRef.current; return { x: (sx - t.x) / t.k, y: (sy - t.y) / t.k }; }
  function findN(wx, wy) { for (let i = nodesRef.current.length - 1; i >= 0; i--) { const n = nodesRef.current[i], r = gR(n) + 4; if ((n.x - wx) ** 2 + (n.y - wy) ** 2 < r ** 2) return n; } return null; }
  const getXY = (e) => { const rc = canvasRef.current.getBoundingClientRect(); return { sx: (e.clientX - rc.left) * (canvasRef.current.width / rc.width), sy: (e.clientY - rc.top) * (canvasRef.current.height / rc.height) }; };

  const onMD = e => { const { sx, sy } = getXY(e); const { x: wx, y: wy } = s2w(sx, sy), nd = findN(wx, wy); if (nd) { dragRef.current = { node: nd, ox: wx - nd.x, oy: wy - nd.y }; nd.fx = nd.x; nd.fy = nd.y; setSelNode(nd); simRef.current?.reheat(); } else { panRef.current = { sx: e.clientX, sy: e.clientY, tx: tRef.current.x, ty: tRef.current.y }; setSelNode(null); } };
  const onMM = e => { const { sx, sy } = getXY(e); const { x: wx, y: wy } = s2w(sx, sy); if (dragRef.current) { dragRef.current.node.fx = wx - dragRef.current.ox; dragRef.current.node.fy = wy - dragRef.current.oy; simRef.current?.reheat(); } else if (panRef.current) { tRef.current.x = panRef.current.tx + e.clientX - panRef.current.sx; tRef.current.y = panRef.current.ty + e.clientY - panRef.current.sy; } else { const nd = findN(wx, wy); setHovNode(nd); canvasRef.current.style.cursor = nd ? "pointer" : "grab"; } };
  const onMU = () => { if (dragRef.current) { dragRef.current.node.fx = null; dragRef.current.node.fy = null; dragRef.current = null; simRef.current?.reheat(); } panRef.current = null; };
  const onWh = e => { e.preventDefault(); const { sx: mx, sy: my } = getXY(e); const t = tRef.current, f = e.deltaY < 0 ? 1.08 : .93, nk = Math.max(.15, Math.min(5, t.k * f)); t.x = mx - (mx - t.x) * (nk / t.k); t.y = my - (my - t.y) * (nk / t.k); t.k = nk; };

  // ── Touch interaction ───────────────────────────────────────

  const getTouchXY = (touch) => { const rc = canvasRef.current.getBoundingClientRect(); return { sx: (touch.clientX - rc.left) * (canvasRef.current.width / rc.width), sy: (touch.clientY - rc.top) * (canvasRef.current.height / rc.height) }; };

  const onTS = e => {
    e.preventDefault();
    if (e.touches.length === 1) {
      const { sx, sy } = getTouchXY(e.touches[0]);
      const { x: wx, y: wy } = s2w(sx, sy), nd = findN(wx, wy);
      if (nd) { dragRef.current = { node: nd, ox: wx - nd.x, oy: wy - nd.y }; nd.fx = nd.x; nd.fy = nd.y; setSelNode(nd); simRef.current?.reheat(); }
      else { panRef.current = { sx: e.touches[0].clientX, sy: e.touches[0].clientY, tx: tRef.current.x, ty: tRef.current.y }; setSelNode(null); }
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
      const mx = ((e.touches[0].clientX + e.touches[1].clientX) / 2 - rc.left) * (canvasRef.current.width / rc.width);
      const my = ((e.touches[0].clientY + e.touches[1].clientY) / 2 - rc.top) * (canvasRef.current.height / rc.height);
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

  // ── Resize ──────────────────────────────────────────────────

  useEffect(() => {
    const rs = () => { const c = canvasRef.current?.parentElement; if (!c) return; setDim({ w: c.clientWidth, h: c.clientHeight }); if (canvasRef.current) { canvasRef.current.width = c.clientWidth * 2; canvasRef.current.height = c.clientHeight * 2; } };
    rs(); window.addEventListener("resize", rs); return () => window.removeEventListener("resize", rs);
  }, []);

  // ── Render ──────────────────────────────────────────────────

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: m ? "6px 10px" : "6px 20px", background: "rgba(15,20,35,.5)", borderBottom: "1px solid rgba(100,160,220,.06)", flexWrap: "wrap", zIndex: 10 }}>
        <input type="text" placeholder="Cerca ente..." value={search} onChange={e => setSearch(e.target.value)} style={{ background: "rgba(30,40,60,.8)", border: "1px solid rgba(100,160,220,.2)", borderRadius: 6, padding: "5px 10px", color: "var(--ink)", fontSize: 12, outline: "none", width: m ? 120 : 160, flex: m ? 1 : undefined }} />
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ background: "rgba(30,40,60,.8)", border: "1px solid rgba(100,160,220,.2)", borderRadius: 6, padding: "5px 8px", color: "var(--ink)", fontSize: m ? 11 : 12, outline: "none" }}>{cats.map(c => <option key={c} value={c}>{c}</option>)}</select>
      </div>

      {/* Canvas. `minHeight: 0` è necessario: in una colonna flex il valore
          predefinito `min-height: auto` impedisce all'elemento di restringersi
          sotto la dimensione del contenuto, quindi il contenitore resterebbe
          alto quanto il canvas iniziale, sforando il viewport e spingendo fuori
          schermo il bordo inferiore del grafo e le legende. */}
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <canvas ref={canvasRef} width={dim.w * 2} height={dim.h * 2}
          role="img"
          aria-label="Grafo dell'interoperabilità tra Pubbliche Amministrazioni sulla PDND. Il contenuto del grafo è disponibile in forma testuale nella sezione Statistiche."
          style={{ width: "100%", height: "100%", cursor: "grab", touchAction: "none" }}
          onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU} onWheel={onWh}
          onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE} onTouchCancel={onTE}
        />

        {/* Legend */}
        <div className="graph-legend-desktop" style={{ position: "absolute", bottom: 12, left: 12, zIndex: 5, background: "rgba(10,14,26,.88)", borderRadius: 8, border: "1px solid rgba(100,160,220,.1)", padding: "8px 12px", display: "flex", flexWrap: "wrap", gap: "4px 12px", maxWidth: 380 }}>
            {Object.entries(CATEGORY_COLORS).map(([cat, col]) => (
              <div key={cat} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, cursor: "pointer", opacity: filterCat === "Tutte" || filterCat === cat ? 1 : .4 }} onClick={() => setFilterCat(filterCat === cat ? "Tutte" : cat)}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: col }} />
                <span style={{ color: "var(--ink-muted)" }}>{cat}</span>
              </div>
          ))}
        </div>

        {/* Legenda provenienza archi */}
        <div className="graph-legend-desktop" style={{ position: "absolute", bottom: 12, right: 12, zIndex: 5, background: "rgba(10,14,26,.88)", borderRadius: 8, border: "1px solid rgba(100,160,220,.1)", padding: "8px 12px", display: "flex", flexDirection: "column", gap: 5, fontSize: 9, color: "var(--ink-muted)" }}>
            <div style={{ fontSize: 8, textTransform: "uppercase", letterSpacing: .6, color: "var(--ink-faint)", marginBottom: 1 }}>Provenienza archi</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3" stroke="rgba(100,160,220,.9)" strokeWidth="1.6" /></svg><span>Documentata / Certificata</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3" stroke="rgba(100,160,220,.9)" strokeWidth="1.6" strokeDasharray="10,3" /></svg><span>Ricostruita (documentazione)</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3" stroke="rgba(100,160,220,.9)" strokeWidth="1.6" strokeDasharray="5,4" /></svg><span>Inferita (AI)</span></div>
        </div>

        {/* Detail panel */}
        {selNode && (
          <div style={{
            position: "absolute", right: 0, bottom: 0,
            ...(m ? { left: 0, top: "40%", borderTop: "1px solid rgba(100,160,220,.1)", borderRadius: "14px 14px 0 0" } : { top: 0, width: 330, borderLeft: "1px solid rgba(100,160,220,.1)" }),
            background: "rgba(10,14,26,.96)", padding: 16, overflowY: "auto", backdropFilter: "blur(14px)", zIndex: 10,
          }}>
            <button onClick={() => setSelNode(null)} aria-label="Chiudi dettaglio" style={{ position: "absolute", top: 10, right: 12, background: "none", border: "none", color: "var(--ink-faint)", fontSize: 16, cursor: "pointer", lineHeight: 1, zIndex: 1 }}>✕</button>
            <button
              onClick={() => { navigator.clipboard?.writeText(window.location.href); setCopiato(true); setTimeout(() => setCopiato(false), 1800); }}
              title="Copia il collegamento diretto a questo ente"
              style={{ position: "absolute", top: 10, right: 40, background: "none", border: "none", color: copiato ? "var(--pa-blue)" : "var(--ink-faint)", fontSize: 10, fontWeight: 600, cursor: "pointer", lineHeight: 1, zIndex: 1, fontFamily: "inherit", letterSpacing: .3 }}
            >{copiato ? "COPIATO" : "COPIA LINK"}</button>
            {m && <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(100,160,220,.2)", margin: "0 auto 12px" }} />}
            {(() => { const col = CATEGORY_COLORS[selNode.categoria] || "#667"; return (<div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: `linear-gradient(135deg,${col},${col}88)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, flexShrink: 0 }}>{selNode.name[0]}</div>
                <div><div style={{ fontWeight: 700, fontSize: 14 }}>{selNode.name}</div><div style={{ fontSize: 10, color: "var(--ink-faint)" }}>{selNode.categoria} · {selNode.tipo}</div></div>
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-muted)", marginBottom: 14 }}>{selNode.descrizione}</div>
              {selNode.id === "comuni_agg" && (
                <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 6, background: "rgba(255,209,102,.05)", border: "1px solid rgba(255,209,102,.18)" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--cite)", textTransform: "uppercase", letterSpacing: .8, marginBottom: 4 }}>ⓘ Tipi di servizio</div>
                  <div style={{ fontSize: 11, color: "var(--ink-muted)", lineHeight: 1.55 }}>
                    Gli e-service elencati qui sotto sono <strong style={{ color: "var(--ink)" }}>tipi di servizio</strong> aggregati: nel catalogo PDND ciascuno corrisponde a centinaia o migliaia di endpoint reali, uno per ogni Comune che lo pubblica. Per i dettagli vedi <em>Metodologia</em>.
                  </div>
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                {[["Erogati", selNode.erogati, "#06d6a0"], ["Fruiti", selNode.fruiti, "var(--pa-blue)"], ["Conn.", selNode.totalConnections, "#ef476f"]].map(([l, v, c]) => (
                  <div key={l} style={{ flex: 1, textAlign: "center", padding: "6px 2px", background: "rgba(30,40,60,.5)", borderRadius: 6, border: `1px solid ${c}22` }}><div style={{ fontSize: 16, fontWeight: 800, color: c }}>{v}</div><div style={{ fontSize: 8, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: .5 }}>{l}</div></div>
                ))}
              </div>
              {selNode.servizi_erogati?.length > 0 && <div style={{ marginBottom: 14 }}><div style={{ fontSize: 10, fontWeight: 700, color: "#06d6a0", textTransform: "uppercase", letterSpacing: .8, marginBottom: 6 }}>E-Services Erogati ({selNode.servizi_erogati.length})</div>{selNode.servizi_erogati.map(es => (
                <div key={es.id} style={{ padding: "6px 8px", marginBottom: 3, borderRadius: 5, background: "rgba(6,214,160,.05)", border: "1px solid rgba(6,214,160,.08)", fontSize: 11 }}><div style={{ fontWeight: 600 }}>{es.nome}</div>{es.descrizione && <div style={{ color: "var(--ink-faint)", fontSize: 9, marginTop: 1 }}>{es.descrizione}</div>}<div style={{ color: "#4a6a5a", fontSize: 9, marginTop: 2 }}>v{es.versione} · {es.stato} · {es.fruitori.length} fruitori</div></div>
              ))}</div>}
              {selNode.servizi_fruiti?.length > 0 && <div><div style={{ fontSize: 10, fontWeight: 700, color: "var(--pa-blue)", textTransform: "uppercase", letterSpacing: .8, marginBottom: 6 }}>E-Services Fruiti ({selNode.servizi_fruiti.length})</div>{selNode.servizi_fruiti.map(es => { const er = PDND_DATA.enti.find(e => e.id === es.erogatore); return (
                <div key={es.id + selNode.id} style={{ padding: "6px 8px", marginBottom: 3, borderRadius: 5, background: "rgba(17,138,178,.05)", border: "1px solid rgba(17,138,178,.08)", fontSize: 11 }}><div style={{ fontWeight: 600 }}>{es.nome}</div><div style={{ color: "var(--ink-faint)", fontSize: 9, marginTop: 1 }}>da {er?.name} · v{es.versione}</div></div>
              ); })}</div>}
            </div>); })()}
          </div>
        )}
      </div>
    </div>
  );
}
