import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Pacchetti separati per ciò che cambia con ritmi diversi: React quasi
        // mai, i dati una volta al mese, il codice dell'app a ogni rilascio.
        // Il browser riusa dalla cache le parti che non sono cambiate.
        manualChunks(id) {
          if (id.includes('node_modules/react')) return 'react';
          if (id.includes('src/data/pdnd-data.json')) return 'dati';
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
