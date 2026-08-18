import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { existsSync } from 'fs'
import { resolve } from 'path'

// 顧客リポジトリへは公開LPの共通資産だけを配る。中央サービス専用の画面
// （products / start / signup / fanpage-create / onboarding）と開発用の
// dev-reset は配布しないため、顧客リポジトリにはそのHTMLが存在しない。
// 固定で列挙すると build が「entry が無い」で落ちるので、在るものだけ入力にする。
// テンプレート側には全て揃っているので、こちらの build 結果は変わらない。
const entries = (names) => Object.fromEntries(
  Object.entries(names)
    .map(([name, file]) => [name, resolve(__dirname, file)])
    .filter(([, full]) => existsSync(full)),
)

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
      input: entries({
        main: 'index.html',
        admin: 'admin.html',
        manual: 'manual.html',
        promotion: 'promotion.html',
        features: 'features.html',
        monitor: 'monitor.html',
        setup: 'setup.html',
        onboarding: 'onboarding.html',
        fanPageCreate: 'fanpage-create.html',
        products: 'products.html',
        start: 'start.html',
        signup: 'signup.html',
        devReset: 'dev-reset.html',
      }),
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  }
})
