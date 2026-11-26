/**
 * Disposizione della mappa: raggio dei nodi, simulazione a forze e posizioni
 * iniziali. Codice puro, senza React né canvas, così si può verificare nei test
 * (scripts/test-model.mjs).
 */

// Raggio del nodo. Cresce con la radice dei legami, così gli hub restano
// riconoscibili senza coprire i vicini (da 11 a circa 48 px).
export function gR(n) { return 7 + Math.sqrt(n.totalConnections) * 2.4; }

// Simulazione a forze minimale: muta in posto le posizioni dei nodi.
export function mkSim(nodes, links, cx, cy) {
  const a = { current: 1 };
  function tick() {
    a.current *= .985; if (a.current < .001) a.current = 0;
    nodes.forEach(n => { n.vx = (n.vx || 0) + (cx - n.x) * .005 * a.current; n.vy = (n.vy || 0) + (cy - n.y) * .005 * a.current; });
    links.forEach(l => { const dx = l.target.x - l.source.x, dy = l.target.y - l.source.y, d = Math.sqrt(dx * dx + dy * dy) || 1, f = (d - 170) * .002 * a.current; l.source.vx += dx / d * f; l.source.vy += dy / d * f; l.target.vx -= dx / d * f; l.target.vy -= dy / d * f; });
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y, d = Math.sqrt(dx * dx + dy * dy) || 1;
      // Distanza minima nel calcolo della repulsione: due nodi che partono quasi
      // sovrapposti riceverebbero altrimenti una spinta enorme e uno finirebbe
      // fuori dalla mappa. Alla sovrapposizione pensa la collisione qui sotto.
      const dr = Math.max(d, 30);
      const f = -5200 / (dr * dr) * a.current;
      nodes[i].vx += dx / d * f; nodes[i].vy += dy / d * f; nodes[j].vx -= dx / d * f; nodes[j].vy -= dy / d * f;
      // Collisione: due nodi non si sovrappongono mai, nemmeno a simulazione
      // ferma o dopo un trascinamento. Non dipende da alpha di proposito.
      const min = gR(nodes[i]) + gR(nodes[j]) + 10;
      if (d < min) { const p = (min - d) * .25; nodes[i].vx -= dx / d * p; nodes[i].vy -= dy / d * p; nodes[j].vx += dx / d * p; nodes[j].vy += dy / d * p; }
    }
    nodes.forEach(n => { if (n.fx != null) { n.x = n.fx; n.vx = 0; } else { n.vx *= .55; n.x += n.vx; } if (n.fy != null) { n.y = n.fy; n.vy = 0; } else { n.vy *= .55; n.y += n.vy; } });
  }
  return { alpha: a, tick, stopped: false, reheat() { a.current = .3; }, stop() { this.stopped = true; } };
}

// Due numeri in [0, 1) ricavati da una stringa (FNV-1a), stabili fra le sessioni.
export function posizioneDaId(id) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  const a = (h >>> 0) / 4294967296;
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  return [a, (h >>> 0) / 4294967296];
}
