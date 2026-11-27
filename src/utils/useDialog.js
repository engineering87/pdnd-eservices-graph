import { useEffect, useRef } from "react";

/**
 * Comportamento accessibile di una finestra di dialogo modale: all'apertura il
 * fuoco entra nella finestra, Tab e Maiusc+Tab restano al suo interno, Esc la
 * chiude e alla chiusura il fuoco torna all'elemento che l'aveva aperta.
 * Restituisce il ref da assegnare al contenitore della finestra.
 */
const FOCALIZZABILI = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useDialog(onClose) {
  const ref = useRef(null);
  const chiudi = useRef(onClose);
  useEffect(() => { chiudi.current = onClose; });

  useEffect(() => {
    const precedente = document.activeElement;
    const nodo = ref.current;
    const elementi = () => [...(nodo?.querySelectorAll(FOCALIZZABILI) || [])].filter((el) => el.offsetParent !== null);
    (elementi()[0] || nodo)?.focus();

    const tasto = (e) => {
      if (e.key === "Escape") { e.preventDefault(); chiudi.current?.(); return; }
      if (e.key !== "Tab") return;
      const lista = elementi();
      if (!lista.length) return;
      const primo = lista[0], ultimo = lista[lista.length - 1];
      if (e.shiftKey && document.activeElement === primo) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primo.focus(); }
    };
    document.addEventListener("keydown", tasto);
    return () => {
      document.removeEventListener("keydown", tasto);
      if (precedente && typeof precedente.focus === "function") precedente.focus();
    };
  }, []);

  return ref;
}
