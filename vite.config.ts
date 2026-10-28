import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

/**
 * Target del proxy de desarrollo.
 *
 *  - Modo LOCAL (todo en esta máquina):
 *        npm run dev                -> apunta a http://localhost (Nginx en :80)
 *  - Modo DISTRIBUIDO (Abrego -> Mulet):
 *        VITE_API_TARGET=http://192.168.220.127 npm run dev
 *
 * El proxy hace que el Frontend siempre hable same-origin (/api/v1/* y
 * /api/security/*), de modo que no hay problemas de CORS y el código es
 * idéntico en los dos modos.
 */
const apiTarget = process.env.VITE_API_TARGET || 'http://localhost';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api/v1': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/api/security': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
