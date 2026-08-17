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

test('「公開内容」から特典ティアへ直接着く', async ({ page }) => {
  await install(page)
  await page.goto('/onboarding.html')
  await page.getByRole('button', { name: /公開内容/ }).first().click()
  await page.getByTestId('step-open-tiers').click()
  await expect(page).toHaveURL(/admin\.html\?tab=tiers/)
  await expect(page.getByRole('heading', { name: '特典ティア' }).first()).toBeVisible()
})
