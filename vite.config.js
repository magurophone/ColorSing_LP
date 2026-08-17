import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  define: {
    __BUILD_TIME__: JSON.stringify(Date.now()),
  },
  plugins: [react(), tailwindcss()],
  base: './',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
        manual: resolve(__dirname, 'manual.html'),
        promotion: resolve(__dirname, 'promotion.html'),
        features: resolve(__dirname, 'features.html'),
        monitor: resolve(__dirname, 'monitor.html'),
        setup: resolve(__dirname, 'setup.html'),
        onboarding: resolve(__dirname, 'onboarding.html'),
        fanPageCreate: resolve(__dirname, 'fanpage-create.html'),
        products: resolve(__dirname, 'products.html'),
        start: resolve(__dirname, 'start.html'),
        signup: resolve(__dirname, 'signup.html'),
        devReset: resolve(__dirname, 'dev-reset.html'),
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  }
})
