import { useState, useMemo } from "react";
import PDND_DATA from "../data/pdnd-data.json";
import { buildGraph } from "../utils/buildGraph";
import Header from "./Header";
import Footer from "./Footer";
import AboutModal from "./AboutModal";
import GraphView from "./GraphView";
import StatsView from "./StatsView";
import MethodologyView from "./MethodologyView";
import GuideView from "./GuideView";

export default function PDNDGraph() {
  const [activeTab, setActiveTab] = useState("grafo");
  const [showAbout, setShowAbout] = useState(false);

  const graphData = useMemo(() => buildGraph(PDND_DATA), []);
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
        onTabChange={setActiveTab}
        onAbout={() => setShowAbout(true)}
      />

      {activeTab === "grafo" && <GraphView />}
      {activeTab === "statistiche" && <StatsView graphData={graphData} />}
      {activeTab === "metodologia" && <MethodologyView />}
      {activeTab === "guida" && <GuideView />}

      <Footer />

      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
    </div>
  );
}
