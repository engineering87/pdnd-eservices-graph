import { useState, useMemo, useEffect } from "react";
import PDND_DATA from "../data/pdnd-data.json";
import { buildGraph } from "../utils/buildGraph";
import Header from "./Header";
import Footer from "./Footer";
import AboutModal from "./AboutModal";
import WelcomePanel from "./WelcomePanel";
import GraphView from "./GraphView";
import StatsView from "./StatsView";
import ExploreView from "./ExploreView";
import EServiceView from "./EServiceView";
import MethodologyView from "./MethodologyView";
import GuideView from "./GuideView";
import { useUrlState, parseLocation } from "../utils/useUrlState";

// Il benvenuto compare una sola volta, e solo a chi arriva sulla pagina
// iniziale: un collegamento condiviso a un ente o a una vista filtrata deve
// aprirsi direttamente. La preferenza vive nel browser; se l'archivio non è
// disponibile (navigazione privata, cookie bloccati) il pannello si mostra e
// basta chiuderlo.
const CHIAVE_BENVENUTO = "pdnd-graph-benvenuto-visto";
function benvenutoDaMostrare() {
  if (typeof window === "undefined") return false;
  if (window.location.pathname !== "/" || window.location.search) return false;
  try { return window.localStorage.getItem(CHIAVE_BENVENUTO) !== "1"; } catch { return true; }
}
function segnaBenvenutoVisto() {
  try { window.localStorage.setItem(CHIAVE_BENVENUTO, "1"); } catch { /* archivio non disponibile */ }
}

export default function PDNDGraph() {
  const [{ tab: activeTab, entityId, eserviceId }, navigate] = useUrlState();
  const [showAbout, setShowAbout] = useState(false);
  const [showWelcome, setShowWelcome] = useState(benvenutoDaMostrare);
  // Cambia quando si apre un indirizzo con filtri nella query string: le viste
  // che li leggono al montaggio (Mappa, Chi usa cosa) ripartono con i nuovi.
  const [rev, setRev] = useState(0);

  const graphData = useMemo(() => buildGraph(PDND_DATA), []);

  // Il titolo segue la rotta: rende leggibile la cronologia del browser e dà un
  // titolo sensato ai link condivisi.
  useEffect(() => {
    const base = "PDND E-Services Graph";
    const ente = entityId && PDND_DATA.enti.find(e => e.id === entityId);
    const es = activeTab === "eservice" && PDND_DATA.eservices.find(s => s.id === eserviceId);
    const sezione = { esplora: "Chi usa cosa", statistiche: "Numeri", metodologia: "Metodologia", guida: "Guida" }[activeTab];
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
  // Apre un indirizzo interno completo, query string compresa.
  const vaiA = (url) => {
    window.history.pushState({}, "", url);
    setRev((r) => r + 1);
    navigate(parseLocation(window.location.pathname));
  };
  const chiudiBenvenuto = () => { segnaBenvenutoVisto(); setShowWelcome(false); };
  const indietro = () => (window.history.length > 1 ? window.history.back() : navigate({ tab: "esplora" }));
  const stats = useMemo(() => ({
    enti: PDND_DATA.enti.length,
    classi: PDND_DATA.enti.filter(e => e.aggregato).length,
    singoli: PDND_DATA.enti.filter(e => !e.aggregato).length,
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
          key={`grafo-${rev}`}
          entityId={entityId}
          onEntityChange={(id) => navigate({ entityId: id })}
          onOpenEservice={apriEservice}
        />
      )}
      {activeTab === "esplora" && (
        <ExploreView key={`esplora-${rev}`} onOpenEntity={apriEnte} onOpenEservice={apriEservice} />
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

      {showAbout && (
        <AboutModal
          onClose={() => setShowAbout(false)}
          onWelcome={() => { setShowAbout(false); setShowWelcome(true); }}
        />
      )}
      {showWelcome && (
        <WelcomePanel
          onClose={chiudiBenvenuto}
          onGo={(url) => { chiudiBenvenuto(); vaiA(url); }}
        />
      )}
    </div>
  );
}
