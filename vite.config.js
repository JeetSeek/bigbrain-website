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
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Exclude large lazy-loaded chunks from precache
        globIgnores: ['**/pdf-*.js', '**/vendor-*.js'],
        maximumFileSizeToCacheInBytes: 400 * 1024,
        runtimeCaching: [
          // Supabase API — network first with 5min cache fallback
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\//i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
              networkTimeoutSeconds: 10
            }
          },
          // Supabase Edge Functions — network first
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/functions\/v1\//i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'edge-functions',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 },
              networkTimeoutSeconds: 15
            }
          },
          // Supabase Storage (manual PDFs) — cache first, long TTL
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\//i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-storage',
              expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 }
            }
          },
          // Google Fonts — cache first
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 }
            }
          },
          // Images — cache first
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 }
            }
          }
        ]
      },
      devOptions: { enabled: false }
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
          // DOMPurify
          if (id.includes('node_modules/dompurify')) {
            return 'vendor';
          }
          // Auth UI
          if (id.includes('node_modules/@supabase/auth-ui')) {
            return 'auth-ui';
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
        drop_console: true,
        drop_debugger: true,
        passes: 2, // Extra compression pass
      },
    },
    // Disable sourcemaps in production for smaller output
    sourcemap: false,
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Target modern browsers for smaller output
    target: 'es2020',
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
