/**
 * Un campo CSV sicuro da aprire in un foglio di calcolo.
 *
 * - Virgolette se il valore contiene separatori, virgolette o a capo.
 * - Un testo che inizia con = + - @ o con un carattere di controllo verrebbe
 *   eseguito da Excel e LibreOffice come formula (CSV injection): i nomi
 *   vengono dal catalogo ufficiale, non da noi, quindi lo si neutralizza con un
 *   apostrofo davanti, come raccomanda OWASP. I numeri restano numeri.
 */
export function campoCSV(v) {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const rigaCSV = (campi) => campi.map(campoCSV).join(",");
