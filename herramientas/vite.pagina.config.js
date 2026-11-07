// Compila un solo prototipo en un archivo JS sin trozos compartidos, para publicarlo como página.
// Uso: PAGINA=02-pelea npx vite build --config herramientas/vite.pagina.config.js
import { defineConfig } from 'vite';
import { resolve } from 'node:path';

const pagina = process.env.PAGINA;
export default defineConfig({
  root: resolve(import.meta.dirname, '..', 'prototipos', pagina),
  base: './',
  build: {
    outDir: resolve(import.meta.dirname, '..', 'dist-paginas', pagina),
    emptyOutDir: true,
    modulePreload: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
