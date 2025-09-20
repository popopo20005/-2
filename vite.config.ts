import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  esbuild: {
    // Skip TypeScript strict checking during development
    target: 'es2020'
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
        // Add timestamp to force cache busting
        entryFileNames: `assets/[name]-${Date.now()}-[hash].js`,
        chunkFileNames: `assets/[name]-${Date.now()}-[hash].js`,
        assetFileNames: `assets/[name]-${Date.now()}-[hash].[ext]`
      }
    }
  },
  server: {
    hmr: {
      overlay: false
    }
  }
})
