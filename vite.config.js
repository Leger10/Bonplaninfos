import path from 'node:path';
import { fileURLToPath } from 'node:url'; // Recommandé pour Vite 7/Node moderne
import react from '@vitejs/plugin-react';
import { createLogger, defineConfig } from 'vite';

// Remplacement de __dirname pour la compatibilité ESM totale
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV !== 'production';

// ... (Garde tes constantes configHorizons ici)
// Note: Assure-toi que "addTransformIndexHtml" est bien défini dans ton fichier

export default defineConfig({
  plugins: [
    react(),
    // addTransformIndexHtml (à inclure si défini)
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext', // Profite de la puissance de Vite 7
    minify: 'terser',
    rollupOptions: {
      // Babel est souvent problématique en prod avec Vite 7, on l'exclut proprement
      external: [
        '@babel/parser',
        '@babel/traverse',
        '@babel/generator',
        '@babel/types'
      ],
    },
  },
  // Optimisation pour les packages hybrides comme Supabase
  optimizeDeps: {
    include: ['@supabase/supabase-js'],
  },
});