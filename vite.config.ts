import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' makes all built asset URLs relative, so the app works at
// https://<user>.github.io/<repo>/ without a blank screen or 404s.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
