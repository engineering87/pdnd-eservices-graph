/**
 * Formattazione di numeri e date in italiano, condivisa dalle viste. I numeri
 * usano sempre il separatore delle migliaia, anche a 4 cifre (9.826), per
 * coerenza fra valori vicini.
 */

const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const MESI_BREVI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

/** Numero intero con separatore delle migliaia; "—" se manca. */
export const numero = (n) => (n == null || Number.isNaN(n) ? "—" : Number(n).toLocaleString("it-IT", { useGrouping: "always", maximumFractionDigits: 1 }));

/** Numero abbreviato in milioni sopra il milione ("861,9 M"), intero sotto. */
export const breve = (n) => (n == null ? "—" : n >= 1e6 ? `${(n / 1e6).toLocaleString("it-IT", { maximumFractionDigits: 1 })} M` : numero(n));

/** Numero abbreviato a parole: miliardi, milioni, migliaia. */
export const compatto = (n) =>
  n >= 1e9 ? `${(n / 1e9).toLocaleString("it-IT", { maximumFractionDigits: 2 })} mld`
  : n >= 1e6 ? `${(n / 1e6).toLocaleString("it-IT", { maximumFractionDigits: 1 })} mln`
  : n >= 1e3 ? `${(n / 1e3).toLocaleString("it-IT", { maximumFractionDigits: 1 })} mila`
  : numero(n);

/** "2026-11-24" → "24 novembre 2026". */
export const dataLunga = (iso) => {
  if (!iso) return "—";
  const [a, m, g] = iso.split("-");
  return `${+g} ${MESI[+m - 1]} ${a}`;
};

/** "2026-11-24" → "nov 2026". */
export const meseAnno = (iso) => {
  const [a, m] = iso.split("-");
  return `${MESI_BREVI[+m - 1]} ${a}`;
};
