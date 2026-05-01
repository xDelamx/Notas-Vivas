/// <reference types="vitest" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// NOTA DE SEGURANÇA (tarefa 1.2.3):
// A GEMINI_API_KEY foi removida do define do Vite.
// A chave é usada exclusivamente no server.ts (Node.js) e nunca
// chega ao bundle do browser. Toda chamada à Gemini passa pelo
// endpoint /api/parse-note ou /api/transcribe no servidor.
export default defineConfig(({ mode: _mode }) => {
  return {
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './vitest.setup.ts',
      css: false,
    },
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'public',
        filename: 'sw.js',
        registerType: 'autoUpdate',
        injectRegister: false,
        manifest: {
          name: 'Notas Vivas',
          short_name: 'Notas Vivas',
          description: 'Anotações inteligentes com check-in por IA',
          theme_color: '#2d2422',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: "pwa-64x64.png",
              sizes: "64x64",
              type: "image/png"
            },
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'maskable-icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR é desabilitado no AI Studio via DISABLE_HMR.
      // Não modificar — o file watching é desabilitado para evitar flickering.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
