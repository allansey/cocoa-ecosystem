import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Optimize build output
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console logs in production
      },
    },
    // Code splitting for vendor libraries
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'bootstrap-vendor': ['bootstrap', 'bootstrap-icons'],
        },
      },
    },
    // Target modern browsers for smaller bundle
    target: 'ES2020',
  },
  // Optimization for development
  optimizeDeps: {
    include: ['react', 'react-dom', 'bootstrap'],
  },
})
