/**
 * Vite Configuration
 * Configuration for the Vite build tool and development server
 * @see https://vitejs.dev/config/
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite configuration object
 * @type {import('vite').UserConfig}
 */
export default defineConfig({
  // Enable React plugin for JSX and React refresh support
  plugins: [react()],
  
  // Build optimization for production
  build: {
    // Reduce chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Enable code splitting and tree shaking
    rollupOptions: {
      output: {
        // Manual chunk splitting to reduce bundle size
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          icons: ['react-icons'],
          supabase: ['@supabase/supabase-js', '@supabase/auth-ui-react'],
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
    // Fixed port to prevent multiple server instances on different ports
    port: 5176,
    // Proxy configuration for API requests during development
    // Forwards requests to appropriate backend services
    proxy: {
      // Main API endpoint proxy
      '/api': {
        target: 'http://localhost:3204',
        changeOrigin: true,
        secure: false,
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
