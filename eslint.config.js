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

      // `react-hooks/immutability` resta un avvertimento: i casi intenzionali di
      // GraphView (il ciclo di disegno che si richiama via requestAnimationFrame)
      // sono marcati sul posto con il motivo; un nuovo caso deve emergere senza
      // bloccare la compilazione.
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
