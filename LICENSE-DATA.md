# Licenza dei dati (CC BY 4.0)

Il **codice** di PDND E-Services Graph è distribuito con licenza GNU AGPL-3.0-or-later
e termine aggiuntivo di attribuzione (vedi [LICENSE](LICENSE) e
[ADDITIONAL-TERMS.md](ADDITIONAL-TERMS.md)).

Il **modello dei dati** prodotto dal progetto è distribuito con licenza
[Creative Commons Attribuzione 4.0 Internazionale (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/deed.it)
([testo legale](https://creativecommons.org/licenses/by/4.0/legalcode.it)).

## A cosa si applica

| File | Contenuto |
|---|---|
| `src/data/pdnd-data.json`, `src/data/pdnd-data.curated-backup.json` | Il grafo: enti, classi, e-service, relazioni con provenienza |
| `src/data/snapshots/` | Le istantanee mensili e il modello v1 del report |
| `src/data/network-history.json` | Misure di rete nel tempo |
| `src/data/aderenti-index.json` | Indice degli aderenti con codice IPA |
| `exports/` | Esportazioni in GraphML, GEXF e CSV |
| `pipeline/*.json` | Registri e relazioni curate (enti tracciati, classi, relazioni documentate e ricostruite, stime congelate) e anteprime |

## Come citare

Chi usa, modifica o ridistribuisce questi dati deve indicare la fonte, la
licenza e se ha apportato modifiche, per esempio:

> Dati: PDND E-Services Graph, Francesco Del Re, CC BY 4.0 —
> https://github.com/engineering87/pdnd-eservices-graph —
> Del Re, F. (2026). *The PDND E-Service Network: A Graph-Based Model from
> Italian Open Government Data*. Zenodo. https://doi.org/10.5281/zenodo.19989954

## Dati di origine

Il modello rielabora PDND Open Data
([github.com/italia/pdnd-opendata](https://github.com/italia/pdnd-opendata)),
della Presidenza del Consiglio dei Ministri –
Dipartimento per la Trasformazione Digitale, pubblicati da PagoPA S.p.A. con licenza CC0 1.0 (i
metadati per dati.gov.it indicano anche CC BY 4.0). Quei dati restano soggetti
alla loro licenza: la CC BY 4.0 qui sopra copre la rielaborazione del progetto,
cioè la selezione degli enti, le classi, le relazioni con la loro provenienza,
le misure e le esportazioni.

Le relazioni con origine `inferita` sono stime, dichiarate come tali nel campo
`origine`: chi le riusa deve mantenerle distinte dai dati documentati.

---

## Data licence (English summary)

The project's code is licensed under GNU AGPL-3.0-or-later with an attribution term.
The data model produced by the project (the files listed above) is licensed
under CC BY 4.0: credit "PDND E-Services Graph, Francesco Del Re", link the
licence and the repository or the report DOI, and indicate any changes. The
underlying PDND Open Data remain under their own licence (CC0 1.0, rights
holder Presidency of the Council of Ministers – Department for Digital
Transformation).
