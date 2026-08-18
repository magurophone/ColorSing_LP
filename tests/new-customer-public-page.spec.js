import { expect, test } from '@playwright/test'

// 顧客の歌推しページに、テンプレート側の言葉を残さない。
// 顧客が決めていないものは、その人のページに出さないという方針の検査。
//
// なお「データの置き場所が未設定のときエラーを出すか」は、ここでは扱わない。
// 新規顧客のページはテナント解決とPublic DTOができるまで実体を持たないため、
// 表示の辻褄合わせをせず、既存の保護契約（public-portal.spec.js）を守る。

const NEW_CUSTOMER = {
  brand: { name: '歌う人', pageTitle: '歌う人の特典ページ', sidebarTitle: '' },
  sheets: { spreadsheetId: 'demo' },
  admin: { password: '' },
  benefitTiers: [],
}

async function install(page, config) {
  await page.route('**/customer/config.js*', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: `window.DASHBOARD_CONFIG = ${JSON.stringify(config)}`,
  }))
}

test('サイドバー名を決めていない人には、表示名をそのまま出す', async ({ page }) => {
  await install(page, NEW_CUSTOMER)
  await page.goto('/index.html')
  await expect(page.getByRole('heading', { name: '歌う人' }).first()).toBeVisible()
})

test('顧客のページに、テンプレート側の名前を残さない', async ({ page }) => {
  await install(page, NEW_CUSTOMER)
  await page.goto('/index.html')

  const text = await page.locator('body').innerText()
  for (const word of ['color sing', 'ColorSing LP', 'ボトルキープ']) {
    expect(text, word).not.toContain(word)
  }
})
