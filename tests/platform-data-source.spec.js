import { expect, test } from '@playwright/test'

const PLATFORM_BASE = 'https://platform.example'
const DB_VIEW_MODEL = {
  ranking: [[1, 'DB Listener', 99, '']],
  goals: [['DB Goal', 'DB Next Goal'], ['DB Supporters', 'DB Next Supporters']],
  benefits: [['5k', 'DB特典', 'DB特典', 'DBから取得した特典です。', '']],
  rights: [['DB Listener', '1', '', '']],
  specialIndex: 3,
  history: [{ month: '202608', userName: 'DB Listener', tierKey: '5k', content: 'DB履歴' }],
  events: { upcoming: null, past: [] },
  icons: {
    '202608': [{ label: 'DB Listener', thumbnailUrl: 'db-icon', originalUrl: 'db-icon' }],
    _orderedKeys: ['202608'],
  },
}

const CONFIG = {
  brand: { name: 'Data Source Contract', pageTitle: 'Data Source Contract' },
  sheets: { spreadsheetId: 'demo' },
  platform: {
    tenantSlug: 'magurophone',
    publicApiBaseUrl: PLATFORM_BASE,
    readSource: 'sheets',
    shadowCompareEnabled: false,
    useRuntimeConfig: true,
  },
  views: [
    { id: 'home', label: 'Home', icon: 'home', enabled: true },
    { id: 'menu', label: 'Menu', icon: 'gift', enabled: true },
    { id: 'rights', label: 'ボトルキープ', icon: 'users', enabled: true, title: 'ボトルキープ一覧' },
    { id: 'icons', label: '枠内アイコン', icon: 'image', enabled: true, title: '枠内アイコン' },
  ],
}

async function installConfig(page) {
  await page.route('**/customer/config.js', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: `window.DASHBOARD_CONFIG = ${JSON.stringify(CONFIG)}`,
  }))
}

async function expectNoHorizontalOverflow(page) {
  await expect.poll(() => page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  )).toBeLessThanOrEqual(1)
}

test('server feature flag switches DB→Sheets without changing the public view structure', async ({ page }) => {
  let readSource = 'db'
  await installConfig(page)
  await page.route(`${PLATFORM_BASE}/api/public/v1/runtime-config?*`, route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      version: 1,
      tenant: 'magurophone',
      lpReadSource: readSource,
      shadowCompareEnabled: false,
    }),
  }))
  await page.route(`${PLATFORM_BASE}/api/public/v1/lp-data?*`, route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ version: 1, tenant: 'magurophone', source: 'db', data: DB_VIEW_MODEL }),
  }))

  await page.goto('/index.html')
  await expect(page.getByText('DB Listener', { exact: true })).toBeVisible()
  await expect(page.getByText('星空リスナー', { exact: true })).toHaveCount(0)

  readSource = 'sheets'
  await page.getByTitle('データを再読み込み').click()
  await expect(page.getByText('星空リスナー', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('DB Listener', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Ranking' })).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

test('shadow read compares DB but keeps the rendered response on Sheets', async ({ page }) => {
  let dbRequests = 0
  await installConfig(page)
  await page.route(`${PLATFORM_BASE}/api/public/v1/runtime-config?*`, route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      version: 1,
      tenant: 'magurophone',
      lpReadSource: 'sheets',
      shadowCompareEnabled: true,
    }),
  }))
  await page.route(`${PLATFORM_BASE}/api/public/v1/lp-data?*`, route => {
    dbRequests += 1
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ version: 1, tenant: 'magurophone', source: 'db', data: DB_VIEW_MODEL }),
    })
  })

  await page.goto('/index.html')
  await expect(page.getByText('星空リスナー', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('DB Listener', { exact: true })).toHaveCount(0)
  await expect.poll(() => dbRequests).toBeGreaterThan(0)
})

test('DB outage falls back to Sheets and preserves the current retry-free public experience', async ({ page }) => {
  await installConfig(page)
  await page.route(`${PLATFORM_BASE}/api/public/v1/runtime-config?*`, route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      version: 1,
      tenant: 'magurophone',
      lpReadSource: 'db',
      shadowCompareEnabled: false,
    }),
  }))
  await page.route(`${PLATFORM_BASE}/api/public/v1/lp-data?*`, route => route.fulfill({
    status: 503,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'temporarily unavailable' }),
  }))

  await page.goto('/index.html')
  await expect(page.getByText('星空リスナー', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('heading', { name: 'エラー' })).toHaveCount(0)
  await expectNoHorizontalOverflow(page)
})
