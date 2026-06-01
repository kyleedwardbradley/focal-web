import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the static build works under any GitHub Pages path
  // (project site /<repo>/ or user site /) without reconfiguration.
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
  },
});
