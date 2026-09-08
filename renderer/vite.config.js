import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Vite configuration for the Electron renderer process.
 * Configures React plugin with JSX transformation and Tailwind CSS v4 Vite integration.
 *
 * @see https://vite.dev/config/
 */
export default defineConfig({
  plugins: [
    react(), // Enables Fast Refresh and JSX transformation
    tailwindcss(), // Vite integration plugin for Tailwind CSS v4
  ],
});
