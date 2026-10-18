import { defineConfig } from 'vite';

export default defineConfig({
  // Electron opens dist/index.html via file://, not an HTTP server root.
  base: './',
  build: {
    emptyOutDir: false
  }
});
