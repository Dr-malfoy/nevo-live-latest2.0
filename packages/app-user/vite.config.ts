import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirname is not available in ESM; derive it from import.meta.url instead.
// This resolves to packages/app-user/ — the correct base for tailwind.config.js.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const rawApiUrl = env.VITE_API_URL || process.env.VITE_API_URL || 'https://nevo-live-latest.onrender.com/api';
  const backendTarget = rawApiUrl.replace(/\/api\/?$/, '');

  return {
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
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
        '/uploads': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
        '/socket.io': {
          target: backendTarget,
          ws: true,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
