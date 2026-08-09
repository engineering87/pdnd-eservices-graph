import { useState, useEffect } from "react";

export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false
  );

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    // Allineamento al montaggio: la larghezza al primo render può differire da
    // quella effettiva (idratazione, bundle in caricamento, finestra ridimensionata
    // prima che il listener sia attivo). Senza questa chiamata lo stato può restare
    // bloccato su `true` e nascondere gli elementi resi solo in vista desktop.
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);

  return isMobile;
}
