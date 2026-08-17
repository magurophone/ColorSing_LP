import { expect, test } from '@playwright/test'

const CONFIG = {
  brand: {
    name: 'セルフセットアップ試験',
    pageTitle: 'セルフセットアップ試験',
  },
  sheets: { spreadsheetId: 'demo' },
  platform: { tenantSlug: 'trial-singer', readSource: 'sheets' },
  deploy: { owner: '', repo: 'trial-singer', branch: '', token: '' },
  admin: { password: '', developerKey: '' },
  views: [
    { id: 'home', label: 'Home', icon: 'home', enabled: true },
    { id: 'menu', label: 'Menu', icon: 'gift', enabled: true },
    { id: 'rights', label: '特典権利者', icon: 'users', enabled: true, title: '特典権利者' },
    { id: 'icons', label: '枠内アイコン', icon: 'image', enabled: true, title: '枠内アイコン' },
  ],
}

async function installConfig(page, config = CONFIG) {
  await page.route('**/customer/config.js*', route => route.fulfill({
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

test('state-driven onboarding reaches preview and blocks publish without exposing infrastructure', async ({ page }) => {
  await installConfig(page)
  await page.goto('/onboarding.html')

  await expect(page).toHaveTitle('公開までのセットアップ - ColorSing LP')
  await expect(page.getByRole('heading', { name: '公開までのセットアップ' })).toBeVisible()

  await page.getByRole('button').filter({ hasText: 'データ接続' }).click()
  await expect(page.getByText('デモデータを使用します。')).toBeVisible()
  await expect(page.getByText('Special列を確認しました。')).toBeVisible()

  await page.getByRole('button').filter({ hasText: 'プレビュー確認' }).click()
  await expect(page.locator('iframe[title="歌推しページプレビュー"]')).toBeVisible()
  await expect(page.frameLocator('iframe[title="歌推しページプレビュー"]').getByRole('heading', { name: 'Ranking' })).toBeVisible()
  await page.getByRole('button', { name: 'プレビューを確認しました' }).click()

  await page.getByRole('button').filter({ hasText: '公開準備' }).click()
  await expect(page.getByText('公開サービスの準備待ちです。入力した設定はこの端末に保存されています。')).toBeVisible()
  await expect(page.locator('body')).not.toContainText(/GitHub|Personal Access Token|repository|branch|commit|push|workflow|config\.js|customers\.json/i)
  await expectNoHorizontalOverflow(page)
})
test('existing admin accepts a full Spreadsheet URL and reports structural validation', async ({ page }) => {
  const spreadsheetId = '1AbCdEfGhIjKlMnOpQrStUvWxYz1234567890'
  await installConfig(page)
  await page.route('https://docs.google.com/spreadsheets/d/**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: `google.visualization.Query.setResponse(${JSON.stringify({
      table: {
        cols: [{ type: 'string' }, { type: 'string' }],
        rows: [{ c: [{ v: 'ユーザー名' }, { v: 'Special' }] }],
      },
    })})`,
  }))
  await page.goto('/admin.html')

  await page.locator('button:visible').filter({ hasText: /Google Sheets|シート/ }).first().click()
  const input = page.getByLabel('スプレッドシートURL または ID')
  await input.fill(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?gid=10`)
  await expect(input).toHaveValue(spreadsheetId)
  await page.getByRole('button', { name: '接続テスト' }).click()
  await expect(page.getByText('必要なデータを確認しました')).toBeVisible()
  await expect(page.getByText('「特典管理」を読み取りました（1行）。')).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

test('new onboarding reuses the existing password gate', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'authentication behavior is viewport-independent')
  await installConfig(page, { ...CONFIG, admin: { password: 'trial-pass', developerKey: '' } })
  await page.goto('/onboarding.html')

  await expect(page.getByRole('heading', { name: '初期設定を続ける' })).toBeVisible()
  await page.getByLabel('パスワード').fill('wrong')
  await page.getByRole('button', { name: '続ける' }).click()
  await expect(page.getByRole('alert')).toHaveText('パスワードを確認してください。')
  await page.getByLabel('パスワード').fill('trial-pass')
  await page.getByRole('button', { name: '続ける' }).click()
  await expect(page.getByRole('heading', { name: '公開までのセットアップ' })).toBeVisible()
})
