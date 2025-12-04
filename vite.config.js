/**
 * Vite Configuration
 * Configuration for the Vite build tool and development server
 * @see https://vitejs.dev/config/
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Vite configuration object
 * @type {import('vite').UserConfig}
 */
export default defineConfig({
  // Enable React plugin and PWA support
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'brain-icon-nBG.png'],
      manifest: false, // Use public/manifest.json
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          { urlPattern: /^https:\/\/api\./i, handler: 'NetworkFirst' },
          { urlPattern: /\.(?:png|jpg|svg)$/i, handler: 'CacheFirst' }
        ]
      },
      devOptions: { enabled: true }
    })
  ],
  
  // Build optimization for production
  build: {
    // Reduce chunk size warning limit
    chunkSizeWarningLimit: 500,
    // Enable code splitting and tree shaking
    rollupOptions: {
      output: {
        // Aggressive chunk splitting to reduce bundle size
        manualChunks(id) {
          // Core React
          if (id.includes('node_modules/react-dom')) {
            return 'react-dom';
          }
          if (id.includes('node_modules/react/')) {
            return 'react';
          }
          // Router
          if (id.includes('node_modules/react-router')) {
            return 'router';
          }
          // Icons - often large
          if (id.includes('node_modules/react-icons')) {
            return 'icons';
          }
          // Supabase
          if (id.includes('node_modules/@supabase')) {
            return 'supabase';
          }
          // PDF generation
          if (id.includes('node_modules/jspdf') || id.includes('node_modules/html2canvas')) {
            return 'pdf';
          }
          // Speech recognition
          if (id.includes('node_modules/vosk')) {
            return 'speech';
          }
          // Other vendor libs
          if (id.includes('node_modules/')) {
            return 'vendor';
          }
        },
      },
    },
    // Enable minification and compression
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console logs in production
        drop_debugger: true,
      },
    },
  },
  
  // Development server configuration
  server: {
    // Fixed port and host to ensure consistent HMR WS endpoint
    port: 5176,
    host: true,
    strictPort: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5176,
      clientPort: 5176
    },
    // Proxy configuration for API requests during development
    // Forwards requests to appropriate backend services
    proxy: {
      // Main API endpoint proxy - now points to Supabase Edge Function
      '/api': {
        target: 'http://localhost:3204',
        changeOrigin: true,
        secure: false
      },
      // Manuals service proxy - redirects to separate manuals service
      '/manuals': {
        target: 'http://localhost:3003',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/manuals/, '/api')
      }
    },
  },
});
