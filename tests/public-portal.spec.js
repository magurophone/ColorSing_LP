import { expect, test } from '@playwright/test'

const DEMO_CONFIG = {
  brand: {
    name: '契約テスト',
    sidebarTitle: 'ColorSing LP',
    pageTitle: 'ColorSing LP 契約テスト',
  },
  sheets: {
    spreadsheetId: 'demo',
  },
  views: [
    { id: 'home', label: 'Home', icon: 'home', enabled: true },
    { id: 'menu', label: 'Menu', icon: 'gift', enabled: true },
    { id: 'rights', label: 'ボトルキープ', icon: 'users', enabled: true, title: 'ボトルキープ一覧' },
    { id: 'icons', label: '枠内アイコン', icon: 'image', enabled: true, title: '枠内アイコン' },
    { id: 'events', label: 'イベント', icon: 'calendar', enabled: true, title: 'イベント' },
  ],
  // 出荷時の既定には特典を入れない方針にしたため、この契約テストが必要とする
  // 段階はここで持つ。既定値に寄りかかったままだと、既定を変えるたびに壊れる。
  benefitTiers: [
    { key: '5k', icon: '🎵', columnIndex: 1, displayTemplate: '強制リクエスト: {value}曲', lockedContent: { text: '', imageUrl: '' } },
    { key: '10k', icon: '🎮', columnIndex: 2, displayTemplate: '権利: {value}時間分', lockedContent: { text: '', imageUrl: '' } },
    { key: '20k', icon: '💬', columnIndex: 3, displayTemplate: 'オープンチャット招待済', isBoolean: true, lockedContent: { text: '', imageUrl: '' } },
    { key: '30k', icon: '🎤', columnIndex: 4, displayTemplate: 'アカペラ音源獲得: {value}曲', lockedContent: { text: '', imageUrl: '' } },
    { key: '40k', icon: '⚡', columnIndex: 5, displayTemplate: '強制リクエスト: {value}曲', lockedContent: { text: '', imageUrl: '' } },
    { key: '50k', icon: '🏆', columnIndex: 6, displayTemplate: 'ミックス音源獲得: {value}曲', lockedContent: { text: '', imageUrl: '' } },
    { key: 'メンバーシップ', icon: '👑', columnIndex: 7, displayTemplate: '月内リクエスト対応中', isMembership: true, lockedContent: { text: '', imageUrl: '' } },
  ],
}

async function installConfig(page, config = DEMO_CONFIG) {
  await page.route('**/customer/config.js', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: `window.DASHBOARD_CONFIG = ${JSON.stringify(config)}`,
  }))
}

async function expectNoHorizontalOverflow(page) {
  await expect.poll(() => page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  )).toBeLessThanOrEqual(1)
}

test('current public views and popup relationships remain usable', async ({ page }) => {
  await installConfig(page)
  await page.goto('/index.html')

  await expect(page).toHaveTitle('ColorSing LP 契約テスト')
  await expect(page.getByRole('heading', { name: 'Ranking' })).toBeVisible()
  await expect(page.getByText('星空リスナー', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('heading', { name: 'New Event' })).toBeVisible()

  await page.getByRole('button', { name: 'Menu' }).click()
  await expect(page.getByRole('heading', { name: 'Menu' })).toBeVisible()
  await expect(page.getByText('強制リクエスト権', { exact: true }).filter({ visible: true }).first()).toBeVisible()

  await page.getByRole('button', { name: 'ボトルキープ' }).click()
  await expect(page.getByRole('heading', { name: 'ボトルキープ一覧' })).toBeVisible()
  await page.getByText('星空リスナー', { exact: true }).click()
  await expect(page.getByText('強制リクエスト: 2曲')).toBeVisible()
  await page.getByText('強制リクエスト: 2曲').click()
  await expect(page.getByText('枠内で好きな曲を1曲リクエストできます。')).toBeVisible()
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: '枠内アイコン' }).click()
  await expect(page.getByText('2025年1月')).toBeVisible()
  await expect(page.getByText('星空リスナー', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'イベント' }).click()
  await expect(page.getByText('まだイベント履歴がありません')).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

test('missing primary data source keeps the current full-page retry state', async ({ page }) => {
  await installConfig(page, {
    brand: { pageTitle: '未設定テスト' },
    sheets: { spreadsheetId: '' },
  })
  await page.goto('/index.html')
  await expect(page.getByRole('heading', { name: 'エラー' })).toBeVisible()
  await expect(page.getByRole('button', { name: '再読み込み' })).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

test('all protected public entry points remain reachable', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'one URL smoke pass is sufficient')
  await installConfig(page)

  for (const path of [
    '/index.html',
    '/admin.html',
    '/manual.html',
    '/setup.html',
    '/onboarding.html',
    '/promotion.html',
    '/features.html',
    '/monitor.html',
  ]) {
    const response = await page.goto(path)
    expect(response?.status(), path).toBe(200)
    await expect(page.locator('body'), path).toBeVisible()
  }
})
