import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // The only chunk above the default 500 kB is the three.js globe (FeatureGlobe), which is
    // lazy-loaded when the landing page's feature section nears the viewport.
    chunkSizeWarningLimit: 900,
  },
  server: {
    port: 5173,
    // Mirror the production header (vercel.json) so the Google sign-in popup's
    // window.closed polling isn't blocked by COOP during local dev.
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
});
