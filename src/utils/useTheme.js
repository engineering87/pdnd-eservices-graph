import { useEffect, useState } from "react";

/**
 * Tema chiaro o scuro. Il valore iniziale è già applicato a <html data-theme>
 * da uno script in index.html, prima del primo disegno, così la pagina non
 * lampeggia: la scelta salvata vince, altrimenti vale la preferenza del sistema.
 * Finché l'utente non sceglie, il tema segue i cambi della preferenza di sistema.
 */
export const CHIAVE_TEMA = "pdnd-graph-tema";
const COLORE_BARRA = { dark: "#0a0e1a", light: "#f4f7fb" };

function letto() {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function sceltaSalvata() {
  try { return localStorage.getItem(CHIAVE_TEMA); } catch { return null; }
}

export function useTheme() {
  const [tema, setTema] = useState(letto);

  useEffect(() => {
    document.documentElement.dataset.theme = tema;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", COLORE_BARRA[tema]);
  }, [tema]);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: light)");
    if (!mq) return;
    const segui = (e) => { if (!sceltaSalvata()) setTema(e.matches ? "light" : "dark"); };
    mq.addEventListener("change", segui);
    return () => mq.removeEventListener("change", segui);
  }, []);

  const cambia = () => {
    const nuovo = tema === "light" ? "dark" : "light";
    setTema(nuovo);
    try { localStorage.setItem(CHIAVE_TEMA, nuovo); } catch { /* archivio non disponibile */ }
  };

  return [tema, cambia];
}
