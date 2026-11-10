import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-spa-configs',
      closeBundle() {
        const filesToCopy = ['.htaccess', '_redirects', 'vercel.json'];
        filesToCopy.forEach((filename) => {
          const src = path.resolve(__dirname, 'public', filename);
          const dest = path.resolve(__dirname, 'dist', filename);
          if (fs.existsSync(src)) {
            fs.copyFileSync(src, dest);
          }
        });
      },
    },
  ],
  server: {
    port: 3001,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
});

