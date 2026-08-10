import { useState, useEffect, useCallback } from "react";

/**
 * Stato dell'applicazione riflesso nell'URL, così ogni vista e ogni ente sono
 * indirizzabili, condivisibili e indicizzabili.
 *
 *   /                  grafo
 *   /statistiche       scheda Statistiche
 *   /metodologia       scheda Metodologia
 *   /guida             scheda Guida
 *   /ente/inps         grafo con l'ente selezionato
 *
 * Le rotte a percorso funzionano perché staticwebapp.config.json riscrive ogni
 * richiesta non trovata su /index.html. Senza quella regola un accesso diretto
 * a /ente/inps restituirebbe 404.
 */

const TABS = ["grafo", "statistiche", "metodologia", "guida"];

export function parseLocation(pathname) {
  const path = pathname.replace(/^\/+|\/+$/g, "");
  if (path.startsWith("ente/")) {
    const id = decodeURIComponent(path.slice("ente/".length));
    return { tab: "grafo", entityId: id || null };
  }
  if (TABS.includes(path) && path !== "grafo") return { tab: path, entityId: null };
  return { tab: "grafo", entityId: null };
}

export function buildPath({ tab, entityId }) {
  if (entityId) return `/ente/${encodeURIComponent(entityId)}`;
  if (tab && tab !== "grafo") return `/${tab}`;
  return "/";
}

export function useUrlState() {
  const [state, setState] = useState(() =>
    typeof window === "undefined"
      ? { tab: "grafo", entityId: null }
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
    if (next !== window.location.pathname) {
      window.history.pushState({}, "", next);
    }
  }, [state]);

  const navigate = useCallback((partial) => {
    setState((prev) => {
      const merged = { ...prev, ...partial };
      if (merged.tab === prev.tab && merged.entityId === prev.entityId) return prev;
      return merged;
    });
  }, []);

  return [state, navigate];
}
