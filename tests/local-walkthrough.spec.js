import { expect, test } from '@playwright/test'

// 素のテンプレート設定のまま、最後まで歩けることを固定する。
//
// 料金、決済、認証、リスナー登録のように「本番では未設定なら進ませない」ゲート
// を足すたび、開発機での通し確認が塞がってきた。同じ壊し方を4回繰り返している。
// アダプタも料金も注入せず、顧客と同じ条件で歩けるかをここで検査する。
const TEMPLATE_CONFIG = {
  brand: { name: '', pageTitle: '' },
  sheets: { spreadsheetId: '' },
  admin: { password: '' },
  views: [{ id: 'menu', label: 'Menu', enabled: true }],
}

test('設定を足さなくても、商品ページから公開手前まで歩ける', async ({ page }) => {
  await page.route('**/customer/config.js*', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: `window.DASHBOARD_CONFIG = ${JSON.stringify(TEMPLATE_CONFIG)}`,
  }))

  await page.goto('/products.html')
  await expect(page.getByTestId('start-button')).toBeEnabled()
  await page.getByTestId('start-button').click()

  await expect(page.getByTestId('start')).toBeVisible()
  await expect(page.getByTestId('purchase-button')).toBeEnabled()
  await page.getByTestId('purchase-button').click()

  await expect(page.getByTestId('signup')).toBeVisible()
  await page.getByTestId('signup-email').fill('walk@example.invalid')
  await page.getByTestId('signup-submit').click()

  await expect(page.getByTestId('fanpage-create')).toBeVisible()
  await page.getByTestId('page-name-input').fill('通し確認ページ')
  await page.getByTestId('address-input').fill('walk-through')
  await expect(page.getByTestId('availability-message')).toHaveAttribute('data-status', 'available', { timeout: 15_000 })
  await page.getByTestId('fanpage-create-submit').click()
  await expect(page.getByTestId('fanpage-progress')).toHaveAttribute('data-tone', 'ready', { timeout: 20_000 })
  await page.getByTestId('fanpage-next').click()

  // 案内へ着き、必須の手順が「永久に完了しない」状態で並んでいないこと。
  await expect(page.getByRole('heading', { name: '公開までのセットアップ' })).toBeVisible()
  const blocked = await page.locator('nav button').evaluateAll(buttons => buttons
    .filter(button => button.innerText.includes('必須') && button.innerText.includes('準備中'))
    .map(button => button.innerText.split('\n')[0]))
  expect(blocked, '必須なのに準備中で止まる手順があると公開へ到達できない').toEqual([])
})

// 歌推しページ作成済みの状態から案内を開く。
async function openSetupAsCreatedCustomer(page, { localPreview = null } = {}) {
  await page.route('**/customer/config.js*', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: `window.DASHBOARD_CONFIG = ${JSON.stringify(TEMPLATE_CONFIG)}`,
  }))
  if (localPreview !== null) {
    await page.addInitScript(`window.__localPreview = ${localPreview}`)
  }
  await page.addInitScript(() => {
    localStorage.setItem('fanpage_creation_state_v1', JSON.stringify({
      version: 1,
      pageName: '通し確認ページ',
      publicAddress: 'walk-through',
      startedAt: new Date().toISOString(),
      provisioning: { version: 1, tenantId: 'walk-through', operationId: 'op', status: 'complete', currentStep: null, steps: {}, audit: [] },
    }))
  })
  await page.goto('/onboarding.html')
}

async function finishRequiredSteps(page) {
  await page.getByRole('button', { name: /基本情報/ }).first().click()
  await page.getByRole('textbox', { name: '表示名' }).fill('通し確認')
  await page.getByRole('textbox', { name: 'ページ名' }).fill('通し確認ページ')

  await page.getByRole('button', { name: /公開内容/ }).first().click()
  await page.getByTestId('step-open-tiers').click()
  await page.getByTestId('tiers-add').click()
  await page.getByPlaceholder('5K').fill('5K')
  await page.getByTestId('setup-guide-back').click()

  await page.getByRole('button', { name: /プレビュー確認/ }).first().click()
  await page.getByRole('button', { name: 'プレビューを確認しました' }).click()
  await page.locator('nav button').filter({ hasText: '公開' }).last().click()
}

test('本番では、公開先が未接続なら公開させず、理由を出す', async ({ page }) => {
  await openSetupAsCreatedCustomer(page, { localPreview: false })
  await finishRequiredSteps(page)

  await expect(page.getByRole('button', { name: '公開する' })).toBeDisabled()
  await expect(page.getByTestId('publish-blocked-reason')).toBeVisible()
  await expect(page.getByTestId('publish-placeholder-notice')).toHaveCount(0)
})

test('開発機では公開まで歩ける。仮処理であることは画面に出す', async ({ page }) => {
  await openSetupAsCreatedCustomer(page)
  await finishRequiredSteps(page)

  // 仮処理を黙って動かさない。
  await expect(page.getByTestId('publish-placeholder-notice')).toBeVisible()
  await page.getByRole('button', { name: '公開する' }).click()

  // 押したあと、次にやることが出ること。反映確認を押さないと終わらない。
  const detail = page.locator('section[aria-labelledby="active-step-title"]')
  await expect(detail).toContainText('公開状態を確認')
  await page.getByRole('button', { name: '公開状態を確認' }).click()

  // 全部終わったら、終わりだと分かること。
  await expect(page.getByTestId('setup-finished')).toBeVisible()
  await expect(page.getByTestId('setup-finished-admin')).toBeVisible()
})

test('終わったステップに、まだやれとは言わない', async ({ page }) => {
  await openSetupAsCreatedCustomer(page)
  await page.getByRole('button', { name: /基本情報/ }).first().click()
  await page.getByRole('textbox', { name: '表示名' }).fill('通し確認')
  await page.getByRole('textbox', { name: 'ページ名' }).fill('通し確認ページ')

  const detail = page.locator('section[aria-labelledby="active-step-title"]')
  await expect(detail).toContainText('完了')
  await expect(detail).not.toContainText('入力してください')
  await expect(detail).toContainText('確認しました')
})
