import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteCompression from 'vite-plugin-compression'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Gzip compression for production
    viteCompression({
      verbose: true,
      disable: false,
      threshold: 10240, // Only compress files > 10KB
      algorithm: 'gzip',
      ext: '.gz',
    }),
    // Brotli compression for production
    viteCompression({
      verbose: true,
      disable: false,
      threshold: 10240,
      algorithm: 'brotliCompress',
      ext: '.br',
    }),
  ],
  esbuild: {
    // Skip TypeScript strict checking during development
    target: 'es2020'
  },
  build: {
    // バンドルサイズ警告の閾値を1MBに設定
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // シンプルなチャンク分割（依存関係エラーを防ぐ）
        manualChunks: {
          // React関連を1つのチャンクに統合
          'vendor-react': ['react', 'react-dom', 'framer-motion', 'react/jsx-runtime'],
          // Chart.js関連
          'vendor-chart': ['chart.js', 'react-chartjs-2'],
          // Dexie (IndexedDB)
          'vendor-dexie': ['dexie'],
        },
        // Add timestamp to force cache busting
        entryFileNames: `assets/[name]-${Date.now()}-[hash].js`,
        chunkFileNames: `assets/[name]-${Date.now()}-[hash].js`,
        assetFileNames: `assets/[name]-${Date.now()}-[hash].[ext]`
      }
    },
    // ソースマップを無効化して本番ビルドサイズを削減
    sourcemap: false,
    // minifyを有効化
    minify: 'esbuild',
    // CSSコード分割を有効化
    cssCodeSplit: true
  },
  server: {
    hmr: {
      overlay: false
    },
    watch: {
      ignored: ['**/.playwright-mcp/**', '**/test-results/**', '**/playwright-report/**']
    }
  }
})
