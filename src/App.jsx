/**
 * Radice dell'applicazione. Tutta la composizione vive in PDNDGraph, che tiene
 * lo stato condiviso fra intestazione, viste e URL.
 */

import PDNDGraph from './components/PDNDGraph';

export default function App() {
  return <PDNDGraph />;
}
