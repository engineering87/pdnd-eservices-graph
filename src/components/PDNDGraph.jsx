import { useState, useMemo, useEffect } from "react";
import PDND_DATA from "../data/pdnd-data.json";
import { buildGraph } from "../utils/buildGraph";
import Header from "./Header";
import Footer from "./Footer";
import AboutModal from "./AboutModal";
import GraphView from "./GraphView";
import StatsView from "./StatsView";
import ExploreView from "./ExploreView";
import EServiceView from "./EServiceView";
import MethodologyView from "./MethodologyView";
import GuideView from "./GuideView";
import { useUrlState } from "../utils/useUrlState";

export default function PDNDGraph() {
  const [{ tab: activeTab, entityId, eserviceId }, navigate] = useUrlState();
  const [showAbout, setShowAbout] = useState(false);

  const graphData = useMemo(() => buildGraph(PDND_DATA), []);

  // Il titolo segue la rotta: rende leggibile la cronologia del browser e dà un
  // titolo sensato ai link condivisi.
  useEffect(() => {
    const base = "PDND E-Services Graph";
    const ente = entityId && PDND_DATA.enti.find(e => e.id === entityId);
    const es = activeTab === "eservice" && PDND_DATA.eservices.find(s => s.id === eserviceId);
    const sezione = { esplora: "Esplora", statistiche: "Statistiche", metodologia: "Metodologia", guida: "Guida" }[activeTab];
    document.title = es ? `${es.nome} — ${base}` : ente ? `${ente.name} — ${base}` : sezione ? `${sezione} — ${base}` : base;
  }, [activeTab, entityId, eserviceId]);

  // Navigazione condivisa fra le viste.
  const apriEnte = (id) => navigate({ tab: "grafo", entityId: id });
  const apriEservice = (id) => navigate({ tab: "eservice", entityId: null, eserviceId: id });
  // Esplora legge i filtri dalla query string: la scriviamo prima di cambiare vista.
  const apriEsplora = (query) => {
    window.history.pushState({}, "", `/esplora${query ? `?${query}` : ""}`);
    navigate({ tab: "esplora", entityId: null });
  };
  const indietro = () => (window.history.length > 1 ? window.history.back() : navigate({ tab: "esplora" }));
  const stats = useMemo(() => ({
    enti: PDND_DATA.enti.length,
    es: PDND_DATA.eservices.length,
    conn: PDND_DATA.eservices.reduce((a, e) => a + e.fruitori.length, 0),
  }), []);

  return (
    <div style={{
      width: "100%", height: "100vh",
      background: "linear-gradient(145deg,#0a0e1a 0%,#111827 40%,#0d1525 100%)",
      fontFamily: "'Titillium Web',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      color: "var(--ink)",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <Header
        stats={stats}
        activeTab={activeTab}
        onTabChange={(tab) => navigate({ tab, entityId: null })}
        onAbout={() => setShowAbout(true)}
      />

      {activeTab === "grafo" && (
        <GraphView
          entityId={entityId}
          onEntityChange={(id) => navigate({ entityId: id })}
          onOpenEservice={apriEservice}
        />
      )}
      {activeTab === "esplora" && (
        <ExploreView onOpenEntity={apriEnte} onOpenEservice={apriEservice} />
      )}
      {activeTab === "eservice" && (
        <EServiceView
          key={eserviceId}
          eserviceId={eserviceId}
          onOpenEntity={apriEnte}
          onOpenEservice={apriEservice}
          onExplore={apriEsplora}
          onBack={indietro}
        />
      )}
      {activeTab === "statistiche" && <StatsView graphData={graphData} onOpenEservice={apriEservice} />}
      {activeTab === "metodologia" && <MethodologyView />}
      {activeTab === "guida" && <GuideView />}

      <Footer />

      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
    </div>
  );
}
