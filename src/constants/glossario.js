/**
 * Parole chiave spiegate in una riga, per chi non conosce la PDND. Le usano il
 * componente Termine (spiegazione al passaggio o al tocco) e la Guida.
 */
export const GLOSSARIO = {
  pdnd: {
    termine: "PDND",
    spiegazione: "Piattaforma Digitale Nazionale Dati: l'infrastruttura pubblica, gestita da PagoPA, con cui le amministrazioni si scambiano dati in modo sicuro, senza richiederli di nuovo a cittadini e imprese.",
  },
  eservice: {
    termine: "E-service",
    spiegazione: "Un servizio digitale che un ente offre agli altri sulla PDND per scambiare dati, per esempio la verifica della residenza o della regolarità contributiva.",
  },
  erogatore: {
    termine: "Erogatore",
    spiegazione: "L'ente che offre un e-service e fornisce i dati.",
  },
  fruitore: {
    termine: "Fruitore",
    spiegazione: "L'ente che usa un e-service per ricevere i dati che gli servono.",
  },
  classe: {
    termine: "Classe di enti",
    spiegazione: "Un gruppo di enti dello stesso tipo, per esempio tutti i Comuni o tutte le scuole, rappresentato da un solo nodo con il numero dei suoi aderenti.",
  },
  relazione: {
    termine: "Relazione",
    spiegazione: "Il legame fra un ente che offre un e-service e un ente che lo usa. Due enti possono avere più relazioni, una per servizio.",
  },
  provenienza: {
    termine: "Provenienza",
    spiegazione: "Da dove viene l'informazione che collega due enti: uso registrato dalla PDND, catalogo ufficiale, documentazione pubblica, modello precedente o stima.",
  },
  osservata: {
    termine: "Osservata",
    spiegazione: "Uso reale: connessioni o scambi di dati registrati dalla PDND e pubblicati da PagoPA nelle statistiche ufficiali.",
  },
  certificata: {
    termine: "Certificata",
    spiegazione: "Il catalogo ufficiale dichiara che quel tipo di ente può usare il servizio. Indica un'abilitazione, non necessariamente un uso.",
  },
  documentata: {
    termine: "Documentata",
    spiegazione: "La relazione è citata in una fonte ufficiale puntuale, come una circolare o un manuale operativo.",
  },
  ricostruita: {
    termine: "Ricostruita",
    spiegazione: "Relazione del primo modello (maggio 2026), ricavata da documentazione pubblica senza una fonte per ogni singolo legame.",
  },
  inferita: {
    termine: "Inferita",
    spiegazione: "Stima prodotta con un modello di intelligenza artificiale, usata solo dove manca ogni altra prova. È dichiarata come stima.",
  },
  abilitati: {
    termine: "Enti abilitati",
    spiegazione: "Quanti enti sono autorizzati a usare il servizio secondo le statistiche ufficiali PagoPA. È un minimo garantito, non il totale.",
  },
  sessioni: {
    termine: "Sessioni di scambio",
    spiegazione: "Quante volte i dati sono stati effettivamente scambiati tramite il servizio, secondo le statistiche ufficiali PagoPA. È un minimo garantito.",
  },
};
