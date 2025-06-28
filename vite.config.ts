
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Optimisations pour performance mobile Android
  build: {
    target: 'es2019', // Meilleure compatibilité Android WebView
    minify: 'esbuild', // Plus rapide que Terser
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Séparer les dépendances lourdes
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-button'],
          supabase: ['@supabase/supabase-js'],
          query: ['@tanstack/react-query']
        }
      }
    },
    // Optimiser les chunks pour réduire le bundle initial
    chunkSizeWarningLimit: 1000,
  },
  // Optimiser les transformations CSS
  css: {
    devSourcemap: false,
  },
  // Optimiser les dépendances pré-bundlées
  optimizeDeps: {
    include: ['react', 'react-dom', '@tanstack/react-query'],
    exclude: ['@capacitor/core'] // Exclure Capacitor du pre-bundling
  }
}));
