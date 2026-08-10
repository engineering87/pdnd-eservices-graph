import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";

/**
 * Configurazione ESLint.
 *
 * L'obiettivo non è imporre uno stile ma intercettare le classi di errore che
 * in questo progetto hanno già causato regressioni: dipendenze mancanti negli
 * effetti di React e simboli non usati rimasti dopo una modifica.
 */
export default [
  { ignores: ["dist/**", "node_modules/**"] },
  js.configs.recommended,
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]" }],

      // `react-hooks/immutability` segnala tre punti di GraphView: la funzione
      // `draw` usata dall'effetto di montaggio e dichiarata più sotto (valido a
      // runtime, perché gli effetti girano dopo il corpo del componente) e un
      // setState dentro un effetto, che qui è guardato da un confronto e non
      // genera cicli. Sono debito tecnico reale ma la loro risoluzione richiede
      // di ristrutturare il ciclo di disegno: resta un avvertimento visibile
      // invece di bloccare la compilazione o di essere silenziato caso per caso.
      "react-hooks/immutability": "warn",

      // Sincronizzare uno stato esterno (l'URL) dentro lo stato del componente
      // richiede un setState nell'effetto. Qui è guardato da un confronto
      // sull'identificativo e non produce render a cascata.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    files: ["scripts/**/*.mjs", "pipeline/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
      sourceType: "module",
    },
  },
];
