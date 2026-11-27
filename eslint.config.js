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
  { ignores: ["dist/**", "node_modules/**", "test-results/**", "playwright-report/**"] },
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

      // `react-hooks/immutability` resta un avvertimento: un nuovo caso deve
      // emergere senza bloccare la compilazione.
      "react-hooks/immutability": "warn",

      // Sincronizzare uno stato esterno (l'URL) dentro lo stato del componente
      // richiede un setState nell'effetto. Qui è guardato da un confronto
      // sull'identificativo e non produce render a cascata.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    files: ["scripts/**/*.mjs", "pipeline/**/*.mjs", "playwright.config.js"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
      sourceType: "module",
    },
  },
  {
    // Test end-to-end: girano in Node, ma le funzioni passate a page.evaluate
    // e addInitScript girano nel browser.
    files: ["e2e/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.node, ...globals.browser },
      sourceType: "module",
    },
  },
];
