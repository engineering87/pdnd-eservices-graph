import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import PDND_DATA from "../data/pdnd-data.json";
import { CATEGORY_COLORS } from "../constants/colors";
import { buildGraph } from "../utils/buildGraph";

function gR(n) { return 14 + Math.sqrt(n.totalConnections) * 4.5; }

function lgt(hex, amount) {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgb(${Math.max(0, Math.min(255, (n >> 16) + amount))},${Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amount))},${Math.max(0, Math.min(255, (n & 0xff) + amount))})`;
}

export default function GraphView() {
  const canvasRef = useRef(null);
  const [dim, setDim] = useState({ w: 960, h: 700 });
  const [selNode, setSelNode] = useState(null);
  const [hovNode, setHovNode] = useState(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("Tutte");
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

    // Background gradient
    const bgGrad = ctx.createRadialGradient(cv.width / 2, cv.height / 2, 0, cv.width / 2, cv.height / 2, cv.width * .6);
    bgGrad.addColorStop(0, "rgba(20,28,50,.3)");
    bgGrad.addColorStop(1, "rgba(10,14,26,0)");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, cv.width, cv.height);

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
      const dx = tg.x - s.x, dy = tg.y - s.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const curvature = w > 1 ? 12 : 0;
      const cx2 = mx + (-dy / dist) * curvature, cy2 = my + (dx / dist) * curvature;

      ctx.beginPath();
      if (curvature > 0) { ctx.moveTo(s.x, s.y); ctx.quadraticCurveTo(cx2, cy2, tg.x, tg.y); }
      else { ctx.moveTo(s.x, s.y); ctx.lineTo(tg.x, tg.y); }

      if (hl) { ctx.strokeStyle = `rgba(200,220,255,${.4 + w * .06})`; ctx.lineWidth = 1.5 + w * .5; ctx.shadowColor = "rgba(100,180,255,.3)"; ctx.shadowBlur = 6; }
      else if (dim2) { ctx.strokeStyle = "rgba(100,120,140,.04)"; ctx.lineWidth = .3; }
      else { ctx.strokeStyle = `rgba(100,160,220,${.08 + w * .03})`; ctx.lineWidth = .5 + w * .3; }
      ctx.stroke(); ctx.shadowBlur = 0;

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

      // Outer glow
      if (isSel || isHov) {
        const g = ctx.createRadialGradient(n.x, n.y, r * .5, n.x, n.y, r * 4);
        g.addColorStop(0, col + "55"); g.addColorStop(.5, col + "18"); g.addColorStop(1, col + "00");
        ctx.beginPath(); ctx.arc(n.x, n.y, r * 4, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
      }

      // Ambient glow
      const ambGlow = ctx.createRadialGradient(n.x, n.y, r, n.x, n.y, r * 2);
      ambGlow.addColorStop(0, col + "12"); ambGlow.addColorStop(1, col + "00");
      ctx.beginPath(); ctx.arc(n.x, n.y, r * 2, 0, Math.PI * 2); ctx.fillStyle = ambGlow; ctx.fill();

      // Body
      ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      const g2 = ctx.createRadialGradient(n.x - r * .35, n.y - r * .35, 0, n.x, n.y, r);
      g2.addColorStop(0, lgt(col, 60)); g2.addColorStop(.7, col); g2.addColorStop(1, lgt(col, -20));
      ctx.fillStyle = g2; ctx.fill();

      // Ring
      ctx.strokeStyle = isSel ? "#fff" : isHov ? "rgba(255,255,255,.8)" : col + "40";
      ctx.lineWidth = isSel ? 2.5 : isHov ? 2 : 1;
      ctx.stroke();

      // Inner highlight
      ctx.beginPath(); ctx.arc(n.x, n.y, r * .75, Math.PI * 1.1, Math.PI * 1.7);
      ctx.strokeStyle = "rgba(255,255,255,.12)"; ctx.lineWidth = 1.5; ctx.stroke();

      // Label
      const fs = Math.max(8, Math.min(12, r * .6));
      ctx.font = `600 ${fs}px 'DM Sans',-apple-system,sans-serif`;
      const textW = ctx.measureText(n.name).width;
      const labelY = n.y + r + fs + 4;
      ctx.fillStyle = "rgba(10,14,26,.75)";
      const pad = 5;
      ctx.beginPath(); ctx.roundRect(n.x - textW / 2 - pad, labelY - fs / 2 - 2, textW + pad * 2, fs + 4, 4); ctx.fill();
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = isSel || isHov ? "#fff" : "#cbd5e1";
      ctx.fillText(n.name, n.x, labelY);

      // Badge
      if (n.totalConnections > 5) {
        const bx = n.x + r * .7, by = n.y - r * .7;
        ctx.beginPath(); ctx.arc(bx, by, 8, 0, Math.PI * 2);
        ctx.fillStyle = n.erogati > 0 ? "#06d6a0" : "#118ab2"; ctx.fill();
        ctx.strokeStyle = "rgba(10,14,26,.6)"; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.font = "bold 8px 'DM Sans',sans-serif"; ctx.fillStyle = "#fff";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(n.totalConnections, bx, by + .5);
      }
    });
    ctx.restore();
    afRef.current = requestAnimationFrame(draw);
  }, [selNode, hovNode, filterCat, search]);

  useEffect(() => { cancelAnimationFrame(afRef.current); draw(); }, [draw]);

  // ── Interaction ─────────────────────────────────────────────

  function s2w(sx, sy) { const t = tRef.current; return { x: (sx - t.x) / t.k, y: (sy - t.y) / t.k }; }
  function findN(wx, wy) { for (let i = nodesRef.current.length - 1; i >= 0; i--) { const n = nodesRef.current[i], r = gR(n) + 4; if ((n.x - wx) ** 2 + (n.y - wy) ** 2 < r ** 2) return n; } return null; }
  const getXY = (e) => { const rc = canvasRef.current.getBoundingClientRect(); return { sx: (e.clientX - rc.left) * (canvasRef.current.width / rc.width), sy: (e.clientY - rc.top) * (canvasRef.current.height / rc.height) }; };

  const onMD = e => { const { sx, sy } = getXY(e); const { x: wx, y: wy } = s2w(sx, sy), nd = findN(wx, wy); if (nd) { dragRef.current = { node: nd, ox: wx - nd.x, oy: wy - nd.y }; nd.fx = nd.x; nd.fy = nd.y; setSelNode(nd); simRef.current?.reheat(); } else { panRef.current = { sx: e.clientX, sy: e.clientY, tx: tRef.current.x, ty: tRef.current.y }; setSelNode(null); } };
  const onMM = e => { const { sx, sy } = getXY(e); const { x: wx, y: wy } = s2w(sx, sy); if (dragRef.current) { dragRef.current.node.fx = wx - dragRef.current.ox; dragRef.current.node.fy = wy - dragRef.current.oy; simRef.current?.reheat(); } else if (panRef.current) { tRef.current.x = panRef.current.tx + e.clientX - panRef.current.sx; tRef.current.y = panRef.current.ty + e.clientY - panRef.current.sy; } else { const nd = findN(wx, wy); setHovNode(nd); canvasRef.current.style.cursor = nd ? "pointer" : "grab"; } };
  const onMU = () => { if (dragRef.current) { dragRef.current.node.fx = null; dragRef.current.node.fy = null; dragRef.current = null; simRef.current?.reheat(); } panRef.current = null; };
  const onWh = e => { e.preventDefault(); const { sx: mx, sy: my } = getXY(e); const t = tRef.current, f = e.deltaY < 0 ? 1.08 : .93, nk = Math.max(.15, Math.min(5, t.k * f)); t.x = mx - (mx - t.x) * (nk / t.k); t.y = my - (my - t.y) * (nk / t.k); t.k = nk; };

  useEffect(() => {
    const rs = () => { const c = canvasRef.current?.parentElement; if (!c) return; setDim({ w: c.clientWidth, h: c.clientHeight }); if (canvasRef.current) { canvasRef.current.width = c.clientWidth * 2; canvasRef.current.height = c.clientHeight * 2; } };
    rs(); window.addEventListener("resize", rs); return () => window.removeEventListener("resize", rs);
  }, []);

  // ── Render ──────────────────────────────────────────────────

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 20px", background: "rgba(15,20,35,.5)", borderBottom: "1px solid rgba(100,160,220,.06)", flexWrap: "wrap", zIndex: 10 }}>
        <input type="text" placeholder="Cerca ente..." value={search} onChange={e => setSearch(e.target.value)} style={{ background: "rgba(30,40,60,.8)", border: "1px solid rgba(100,160,220,.2)", borderRadius: 6, padding: "5px 10px", color: "#e2e8f0", fontSize: 12, outline: "none", width: 160 }} />
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ background: "rgba(30,40,60,.8)", border: "1px solid rgba(100,160,220,.2)", borderRadius: 6, padding: "5px 8px", color: "#e2e8f0", fontSize: 12, outline: "none" }}>{cats.map(c => <option key={c} value={c}>{c}</option>)}</select>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, position: "relative" }}>
        <canvas ref={canvasRef} width={dim.w * 2} height={dim.h * 2} style={{ width: "100%", height: "100%", cursor: "grab" }} onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU} onWheel={onWh} />

        {/* Legend */}
        <div style={{ position: "absolute", bottom: 12, left: 12, background: "rgba(10,14,26,.88)", borderRadius: 8, border: "1px solid rgba(100,160,220,.1)", padding: "8px 12px", display: "flex", flexWrap: "wrap", gap: "4px 12px", maxWidth: 380 }}>
          {Object.entries(CATEGORY_COLORS).map(([cat, col]) => (
            <div key={cat} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, cursor: "pointer", opacity: filterCat === "Tutte" || filterCat === cat ? 1 : .4 }} onClick={() => setFilterCat(filterCat === cat ? "Tutte" : cat)}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: col }} />
              <span style={{ color: "#94a3b8" }}>{cat}</span>
            </div>
          ))}
        </div>

        {/* Detail panel */}
        {selNode && (
          <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 330, background: "rgba(10,14,26,.94)", borderLeft: "1px solid rgba(100,160,220,.1)", padding: 16, overflowY: "auto", backdropFilter: "blur(14px)", zIndex: 10 }}>
            <button onClick={() => setSelNode(null)} style={{ position: "absolute", top: 10, right: 12, background: "none", border: "none", color: "#64748b", fontSize: 16, cursor: "pointer", lineHeight: 1, zIndex: 1 }}>✕</button>
            {(() => { const col = CATEGORY_COLORS[selNode.categoria] || "#667"; return (<div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: `linear-gradient(135deg,${col},${col}88)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, flexShrink: 0 }}>{selNode.name[0]}</div>
                <div><div style={{ fontWeight: 700, fontSize: 14 }}>{selNode.name}</div><div style={{ fontSize: 10, color: "#64748b" }}>{selNode.categoria} · {selNode.tipo}</div></div>
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 14 }}>{selNode.descrizione}</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                {[["Erogati", selNode.erogati, "#06d6a0"], ["Fruiti", selNode.fruiti, "#118ab2"], ["Conn.", selNode.totalConnections, "#ef476f"]].map(([l, v, c]) => (
                  <div key={l} style={{ flex: 1, textAlign: "center", padding: "6px 2px", background: "rgba(30,40,60,.5)", borderRadius: 6, border: `1px solid ${c}22` }}><div style={{ fontSize: 16, fontWeight: 800, color: c }}>{v}</div><div style={{ fontSize: 8, color: "#64748b", textTransform: "uppercase", letterSpacing: .5 }}>{l}</div></div>
                ))}
              </div>
              {selNode.servizi_erogati?.length > 0 && <div style={{ marginBottom: 14 }}><div style={{ fontSize: 10, fontWeight: 700, color: "#06d6a0", textTransform: "uppercase", letterSpacing: .8, marginBottom: 6 }}>E-Services Erogati ({selNode.servizi_erogati.length})</div>{selNode.servizi_erogati.map(es => (
                <div key={es.id} style={{ padding: "6px 8px", marginBottom: 3, borderRadius: 5, background: "rgba(6,214,160,.05)", border: "1px solid rgba(6,214,160,.08)", fontSize: 11 }}><div style={{ fontWeight: 600 }}>{es.nome}</div>{es.descrizione && <div style={{ color: "#64748b", fontSize: 9, marginTop: 1 }}>{es.descrizione}</div>}<div style={{ color: "#4a6a5a", fontSize: 9, marginTop: 2 }}>v{es.versione} · {es.stato} · {es.fruitori.length} fruitori</div></div>
              ))}</div>}
              {selNode.servizi_fruiti?.length > 0 && <div><div style={{ fontSize: 10, fontWeight: 700, color: "#118ab2", textTransform: "uppercase", letterSpacing: .8, marginBottom: 6 }}>E-Services Fruiti ({selNode.servizi_fruiti.length})</div>{selNode.servizi_fruiti.map(es => { const er = PDND_DATA.enti.find(e => e.id === es.erogatore); return (
                <div key={es.id + selNode.id} style={{ padding: "6px 8px", marginBottom: 3, borderRadius: 5, background: "rgba(17,138,178,.05)", border: "1px solid rgba(17,138,178,.08)", fontSize: 11 }}><div style={{ fontWeight: 600 }}>{es.nome}</div><div style={{ color: "#64748b", fontSize: 9, marginTop: 1 }}>da {er?.name} · v{es.versione}</div></div>
              ); })}</div>}
            </div>); })()}
          </div>
        )}
      </div>
    </div>
  );
}
