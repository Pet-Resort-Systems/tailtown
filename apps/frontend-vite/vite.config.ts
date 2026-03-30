import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const loadedEnv = loadEnv(mode, __dirname, '');
  const port = Number(loadedEnv.PORT) || 3000;

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      host: '0.0.0.0',
      port,
      proxy: {
        '/api/reservations': {
          target: 'http://localhost:4003',
          changeOrigin: true,
        },
        '/api/resources': {
          target: 'http://localhost:4003',
          changeOrigin: true,
        },
        '/api/error-tracking': {
          target: 'http://localhost:4003',
          changeOrigin: true,
        },
        '/api/checklists': {
          target: 'http://localhost:4004',
          changeOrigin: true,
        },
        '/api': {
          target: 'http://localhost:4004',
          changeOrigin: true,
        },
      },
    },
    preview: {
      host: '0.0.0.0',
      port,
    },
    build: {
      outDir: 'dist',
    },
  };
});
