import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Vite configuration for the Electron renderer process.
 *
 * KEY SETTING — `base: './'`:
 * By default Vite sets base to '/' which produces absolute asset paths
 * like `/assets/index.js`. These work fine over HTTP (dev server) but BREAK
 * when Electron loads the file directly from disk via `loadFile()` because
 * the protocol is `file://` and there is no web root.
 * Setting base to './' makes all asset paths relative (e.g. `./assets/index.js`),
 * which works correctly with both `file://` (production) and `http://` (dev).
 */
export default defineConfig({
  // Required for Electron production builds loaded with loadFile()
  base: './',

  plugins: [
    react(),        // Enables Fast Refresh and JSX transformation
    tailwindcss(),  // Vite integration plugin for Tailwind CSS v4
  ],

  build: {
    // Output directory for the compiled renderer bundle
    outDir: 'dist',
    // Clear the output directory before each build
    emptyOutDir: true,
  },
});
