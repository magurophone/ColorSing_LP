import { expect, test } from '@playwright/test'

const OUT = 'C:/Users/iimy/AppData/Local/Temp/claude/C--Users-iimy-desktop-SLT/9b16243b-f739-42c8-a0a8-d22f6748fa2b/scratchpad'

const CONFIG = {
  brand: { name: '', pageTitle: '' },
  sheets: { spreadsheetId: '' },
  admin: { password: '' },
  plans: [{ id: 'fanpage', monthlyAmount: 600 }],
}

// 決済と認証は事業者未確定。注入したときだけ受付が開く。
async function installEntry(page, { withProviders = true } = {}) {
  await page.route('**/customer/config.js', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: `window.DASHBOARD_CONFIG = ${JSON.stringify(CONFIG)}`,
  }))
  await page.addInitScript(`
    window.__fanPagePreviewBase = 'https://service.example.com';
  `)
  await page.addInitScript(() => {
    window.__fanPageCreateAdapters = {
      checkAvailability: async () => true,
      provisioningAdapter: { executeStep: async stepId => ({ resource: stepId }) },
    }
  })
  if (!withProviders) {
    // 事業者未接続の本番を再現する。空を注入することで仮処理も使わせない。
    await page.addInitScript(() => { window.__entryAdapters = {} })
    return
  }
  await page.addInitScript(() => {
    window.__entryAdapters = {
      payment: { requestEntitlement: async () => ({ status: 'granted' }) },
      identity: { createAccount: async () => ({ status: 'ready' }) },
    }
  })
}

test('商品ページは歌推しページだけを売り、上位ツールやSLTを混ぜない', async ({ page }, testInfo) => {
  await installEntry(page)
  await page.goto('/products.html')
  await expect(page.getByTestId('products')).toBeVisible()
  await expect(page.getByRole('heading', { name: '歌推しページ' })).toBeVisible()
  await expect(page.getByTestId('plan-price')).toHaveText('月額 600円')
  // 行き先が無いリンクは置かない。
  await expect(page.getByTestId('existing-login')).toHaveCount(0)

  const text = await page.locator('body').innerText()
  for (const word of ['Portal', 'SLT', '総合管理', 'OBS', 'スプレッドシート']) {
    expect(text, word).not.toContain(word)
  }
  await page.screenshot({ path: `${OUT}/entry-1-products-${testInfo.project.name}.png`, fullPage: true })
})

test('本番では、料金が未設定なら申し込みへ進ませない', async ({ page }) => {
  // 開発機の仮処理を外し、公開環境と同じ条件にする。
  await page.addInitScript(() => { window.__localPreview = false })
  await page.route('**/customer/config.js', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: 'window.DASHBOARD_CONFIG = {"brand":{},"sheets":{"spreadsheetId":""},"admin":{"password":""}}',
  }))
  await page.goto('/products.html')
  await expect(page.getByTestId('plan-price')).toHaveText('料金は準備中です')
  await expect(page.getByTestId('start-button')).toBeDisabled()
  await expect(page.getByTestId('start-blocked-reason')).toBeVisible()
})

test('事業者が未接続なら受付を開かず、押せない操作を置かない', async ({ page }, testInfo) => {
  await installEntry(page, { withProviders: false })
  await page.goto('/start.html')
  await expect(page.getByTestId('entry-waiting')).toBeVisible()
  await expect(page.getByText('お申し込みの受付を準備しています')).toBeVisible()
  await expect(page.getByTestId('purchase-button')).toHaveCount(0)
  await page.screenshot({ path: `${OUT}/entry-2-start-waiting-${testInfo.project.name}.png`, fullPage: true })

  await page.goto('/signup.html')
  await expect(page.getByText('登録の受付を準備しています')).toBeVisible()
  await expect(page.getByTestId('signup-submit')).toHaveCount(0)
})

test('商品ページから歌推しページ作成まで一本で進める', async ({ page }, testInfo) => {
  await installEntry(page)

  await page.goto('/products.html')
  await page.getByTestId('start-button').click()

  await expect(page.getByTestId('start')).toBeVisible()
  await page.getByTestId('purchase-button').click()

  await expect(page.getByTestId('signup')).toBeVisible()
  await page.getByTestId('signup-email').fill('listener@example.invalid')
  await page.screenshot({ path: `${OUT}/entry-3-signup-${testInfo.project.name}.png`, fullPage: true })
  await page.getByTestId('signup-submit').click()

  // 登録が済むと設定へ着く。作成は設定の最初の手順。
  await expect(page.getByRole('heading', { name: '公開までのセットアップ' })).toBeVisible()
  await page.getByRole('button', { name: /基本情報/ }).first().click()
  await page.getByRole('textbox', { name: '表示名' }).fill('入口テスト')
  await page.getByRole('textbox', { name: 'ページ名' }).fill('入口テスト 歌推しページ')
  await page.getByRole('button', { name: /歌推しページの準備/ }).first().click()
  await page.getByTestId('address-input').fill('entry-journey')
  await expect(page.getByTestId('availability-message')).toHaveAttribute('data-status', 'available')
  await page.getByTestId('fanpage-create-submit').click()
  await expect(page.getByRole('button', { name: /歌推しページの準備/ })).toHaveCount(0, { timeout: 15_000 })
  await page.screenshot({ path: `${OUT}/entry-4-created-${testInfo.project.name}.png`, fullPage: true })
})
