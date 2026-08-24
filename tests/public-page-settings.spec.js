import { expect, test } from '@playwright/test'

// 公開ページの見た目と文言の正本はD1（tenant_settings）。配布物の customer/config.js は
// 初期描画を速くするための写しでしかない。ここでは「写しと違う値がD1から届いたとき、
// 公開ページが実際にD1の値で描かれるか」を見る。管理画面で保存できるだけでは足りない。

const PLATFORM_BASE = 'https://platform.example'

// 写し。D1と全部違う値にしてある。
const SNAPSHOT_CONFIG = {
  brand: { name: '写しの名前', sidebarTitle: '', pageTitle: '写しのタブ名' },
  colors: {
    deepBlue: '#111111',
    oceanTeal: '#222222',
    lightBlue: '#333333',
    amber: '#444444',
    accent: '#555555',
    gold: '#666666',
  },
  home: { rankingTitle: '写しのランキング' },
  images: { headerDesktop: '', headerMobile: '' },
  effects: { particles: 'none' },
  views: [
    { id: 'home', label: '写しHome', icon: '🏠', enabled: true },
    { id: 'menu', label: '写しMenu', icon: '🍾', enabled: true },
  ],
  sheets: { spreadsheetId: 'demo' },
  admin: { password: '' },
  platform: {
    tenantSlug: 'magurophone',
    publicApiBaseUrl: PLATFORM_BASE,
    readSource: 'sheets',
    shadowCompareEnabled: false,
    useRuntimeConfig: true,
  },
}

const D1_PAGE_SETTINGS = {
  brand: { name: 'D1の名前', pageTitle: 'D1のタブ名' },
  colors: { deepBlue: '#0b2a4a' },
  home: { rankingTitle: 'D1のランキング' },
  images: { headerDesktop: 'https://media.example/d1-header.png' },
  effects: { particles: 'star' },
  views: [
    { id: 'home', label: 'D1のHome', icon: '🏠', enabled: true },
    { id: 'menu', label: 'D1のMenu', icon: '🍾', enabled: true },
  ],
  benefitTierDisplay: { '5k': { legacyColumn: 1 } },
}

async function install(page, { pageSettings }) {
  await page.route('**/customer/config.js*', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: `window.DASHBOARD_CONFIG = ${JSON.stringify(SNAPSHOT_CONFIG)}`,
  }))
  await page.route(`${PLATFORM_BASE}/api/public/v1/runtime-config?*`, route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      version: 1,
      tenant: 'magurophone',
      lpReadSource: 'sheets',
      shadowCompareEnabled: false,
      pageSettings,
      settingsRevision: 7,
    }),
  }))
}

test('サイト名とタブ名はD1の値で描かれる', async ({ page }) => {
  await install(page, { pageSettings: D1_PAGE_SETTINGS })
  await page.goto('/index.html')

  await expect(page.getByText('D1の名前').filter({ visible: true }).first()).toBeVisible()
  await expect(page.getByText('写しの名前')).toHaveCount(0)
  await expect.poll(() => page.title()).toBe('D1のタブ名')
})

test('色はD1の値でCSS変数に入る', async ({ page }) => {
  await install(page, { pageSettings: D1_PAGE_SETTINGS })
  await page.goto('/index.html')

  await expect.poll(() => page.evaluate(
    () => getComputedStyle(document.documentElement).getPropertyValue('--base-deep-blue').trim(),
  )).toBe('#0b2a4a')
  // D1が触れていない色は写しのまま残る
  await expect.poll(() => page.evaluate(
    () => getComputedStyle(document.documentElement).getPropertyValue('--base-gold').trim(),
  )).toBe('#666666')
})

test('見出しの文言はD1の値で描かれる', async ({ page }) => {
  await install(page, { pageSettings: D1_PAGE_SETTINGS })
  await page.goto('/index.html')

  await expect(page.getByRole('heading', { name: 'D1のランキング' })).toBeVisible()
  await expect(page.getByText('写しのランキング')).toHaveCount(0)
})

test('メニューの並びはD1の値で描かれる', async ({ page }) => {
  await install(page, { pageSettings: D1_PAGE_SETTINGS })
  await page.goto('/index.html')

  await expect(page.getByText('D1のMenu').filter({ visible: true }).first()).toBeVisible()
  await expect(page.getByText('写しMenu')).toHaveCount(0)
})

test('演出はD1の値で描かれる', async ({ page }) => {
  await install(page, { pageSettings: D1_PAGE_SETTINGS })
  await page.goto('/index.html')

  // 写しは「なし」。D1が「星」なので、粒が出る。
  await expect(page.getByTestId('particle-layer')).toBeVisible()
})

test('ヘッダー画像はD1の預かり先のURLで描かれる', async ({ page }) => {
  await install(page, { pageSettings: D1_PAGE_SETTINGS })
  await page.goto('/index.html')

  await expect(page.locator('img[src="https://media.example/d1-header.png"]').first()).toBeAttached()
})

test('設定がまだ無いテナントは、写しのまま描かれる', async ({ page }) => {
  await install(page, { pageSettings: {} })
  await page.goto('/index.html')

  await expect(page.getByText('写しの名前').filter({ visible: true }).first()).toBeVisible()
  await expect(page.getByRole('heading', { name: '写しのランキング' })).toBeVisible()
  await expect(page.getByText('写しMenu').filter({ visible: true }).first()).toBeVisible()
  await expect(page.getByTestId('particle-layer')).toHaveCount(0)
})
