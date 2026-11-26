/**
 * PDND E-Services Graph
 * Copyright (C) 2026 Francesco Del Re
 *
 * Licensed under the GNU Affero General Public License v3.0 (see LICENSE),
 * with an additional attribution term under section 7(b): see
 * ADDITIONAL-TERMS.md. The author attribution and the citation of the report
 * must be preserved in the source and in the footer of the user interface.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// Caratteri ospitati dal sito stesso (pacchetti @fontsource, licenza OFL 1.1):
// nessuna richiesta a servizi esterni, quindi l'indirizzo IP di chi visita non
// viene trasmesso a terzi. Solo i pesi usati dall'interfaccia; il browser
// scarica soltanto i sottoinsiemi di caratteri che servono (unicode-range).
import '@fontsource/titillium-web/300.css';
import '@fontsource/titillium-web/400.css';
import '@fontsource/titillium-web/400-italic.css';
import '@fontsource/titillium-web/600.css';
import '@fontsource/titillium-web/700.css';
import '@fontsource/roboto-mono/400.css';
import '@fontsource/roboto-mono/500.css';
import '@fontsource/roboto-mono/700.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
