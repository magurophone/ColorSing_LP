import { expect, test } from '@playwright/test'

const OUT = 'C:/Users/iimy/AppData/Local/Temp/claude/C--Users-iimy-desktop-SLT/9b16243b-f739-42c8-a0a8-d22f6748fa2b/scratchpad'

// 案内した作業へ、その場所まで連れて行けること。
// 「色を変える」と言われた人にタブを探させない。
const CONFIG = {
  brand: { name: '受け渡し確認', pageTitle: '受け渡し確認' },
  sheets: { spreadsheetId: '' },
  admin: { password: '' },
  views: [{ id: 'menu', label: 'Menu', icon: 'gift', enabled: true }],
}

async function install(page) {
  await page.route('**/customer/config.js*', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: `window.DASHBOARD_CONFIG = ${JSON.stringify(CONFIG)}`,
  }))
}

test('管理画面はタブを指定して開ける', async ({ page }, testInfo) => {
  await install(page)
  await page.goto('/admin.html?tab=colors')
  await expect(page.getByRole('heading', { name: 'カラー' }).first()).toBeVisible()
  if (testInfo.project.name === 'chromium-desktop') {
    await page.screenshot({ path: `${OUT}/admin-colors-tab.png`, fullPage: true })
  }
})

test('知らないタブ指定は既定の場所へ落とす', async ({ page }) => {
  await install(page)
  await page.goto('/admin.html?tab=../../etc')
  await expect(page.getByRole('heading', { name: 'ブランディング' }).first()).toBeVisible()
})

test('「色を変える」からカラー設定へ直接着く', async ({ page }) => {
  await install(page)
  await page.goto('/onboarding.html')
  await page.getByRole('button', { name: /色を変える/ }).first().click()
  await page.getByTestId('step-open-colors').click()
  await expect(page).toHaveURL(/admin\.html\?tab=colors/)
  await expect(page.getByRole('heading', { name: 'カラー' }).first()).toBeVisible()
})

test('「公開内容」から特典の段階へ直接着く', async ({ page }) => {
  await install(page)
  await page.goto('/onboarding.html')
  await page.getByRole('button', { name: /公開内容/ }).first().click()
  await page.getByTestId('step-open-tiers').click()
  await expect(page).toHaveURL(/admin\.html\?tab=tiers/)
  await expect(page.getByRole('heading', { name: '特典の段階' }).first()).toBeVisible()
})

test('案内から来た人には、現在地と戻り先を出す', async ({ page }) => {
  await install(page)
  await page.goto('/admin.html?tab=colors&guide=setup-colors')
  const bar = page.getByTestId('setup-guide-bar')
  await expect(bar).toBeVisible()
  await expect(bar).toContainText('ページの色を決める')
  await expect(page.getByTestId('setup-guide-back')).toBeVisible()
})

test('目的なしで管理画面を開いた人へ案内を押し付けない', async ({ page }) => {
  await install(page)
  await page.goto('/admin.html?tab=colors')
  await expect(page.getByTestId('setup-guide-bar')).toHaveCount(0)
  await page.goto('/admin.html')
  await expect(page.getByTestId('setup-guide-bar')).toHaveCount(0)
})

test('設定を変えたあと、案内へ戻れる', async ({ page }) => {
  await install(page)
  await page.goto('/onboarding.html')
  await page.getByRole('button', { name: /色を変える/ }).first().click()
  await page.getByTestId('step-open-colors').click()
  await page.getByText('夜桜').first().click()
  await page.getByTestId('setup-guide-back').click()
  await expect(page.getByRole('heading', { name: '公開までのセットアップ' })).toBeVisible()
  await page.getByRole('button', { name: /色を変える/ }).first().click()
  await expect(page.locator('section[aria-labelledby="active-step-title"]')).toContainText('完了')
})

test('新規顧客には、成立しないタブを出さない', async ({ page }) => {
  await install(page)
  await page.goto('/admin.html')
  const tabs = await page.locator('nav button, aside button').evaluateAll(b => b.map(e => e.innerText.trim()))
  expect(tabs.join(' ')).not.toContain('Google Sheets')
  expect(tabs.join(' ')).not.toContain('デプロイ')

  // URLで直接指定しても開かない。
  await page.goto('/admin.html?tab=sheets')
  await expect(page.getByRole('heading', { name: 'ブランディング' }).first()).toBeVisible()
  await page.goto('/admin.html?tab=deploy')
  await expect(page.getByRole('heading', { name: 'ブランディング' }).first()).toBeVisible()
})

test('既存顧客のタブは今までどおり残す', async ({ page }) => {
  await page.route('**/customer/config.js*', route => route.fulfill({
    status: 200, contentType: 'application/javascript',
    body: 'window.DASHBOARD_CONFIG = {"brand":{},"sheets":{"spreadsheetId":"existing-sheet"},"admin":{"password":""}}',
  }))
  await page.goto('/admin.html?tab=sheets')
  await expect(page.getByRole('heading', { name: 'Google Sheets 設定' }).first()).toBeVisible()
  await page.goto('/admin.html?tab=deploy')
  await expect(page.getByRole('heading', { name: 'GitHub デプロイ' }).first()).toBeVisible()
})

test('新規顧客の案内に、スプレッドシート前提の旧資産を出さない', async ({ page }) => {
  await install(page)
  await page.goto('/onboarding.html')
  const links = await page.locator('a[href]').evaluateAll(a => a.map(e => e.getAttribute('href')))
  expect(links).not.toContain('./setup.html')
  expect(links).not.toContain('./manual.html')
})
