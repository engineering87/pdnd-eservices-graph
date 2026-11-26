import { useState, useEffect, useCallback } from "react";

/**
 * Stato dell'applicazione riflesso nell'URL, così ogni vista e ogni ente sono
 * indirizzabili, condivisibili e indicizzabili.
 *
 *   /                  grafo
 *   /esplora           scheda Relazioni (filtri nella query string)
 *   /enti              ricerca fra tutti gli aderenti (?ente=codice IPA)
 *   /statistiche       scheda Statistiche
 *   /metodologia       scheda Metodologia
 *   /guida             scheda Guida
 *   /ente/inps         grafo con l'ente selezionato
 *   /eservice/<id>     scheda di un e-service
 *
 * Le rotte a percorso funzionano perché staticwebapp.config.json riscrive ogni
 * richiesta non trovata su /index.html. Senza quella regola un accesso diretto
 * a /ente/inps restituirebbe 404.
 */

const TABS = ["grafo", "esplora", "enti", "statistiche", "metodologia", "guida"];

const VUOTO = { tab: "grafo", entityId: null, eserviceId: null };

export function parseLocation(pathname) {
  const path = pathname.replace(/^\/+|\/+$/g, "");
  if (path.startsWith("ente/")) {
    const id = decodeURIComponent(path.slice("ente/".length));
    return { ...VUOTO, entityId: id || null };
  }
  if (path.startsWith("eservice/")) {
    const id = decodeURIComponent(path.slice("eservice/".length));
    return id ? { ...VUOTO, tab: "eservice", eserviceId: id } : VUOTO;
  }
  if (TABS.includes(path) && path !== "grafo") return { ...VUOTO, tab: path };
  return VUOTO;
}

export function buildPath({ tab, entityId, eserviceId }) {
  if (tab === "eservice" && eserviceId) return `/eservice/${encodeURIComponent(eserviceId)}`;
  if (entityId) return `/ente/${encodeURIComponent(entityId)}`;
  if (tab && tab !== "grafo") return `/${tab}`;
  return "/";
}

export function useUrlState() {
  const [state, setState] = useState(() =>
    typeof window === "undefined"
      ? VUOTO
      : parseLocation(window.location.pathname)
  );

  // Navigazione con i pulsanti avanti e indietro del browser.
  useEffect(() => {
    const onPop = () => setState(parseLocation(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Allinea l'URL allo stato. Il confronto con il percorso corrente evita di
  // impilare voci nella cronologia quando è stato il browser a cambiare rotta.
  useEffect(() => {
    const next = buildPath(state);
    // La barra finale non conta: il server può servire /ente/inps/ per la
    // pagina con l'anteprima di condivisione di /ente/inps.
    if (next !== (window.location.pathname.replace(/\/+$/, "") || "/")) {
      // Dentro la stessa vista la query string resta: selezionare un ente nel
      // grafo non deve perdere il filtro sulla provenienza degli archi.
      const stessaVista = parseLocation(window.location.pathname).tab === state.tab;
      window.history.pushState({}, "", next + (stessaVista ? window.location.search : ""));
    }
  }, [state]);

  const navigate = useCallback((partial) => {
    setState((prev) => {
      const merged = { ...prev, ...partial };
      if (merged.tab !== "eservice") merged.eserviceId = null;
      if (merged.tab === prev.tab && merged.entityId === prev.entityId && merged.eserviceId === prev.eserviceId) return prev;
      return merged;
    });
  }, []);

  return [state, navigate];
}
