/**
 * Una parola tecnica con la sua spiegazione in una riga. Si apre al passaggio
 * del mouse, al tocco o con il fuoco da tastiera, e si chiude con Esc o
 * allontanandosi. Il fumetto è posizionato in coordinate di finestra, così non
 * esce dallo schermo nemmeno su smartphone.
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GLOSSARIO } from "../constants/glossario";

export default function Termine({ id, titolo, testo, sottolineato = true, children }) {
  const voce = id ? GLOSSARIO[id] : testo ? { termine: titolo, spiegazione: testo } : null;
  const ref = useRef(null);
  const [pos, setPos] = useState(null);

  const apri = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const larghezza = Math.min(280, window.innerWidth - 24);
    const left = Math.max(12, Math.min(r.left, window.innerWidth - larghezza - 12));
    const sotto = r.bottom + 8 + 120 < window.innerHeight;
    setPos({ left, larghezza, top: sotto ? r.bottom + 6 : undefined, bottom: sotto ? undefined : window.innerHeight - r.top + 6 });
  };
  const chiudi = () => setPos(null);

  useEffect(() => {
    if (!pos) return;
    const esc = (e) => { if (e.key === "Escape") chiudi(); };
    window.addEventListener("keydown", esc);
    window.addEventListener("scroll", chiudi, true);
    return () => { window.removeEventListener("keydown", esc); window.removeEventListener("scroll", chiudi, true); };
  }, [pos]);

  if (!voce) return children;

  return (
    <>
      <span
        ref={ref}
        tabIndex={0}
        role="button"
        aria-label={`${voce.termine}: ${voce.spiegazione}`}
        onMouseEnter={apri}
        onMouseLeave={chiudi}
        onFocus={apri}
        onBlur={chiudi}
        // Su touch il tocco dà prima il fuoco, poi il clic: il clic deve solo
        // aprire, altrimenti richiuderebbe subito il fumetto appena aperto.
        onClick={(e) => { e.stopPropagation(); apri(); }}
        style={sottolineato ? { textDecoration: "underline dotted", textDecorationColor: "rgba(120,170,230,.7)", textUnderlineOffset: 3, cursor: "help" } : { cursor: "help" }}
      >
        {children ?? voce.termine}
      </span>
      {/* Portale sul body: l'intestazione ha backdrop-filter, che farebbe da
          contenitore agli elementi a posizione fissa e taglierebbe il fumetto. */}
      {pos && createPortal(
        <span
          role="tooltip"
          style={{
            position: "fixed", left: pos.left, top: pos.top, bottom: pos.bottom, width: pos.larghezza, zIndex: 200,
            padding: "10px 12px", borderRadius: 8, background: "var(--tooltip)", border: "1px solid var(--border-strong)",
            boxShadow: "var(--shadow)", fontSize: 12.5, lineHeight: 1.5, color: "var(--ink-muted)",
            fontWeight: 400, textTransform: "none", letterSpacing: 0, textAlign: "left", pointerEvents: "none",
          }}
        >
          <strong style={{ display: "block", color: "var(--ink)", marginBottom: 2 }}>{voce.termine}</strong>
          {voce.spiegazione}
        </span>,
        document.body,
      )}
    </>
  );
}
