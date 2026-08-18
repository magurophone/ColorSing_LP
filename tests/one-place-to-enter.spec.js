import { expect, test } from '@playwright/test'

// 同じことを二度入力させない。
//
// 作成を独立した画面にしていたとき、そこで「ページ名」を聞き、設定の基本情報で
// また「ページ名」を聞いていた。しかも同じ言葉が別のものを指していた（作成画面の
// ページ名＝ページ上部の表示名、設定のページ名＝ブラウザのタブ名）。
// 入口を1つにして、その状態を固定する。

const CONFIG = {
  brand: { name: '', pageTitle: '' },
  sheets: { spreadsheetId: '' },
  admin: { password: '' },
  plans: [{ id: 'fanpage', monthlyAmount: 600 }],
  benefitTiers: [],
}

async function install(page) {
  await page.route('**/customer/config.js*', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: `window.DASHBOARD_CONFIG = ${JSON.stringify(CONFIG)}`,
  }))
  await page.addInitScript(() => {
    window.__fanPagePreviewBase = 'https://service.example.com'
    window.__entryAdapters = {
      payment: { requestEntitlement: async () => ({ status: 'granted' }) },
      identity: { createAccount: async () => ({ status: 'ready' }) },
    }
  })
}

test('登録が済んだら、設定へ着く。作成専用の画面へ寄り道させない', async ({ page }) => {
  await install(page)
  await page.goto('/products.html')
  await page.getByTestId('start-button').click()
  await page.getByTestId('purchase-button').click()
  await page.getByTestId('signup-email').fill('walk@example.invalid')
  await page.getByTestId('signup-submit').click()

  await expect(page).toHaveURL(/onboarding\.html/)
  await expect(page.getByRole('heading', { name: '公開までのセットアップ' })).toBeVisible()
})

test('名前を聞くのは一度だけ', async ({ page }) => {
  await install(page)
  await page.goto('/onboarding.html')

  // 基本情報で名前を決める。
  await page.getByRole('button', { name: /基本情報/ }).first().click()
  await page.getByRole('textbox', { name: '表示名' }).fill('歌う人')
  await page.getByRole('textbox', { name: 'ページ名' }).fill('歌う人の特典ページ')

  // 作成の手順では、名前をもう一度聞かない。聞くのは公開URLだけ。
  await page.getByRole('button', { name: /歌推しページの準備/ }).first().click()
  const step = page.locator('section[aria-labelledby="active-step-title"]')
  await expect(step.getByTestId('address-input')).toBeVisible()
  await expect(step.getByTestId('page-name-input')).toHaveCount(0)
  await expect(step.getByRole('textbox')).toHaveCount(1)
})

test('表示名を決める前は、作成できない理由を出す', async ({ page }) => {
  await install(page)
  await page.goto('/onboarding.html')
  await page.getByRole('button', { name: /歌推しページの準備/ }).first().click()

  await expect(page.getByTestId('fanpage-create-submit')).toBeDisabled()
  await expect(page.getByTestId('submit-hint')).toContainText('表示名')
})

test('何も打っていないうちから、入力を促す文を重ねない', async ({ page }) => {
  await install(page)
  await page.goto('/onboarding.html')
  await page.getByRole('button', { name: /歌推しページの準備/ }).first().click()

  // 例と、ボタンの説明だけ。空欄に対する警告を三重に出さない。
  await expect(page.getByTestId('address-hint')).toBeVisible()
  await expect(page.getByTestId('availability-message')).toHaveCount(0)
})

test('見本に、他の配信者の名前や使えないアドレスを出さない', async ({ page }) => {
  await install(page)
  await page.goto('/onboarding.html')
  await page.getByRole('button', { name: /歌推しページの準備/ }).first().click()

  const text = await page.locator('section[aria-labelledby="active-step-title"]').innerText()
  const placeholder = await page.getByTestId('address-input').getAttribute('placeholder')
  for (const word of ['まぐろふぉん', 'magurophone', 'maguro']) {
    expect(text, word).not.toContain(word)
    expect(placeholder ?? '', word).not.toContain(word)
  }
})

test('作成が済むと、その手順は消えて次へ進む', async ({ page }) => {
  await install(page)
  await page.goto('/onboarding.html')
  await page.getByRole('button', { name: /基本情報/ }).first().click()
  await page.getByRole('textbox', { name: '表示名' }).fill('歌う人')
  await page.getByRole('textbox', { name: 'ページ名' }).fill('歌う人の特典ページ')

  await page.getByRole('button', { name: /歌推しページの準備/ }).first().click()
  await page.getByTestId('address-input').fill('utau-hito')
  await expect(page.getByTestId('availability-message')).toHaveAttribute('data-status', 'available', { timeout: 15_000 })
  await page.getByTestId('fanpage-create-submit').click()

  // 出来ていれば「完了」と書かれただけの項目を並べない。
  await expect(page.getByRole('button', { name: /歌推しページの準備/ })).toHaveCount(0, { timeout: 20_000 })
})

test('作成専用の古い入口は、設定へ送る', async ({ page }) => {
  await install(page)
  await page.goto('/fanpage-create.html')
  await expect(page).toHaveURL(/onboarding\.html/)
})
