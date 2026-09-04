import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: 'line',
  // SLT側のPlaywrightも同じ開発機で 127.0.0.1:4174 を使い、両方 reuseExistingServer
  // が有効になっている。同じポートのままだと、片方のE2Eがもう片方のサーバーへ
  // 接続して双方の結果を壊すため、こちらは4175を使う。
  use: {
    baseURL: 'http://127.0.0.1:4175',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    reducedMotion: 'reduce',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { browserName: 'chromium', viewport: { width: 1440, height: 1000 } },
    },
    {
      name: 'chromium-mobile',
      use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, isMobile: true },
    },
  ],
  webServer: [
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 4175',
      url: 'http://127.0.0.1:4175/index.html',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'node tests/page-preview-host-server.mjs',
      url: 'http://127.0.0.1:4185/health',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
})
