import { defineConfig } from 'vite';

export default defineConfig({
  root: 'frontend',
  publicDir: 'public',
  server: { port: 5173, strictPort: true },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    sourcemap: true,
  },
  test: {
    include: ['../tests/frontend/**/*.test.js'],
    environment: 'node',
  },
});
