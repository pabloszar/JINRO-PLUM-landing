import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Varias páginas: el prototipo 2D original y cada prototipo nuevo.
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        camara: resolve(import.meta.dirname, 'prototipos/01-camara/index.html'),
        pelea: resolve(import.meta.dirname, 'prototipos/02-pelea/index.html'),
        noche: resolve(import.meta.dirname, 'prototipos/03-noche/index.html'),
      },
    },
  },
});
