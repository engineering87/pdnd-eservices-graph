import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import PDND_DATA from "../data/pdnd-data.json";

// ═══════════════════════════════════════════════════════════════════
// Dati importati da src/data/pdnd-data.json — aggiorna quel file
// per aggiungere nuovi enti o e-services.
// Fonte: github.com/italia/pdnd-opendata + catalogo api.gov.it
// ═══════════════════════════════════════════════════════════════════

const CATEGORY_COLORS = {
  Ministero: "#118ab2", Previdenza: "#06d6a0", Fisco: "#ef476f",
  Digitale: "#8338ec", Lavoro: "#ff6b35", Imprese: "#3d405b",
  Anticorruzione: "#e63946", Trasporti: "#457b9d", Cultura: "#d4a373",
  Statistica: "#81b29a", Tecnologia: "#f2cc8f", Regione: "#3a86a8",
  Comune: "#26547c", "Comuni Aggregati": "#4a7c91",
};

function buildGraph(data) {
  const nodes = data.enti.map((e) => {
    const er = data.eservices.filter((s) => s.erogatore === e.id);
    const fr = data.eservices.filter((s) => s.fruitori.includes(e.id));
    return { ...e, erogati: er.length, fruiti: fr.length, totalConnections: er.reduce((a, s) => a + s.fruitori.length, 0) + fr.length, servizi_erogati: er, servizi_fruiti: fr };
  });
  const links = [], lc = {};
  data.eservices.forEach((es) => es.fruitori.forEach((f) => {
    links.push({ source: es.erogatore, target: f, eservice: es.nome, eserviceId: es.id, versione: es.versione, stato: es.stato, descrizione: es.descrizione });
    const k = [es.erogatore, f].sort().join("--"); lc[k] = (lc[k] || 0) + 1;
  }));
  links.forEach((l) => { const k = [typeof l.source==="object"?l.source.id:l.source, typeof l.target==="object"?l.target.id:l.target].sort().join("--"); l.weight = lc[k]||1; });
  return { nodes, links, linkCounts: lc };
}

export default function PDNDGraph() {
  const canvasRef = useRef(null);
  const [dim, setDim] = useState({ w: 960, h: 700 });
  const [selNode, setSelNode] = useState(null);
  const [hovNode, setHovNode] = useState(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("Tutte");
  const [showPanel, setShowPanel] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const simRef = useRef(null);
  const nodesRef = useRef([]);
  const linksRef = useRef([]);
  const tRef = useRef({ x: 0, y: 0, k: 1 });
  const dragRef = useRef(null);
  const panRef = useRef(null);
  const afRef = useRef(null);
  const lcRef = useRef({});
  const graph = useRef(buildGraph(PDND_DATA));
  const cats = useMemo(() => ["Tutte", ...new Set(PDND_DATA.enti.map(e => e.categoria))], []);
  const stats = useMemo(() => ({ enti: PDND_DATA.enti.length, es: PDND_DATA.eservices.length, conn: PDND_DATA.eservices.reduce((a, e) => a + e.fruitori.length, 0) }), []);

  useEffect(() => {
    const { nodes, links, linkCounts } = graph.current;
    lcRef.current = linkCounts;
    const cx = dim.w / 2, cy = dim.h / 2;
    nodes.forEach(n => { n.x = cx + (Math.random() - .5) * 800; n.y = cy + (Math.random() - .5) * 600; });
    nodesRef.current = nodes;
    linksRef.current = links.map(l => ({ ...l, source: nodes.find(n => n.id === l.source) || l.source, target: nodes.find(n => n.id === l.target) || l.target }));
    simRef.current = mkSim(nodesRef.current, linksRef.current, cx, cy);
    draw();
    return () => { simRef.current.stop(); cancelAnimationFrame(afRef.current); };
  }, []);

  function mkSim(nodes, links, cx, cy) {
    const a = { current: 1 };
    function tick() {
      a.current *= .985; if (a.current < .001) a.current = 0;
      nodes.forEach(n => { n.vx = (n.vx||0) + (cx-n.x)*.005*a.current; n.vy = (n.vy||0) + (cy-n.y)*.005*a.current; });
      links.forEach(l => { const dx=l.target.x-l.source.x, dy=l.target.y-l.source.y, d=Math.sqrt(dx*dx+dy*dy)||1, f=(d-220)*.003*a.current; l.source.vx+=dx/d*f; l.source.vy+=dy/d*f; l.target.vx-=dx/d*f; l.target.vy-=dy/d*f; });
      for (let i=0;i<nodes.length;i++) for (let j=i+1;j<nodes.length;j++) { const dx=nodes[j].x-nodes[i].x,dy=nodes[j].y-nodes[i].y,d=Math.sqrt(dx*dx+dy*dy)||1,f=-2800/(d*d)*a.current; nodes[i].vx+=dx/d*f;nodes[i].vy+=dy/d*f;nodes[j].vx-=dx/d*f;nodes[j].vy-=dy/d*f; }
      nodes.forEach(n => { if(n.fx!=null){n.x=n.fx;n.vx=0}else{n.vx*=.55;n.x+=n.vx} if(n.fy!=null){n.y=n.fy;n.vy=0}else{n.vy*=.55;n.y+=n.vy} });
    }
    return { alpha: a, tick, stopped: false, reheat() { a.current = .3; }, stop() { this.stopped = true; } };
  }

  const draw = useCallback(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d"), t = tRef.current;
    if (simRef.current && !simRef.current.stopped) simRef.current.tick();
    ctx.clearRect(0,0,cv.width,cv.height); ctx.save(); ctx.translate(t.x,t.y); ctx.scale(t.k,t.k);
    const nodes = nodesRef.current, links = linksRef.current;
    const isFilt = filterCat !== "Tutte" || search;
    const vis = new Set();
    nodes.forEach(n => { if ((filterCat==="Tutte"||n.categoria===filterCat) && (!search||n.name.toLowerCase().includes(search.toLowerCase()))) vis.add(n.id); });
    links.forEach(l => {
      const s=l.source,tg=l.target; if(!s.x||!tg.x) return;
      if(isFilt&&!vis.has(s.id)&&!vis.has(tg.id)) return;
      const k=[s.id,tg.id].sort().join("--"), w=lcRef.current[k]||1;
      const hl=(selNode&&(s.id===selNode.id||tg.id===selNode.id))||(hovNode&&(s.id===hovNode.id||tg.id===hovNode.id));
      const dim2=isFilt&&(!vis.has(s.id)||!vis.has(tg.id));
      ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(tg.x,tg.y);
      ctx.strokeStyle=hl?`rgba(255,255,255,${.5+w*.04})`:dim2?"rgba(100,120,140,.05)":`rgba(100,160,220,${.05+w*.02})`;
      ctx.lineWidth=hl?1+w*.4:.3+w*.2;ctx.stroke();
      if(hl){const a2=Math.atan2(tg.y-s.y,tg.x-s.x),nr=gR(tg),ax=tg.x-Math.cos(a2)*(nr+4),ay=tg.y-Math.sin(a2)*(nr+4);ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(ax-Math.cos(a2-.3)*6,ay-Math.sin(a2-.3)*6);ctx.lineTo(ax-Math.cos(a2+.3)*6,ay-Math.sin(a2+.3)*6);ctx.closePath();ctx.fillStyle="rgba(255,255,255,.45)";ctx.fill();}
    });
    nodes.forEach(n => {
      if(!n.x) return;
      if(isFilt&&!vis.has(n.id)){const r=gR(n)*.4;ctx.beginPath();ctx.arc(n.x,n.y,r,0,Math.PI*2);ctx.fillStyle="rgba(40,50,65,.2)";ctx.fill();return;}
      const r=gR(n),col=CATEGORY_COLORS[n.categoria]||"#667",isSel=selNode?.id===n.id,isHov=hovNode?.id===n.id;
      if(isSel||isHov){const g=ctx.createRadialGradient(n.x,n.y,r,n.x,n.y,r*3);g.addColorStop(0,col+"44");g.addColorStop(1,col+"00");ctx.beginPath();ctx.arc(n.x,n.y,r*3,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();}
      ctx.beginPath();ctx.arc(n.x,n.y,r,0,Math.PI*2);
      const g2=ctx.createRadialGradient(n.x-r*.3,n.y-r*.3,0,n.x,n.y,r);g2.addColorStop(0,lgt(col,40));g2.addColorStop(1,col);ctx.fillStyle=g2;ctx.fill();
      ctx.strokeStyle=isSel?"#fff":isHov?"rgba(255,255,255,.7)":"rgba(255,255,255,.1)";ctx.lineWidth=isSel?2.5:isHov?1.5:.7;ctx.stroke();
      const fs=Math.max(7,Math.min(11,r*.55));ctx.font=`600 ${fs}px 'SF Pro Display',-apple-system,sans-serif`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillStyle="#fff";ctx.shadowColor="rgba(0,0,0,.9)";ctx.shadowBlur=4;ctx.fillText(n.name,n.x,n.y+r+fs+2);ctx.shadowBlur=0;
      if(n.totalConnections>5){const bx=n.x+r*.6,by=n.y-r*.6;ctx.beginPath();ctx.arc(bx,by,6,0,Math.PI*2);ctx.fillStyle=n.erogati>0?"#06d6a0":"#118ab2";ctx.fill();ctx.font="bold 7px sans-serif";ctx.fillStyle="#fff";ctx.fillText(n.totalConnections,bx,by+.5);}
    });
    ctx.restore();
    afRef.current = requestAnimationFrame(draw);
  }, [selNode, hovNode, filterCat, search]);

  useEffect(() => { cancelAnimationFrame(afRef.current); draw(); }, [draw]);

  function gR(n) { return 11 + Math.sqrt(n.totalConnections) * 3.5; }
  function lgt(h, p) { const n=parseInt(h.replace("#",""),16); return `rgb(${Math.min(255,(n>>16)+p)},${Math.min(255,((n>>8)&0xff)+p)},${Math.min(255,(n&0xff)+p)})`; }
  function s2w(sx,sy) { const t=tRef.current; return{x:(sx-t.x)/t.k,y:(sy-t.y)/t.k}; }
  function findN(wx,wy) { for(let i=nodesRef.current.length-1;i>=0;i--){const n=nodesRef.current[i],r=gR(n)+4;if((n.x-wx)**2+(n.y-wy)**2<r**2)return n;}return null; }

  const onMD = e => { const rc=canvasRef.current.getBoundingClientRect(),sx=(e.clientX-rc.left)*(canvasRef.current.width/rc.width),sy=(e.clientY-rc.top)*(canvasRef.current.height/rc.height),{x:wx,y:wy}=s2w(sx,sy),nd=findN(wx,wy);if(nd){dragRef.current={node:nd,ox:wx-nd.x,oy:wy-nd.y};nd.fx=nd.x;nd.fy=nd.y;setSelNode(nd);simRef.current?.reheat();}else{panRef.current={sx:e.clientX,sy:e.clientY,tx:tRef.current.x,ty:tRef.current.y};setSelNode(null);} };
  const onMM = e => { const rc=canvasRef.current.getBoundingClientRect(),sx=(e.clientX-rc.left)*(canvasRef.current.width/rc.width),sy=(e.clientY-rc.top)*(canvasRef.current.height/rc.height),{x:wx,y:wy}=s2w(sx,sy);if(dragRef.current){dragRef.current.node.fx=wx-dragRef.current.ox;dragRef.current.node.fy=wy-dragRef.current.oy;simRef.current?.reheat();}else if(panRef.current){tRef.current.x=panRef.current.tx+e.clientX-panRef.current.sx;tRef.current.y=panRef.current.ty+e.clientY-panRef.current.sy;}else{const nd=findN(wx,wy);setHovNode(nd);canvasRef.current.style.cursor=nd?"pointer":"grab";} };
  const onMU = () => { if(dragRef.current){dragRef.current.node.fx=null;dragRef.current.node.fy=null;dragRef.current=null;simRef.current?.reheat();}panRef.current=null; };
  const onWh = e => { e.preventDefault();const rc=canvasRef.current.getBoundingClientRect(),mx=(e.clientX-rc.left)*(canvasRef.current.width/rc.width),my=(e.clientY-rc.top)*(canvasRef.current.height/rc.height),t=tRef.current,f=e.deltaY<0?1.08:.93,nk=Math.max(.15,Math.min(5,t.k*f));t.x=mx-(mx-t.x)*(nk/t.k);t.y=my-(my-t.y)*(nk/t.k);t.k=nk; };

  useEffect(() => {
    const rs = () => { const c=canvasRef.current?.parentElement;if(!c)return;setDim({w:c.clientWidth,h:c.clientHeight});if(canvasRef.current){canvasRef.current.width=c.clientWidth*2;canvasRef.current.height=c.clientHeight*2;} };
    rs();window.addEventListener("resize",rs);return()=>window.removeEventListener("resize",rs);
  },[]);

  return (
    <div style={{width:"100%",height:"100vh",background:"linear-gradient(145deg,#0a0e1a 0%,#111827 40%,#0d1525 100%)",fontFamily:"'SF Pro Display',-apple-system,sans-serif",color:"#e2e8f0",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 20px",borderBottom:"1px solid rgba(100,160,220,.15)",background:"rgba(10,14,26,.7)",backdropFilter:"blur(12px)",zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:34,height:34,borderRadius:8,background:"linear-gradient(135deg,#06d6a0,#118ab2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:"#fff"}}>P</div>
          <div><div style={{fontSize:15,fontWeight:700}}>PDND E-Services Graph</div><div style={{fontSize:10,color:"#64748b",letterSpacing:.5,textTransform:"uppercase"}}>Mappa interattiva dell'interoperabilità tra le PA italiane</div></div>
        </div>
        <div style={{display:"flex",gap:18,fontSize:11}}>
          {[["Enti",stats.enti,"#06d6a0"],["E-Services",stats.es,"#ffd166"],["Connessioni",stats.conn,"#ef476f"]].map(([l,v,c])=>(
            <div key={l} style={{textAlign:"center"}}><div style={{fontSize:18,fontWeight:800,color:c}}>{v}</div><div style={{color:"#64748b",fontSize:9,letterSpacing:.5,textTransform:"uppercase"}}>{l}</div></div>
          ))}
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 20px",background:"rgba(15,20,35,.6)",borderBottom:"1px solid rgba(100,160,220,.08)",flexWrap:"wrap",zIndex:10}}>
        <input type="text" placeholder="Cerca ente..." value={search} onChange={e=>setSearch(e.target.value)} style={{background:"rgba(30,40,60,.8)",border:"1px solid rgba(100,160,220,.2)",borderRadius:6,padding:"5px 10px",color:"#e2e8f0",fontSize:12,outline:"none",width:160}}/>
        <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{background:"rgba(30,40,60,.8)",border:"1px solid rgba(100,160,220,.2)",borderRadius:6,padding:"5px 8px",color:"#e2e8f0",fontSize:12,outline:"none"}}>{cats.map(c=><option key={c} value={c}>{c}</option>)}</select>
        <button onClick={()=>setShowPanel(p=>!p)} style={{marginLeft:"auto",background:showPanel?"rgba(6,214,160,.15)":"rgba(30,40,60,.8)",border:`1px solid ${showPanel?"rgba(6,214,160,.4)":"rgba(100,160,220,.2)"}`,borderRadius:6,padding:"5px 12px",color:"#e2e8f0",fontSize:11,cursor:"pointer"}}>{showPanel?"Nascondi":"Mostra"} Dettagli</button>
        <button onClick={()=>setShowInfo(p=>!p)} style={{background:showInfo?"rgba(131,56,236,.15)":"rgba(30,40,60,.8)",border:`1px solid ${showInfo?"rgba(131,56,236,.4)":"rgba(100,160,220,.2)"}`,borderRadius:6,padding:"5px 12px",color:"#e2e8f0",fontSize:11,cursor:"pointer"}}>ℹ Info</button>
      </div>
      <div style={{position:"absolute",bottom:12,left:12,zIndex:10,background:"rgba(10,14,26,.88)",borderRadius:8,border:"1px solid rgba(100,160,220,.12)",padding:"8px 12px",display:"flex",flexWrap:"wrap",gap:"4px 12px",maxWidth:380}}>
        {Object.entries(CATEGORY_COLORS).map(([cat,col])=>(<div key={cat} style={{display:"flex",alignItems:"center",gap:4,fontSize:9,cursor:"pointer",opacity:filterCat==="Tutte"||filterCat===cat?1:.4}} onClick={()=>setFilterCat(filterCat===cat?"Tutte":cat)}><div style={{width:7,height:7,borderRadius:"50%",background:col}}/><span style={{color:"#94a3b8"}}>{cat}</span></div>))}
      </div>
      <div style={{position:"absolute",bottom:12,right:showPanel&&selNode?336:12,zIndex:10,background:"rgba(10,14,26,.85)",borderRadius:6,border:"1px solid rgba(100,160,220,.1)",padding:"6px 10px",fontSize:9,color:"#64748b"}}>
        Dati: <span style={{color:"#94a3b8"}}>github.com/italia/pdnd-opendata</span> (CC0) · Connessioni: <span style={{color:"#94a3b8"}}>da doc. ufficiale</span> · <a href="https://github.com/engineering87/pdnd-eservices-graph/blob/main/METODOLOGIA.md" target="_blank" rel="noopener" style={{color:"#64b5f6",textDecoration:"none"}}>Metodologia</a>
      </div>
      {/* Info overlay */}
      {showInfo&&(
        <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.6)",backdropFilter:"blur(6px)"}} onClick={()=>setShowInfo(false)}>
          <div style={{background:"linear-gradient(145deg,#131a2e,#0f1623)",border:"1px solid rgba(100,160,220,.2)",borderRadius:14,padding:"28px 32px",maxWidth:480,width:"90%",position:"relative"}} onClick={e=>e.stopPropagation()}>
            <button onClick={()=>setShowInfo(false)} style={{position:"absolute",top:12,right:14,background:"none",border:"none",color:"#64748b",fontSize:18,cursor:"pointer",lineHeight:1}}>✕</button>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
              <div style={{width:42,height:42,borderRadius:10,background:"linear-gradient(135deg,#06d6a0,#118ab2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:800,color:"#fff",flexShrink:0}}>P</div>
              <div>
                <div style={{fontSize:17,fontWeight:700,color:"#e2e8f0"}}>PDND E-Services Graph</div>
                <div style={{fontSize:11,color:"#64748b"}}>Mappa interattiva dell'interoperabilità tra le PA italiane</div>
              </div>
            </div>
            <div style={{fontSize:13,color:"#94a3b8",lineHeight:1.6,marginBottom:16}}>
              Visualizzazione interattiva del grafo degli e-services pubblicati sulla Piattaforma Digitale Nazionale Dati (PDND). I nodi rappresentano gli enti erogatori e fruitori, gli archi le relazioni di interoperabilità tramite e-service.
            </div>
            <div style={{borderTop:"1px solid rgba(100,160,220,.1)",paddingTop:14,marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:700,color:"#8338ec",textTransform:"uppercase",letterSpacing:.8,marginBottom:8}}>Autore</div>
              <div style={{fontSize:13,color:"#e2e8f0",fontWeight:600}}>Francesco Del Re</div>
            </div>
            <div style={{borderTop:"1px solid rgba(100,160,220,.1)",paddingTop:14,marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:700,color:"#118ab2",textTransform:"uppercase",letterSpacing:.8,marginBottom:8}}>Repository</div>
              <a href="https://github.com/engineering87/pdnd-eservices-graph" target="_blank" rel="noopener" style={{fontSize:13,color:"#64b5f6",textDecoration:"none",wordBreak:"break-all"}}>github.com/engineering87/pdnd-eservices-graph</a>
            </div>
            <div style={{borderTop:"1px solid rgba(100,160,220,.1)",paddingTop:14,marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:700,color:"#06d6a0",textTransform:"uppercase",letterSpacing:.8,marginBottom:8}}>Fonti dati</div>
              <div style={{fontSize:12,color:"#94a3b8",lineHeight:1.7}}>
                <div><span style={{color:"#e2e8f0"}}>Enti e e-services:</span> <a href="https://github.com/italia/pdnd-opendata" target="_blank" rel="noopener" style={{color:"#64b5f6",textDecoration:"none"}}>github.com/italia/pdnd-opendata</a> (CC0 1.0)</div>
                <div><span style={{color:"#e2e8f0"}}>Connessioni erogatore–fruitore:</span> ricostruite da documentazione ufficiale pubblica (circolari, manuali, campo attributes del catalogo)</div>
                <div><span style={{color:"#e2e8f0"}}>Comuni:</span> i ~7.500 Comuni aderenti con servizi standard sono aggregati in un unico nodo</div>
              </div>
            </div>
            <div style={{borderTop:"1px solid rgba(100,160,220,.1)",paddingTop:14}}>
              <div style={{fontSize:11,color:"#64748b",lineHeight:1.5}}>
                Per la metodologia completa, le fonti puntuali e le limitazioni note, consulta{" "}
                <a href="https://github.com/engineering87/pdnd-eservices-graph/blob/main/METODOLOGIA.md" target="_blank" rel="noopener" style={{color:"#64b5f6",textDecoration:"none"}}>METODOLOGIA.md</a> nel repository.
              </div>
            </div>
            <div style={{marginTop:16,textAlign:"center"}}>
              <div style={{fontSize:10,color:"#475569"}}>Licenza AGPL-3.0 · Dati CC0 Presidenza del Consiglio dei Ministri</div>
            </div>
          </div>
        </div>
      )}
      <div style={{flex:1,display:"flex",position:"relative",overflow:"hidden"}}>
        <div style={{flex:1,position:"relative"}}>
          <canvas ref={canvasRef} width={dim.w*2} height={dim.h*2} style={{width:"100%",height:"100%",cursor:"grab"}} onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU} onWheel={onWh}/>
          {!selNode&&<div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",textAlign:"center",pointerEvents:"none",opacity:.3}}><div style={{fontSize:13}}>Clicca un nodo per i dettagli</div><div style={{fontSize:11,marginTop:3}}>Trascina • Scroll zoom • Clicca legenda per filtrare</div></div>}
        </div>
        {showPanel&&selNode&&(
          <div style={{width:320,background:"rgba(10,14,26,.92)",borderLeft:"1px solid rgba(100,160,220,.12)",padding:16,overflowY:"auto",backdropFilter:"blur(12px)"}}>
            {(()=>{const col=CATEGORY_COLORS[selNode.categoria]||"#667";return(<div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                <div style={{width:38,height:38,borderRadius:"50%",background:`linear-gradient(135deg,${col},${col}88)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,flexShrink:0}}>{selNode.name[0]}</div>
                <div><div style={{fontWeight:700,fontSize:14}}>{selNode.name}</div><div style={{fontSize:10,color:"#64748b"}}>{selNode.categoria} • {selNode.tipo}</div></div>
              </div>
              <div style={{fontSize:12,color:"#94a3b8",marginBottom:14}}>{selNode.descrizione}</div>
              <div style={{display:"flex",gap:8,marginBottom:16}}>
                {[["Erogati",selNode.erogati,"#06d6a0"],["Fruiti",selNode.fruiti,"#118ab2"],["Conn.",selNode.totalConnections,"#ef476f"]].map(([l,v,c])=>(
                  <div key={l} style={{flex:1,textAlign:"center",padding:"6px 2px",background:"rgba(30,40,60,.5)",borderRadius:6,border:`1px solid ${c}22`}}><div style={{fontSize:16,fontWeight:800,color:c}}>{v}</div><div style={{fontSize:8,color:"#64748b",textTransform:"uppercase",letterSpacing:.5}}>{l}</div></div>
                ))}
              </div>
              {selNode.servizi_erogati?.length>0&&<div style={{marginBottom:14}}><div style={{fontSize:10,fontWeight:700,color:"#06d6a0",textTransform:"uppercase",letterSpacing:.8,marginBottom:6}}>E-Services Erogati ({selNode.servizi_erogati.length})</div>{selNode.servizi_erogati.map(es=>(
                <div key={es.id} style={{padding:"6px 8px",marginBottom:3,borderRadius:5,background:"rgba(6,214,160,.05)",border:"1px solid rgba(6,214,160,.08)",fontSize:11}}><div style={{fontWeight:600}}>{es.nome}</div>{es.descrizione&&<div style={{color:"#64748b",fontSize:9,marginTop:1}}>{es.descrizione}</div>}<div style={{color:"#4a6a5a",fontSize:9,marginTop:2}}>v{es.versione} • {es.stato} • {es.fruitori.length} fruitori</div></div>
              ))}</div>}
              {selNode.servizi_fruiti?.length>0&&<div><div style={{fontSize:10,fontWeight:700,color:"#118ab2",textTransform:"uppercase",letterSpacing:.8,marginBottom:6}}>E-Services Fruiti ({selNode.servizi_fruiti.length})</div>{selNode.servizi_fruiti.map(es=>{const er=PDND_DATA.enti.find(e=>e.id===es.erogatore);return(
                <div key={es.id+selNode.id} style={{padding:"6px 8px",marginBottom:3,borderRadius:5,background:"rgba(17,138,178,.05)",border:"1px solid rgba(17,138,178,.08)",fontSize:11}}><div style={{fontWeight:600}}>{es.nome}</div><div style={{color:"#64748b",fontSize:9,marginTop:1}}>da {er?.name} • v{es.versione}</div></div>
              );})}</div>}
            </div>);})()}
          </div>
        )}
      </div>
    </div>
  );
}
