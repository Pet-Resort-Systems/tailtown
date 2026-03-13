import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Creates a process.env object for Vite to load environment variables.
 * This will preserve `process.env.{VAR}` usage support within the application.
 * @param mode The environment mode (development, production, etc.)
 * @returns An object with process.env properties
 */
const createProcessEnvDefine = (mode: string) => {
  const loadedEnv = loadEnv(mode, __dirname, '');
  const processEnv = {
    ...loadedEnv,
    NODE_ENV: mode === 'production' ? 'production' : 'development',
  };

  return Object.fromEntries(
    Object.entries(processEnv).map(([key, value]) => [
      `process.env.${key}`,
      JSON.stringify(value),
    ]),
  );
};

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
    define: createProcessEnvDefine(mode),
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
