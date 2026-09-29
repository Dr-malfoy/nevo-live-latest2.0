import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirname is not available in ESM; derive it from import.meta.url instead.
// This resolves to packages/app-user/ — the correct base for tailwind.config.js.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [
        // Pass an ABSOLUTE path so tailwindcss resolves content globs from
        // packages/app-user/, not from the monorepo root CWD.
        tailwindcss(path.resolve(__dirname, 'tailwind.config.js')),
        autoprefixer,
      ],
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
      },
    },
  },
});
