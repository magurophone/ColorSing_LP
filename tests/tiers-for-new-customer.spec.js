import { expect, test } from '@playwright/test'

// 新規顧客はスプレッドシートを使わない。保存場所の話を設定画面に出さない。
const NEW_CUSTOMER = {
  brand: { name: '', pageTitle: '' },
  sheets: { spreadsheetId: '' },
  admin: { password: '' },
  views: [{ id: 'menu', label: 'Menu', icon: 'gift', enabled: true }],
  benefitTiers: [],
}

const LEGACY_CUSTOMER = {
  brand: { name: '既存', pageTitle: '既存' },
  sheets: { spreadsheetId: 'existing-sheet' },
  admin: { password: '' },
  benefitTiers: [{ key: '5k', icon: '🎵', columnIndex: 1, displayTemplate: '{value}曲' }],
}

async function install(page, config) {
  await page.route('**/customer/config.js*', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: `window.DASHBOARD_CONFIG = ${JSON.stringify(config)}`,
  }))
}

// 保存キーはリポジトリ名で決まるため、名前ではなく中身で探す。
const readTiers = page => page.evaluate(() => {
  for (const key of Object.keys(window.localStorage)) {
    if (!key.startsWith('dashboard_config_')) continue
    const parsed = JSON.parse(window.localStorage.getItem(key) || 'null')
    if (parsed && Array.isArray(parsed.benefitTiers)) return parsed.benefitTiers
  }
  return []
})

test('新規顧客のティア画面に、保存場所の話を出さない', async ({ page }) => {
  await install(page, NEW_CUSTOMER)
  await page.goto('/admin.html?tab=tiers')
  await page.getByTestId('tiers-add').click()

  const text = await page.getByTestId('tiers-tab').innerText()
  for (const word of ['列インデックス', 'シート', 'スプレッドシート', 'キー（', 'テンプレート']) {
    expect(text, word).not.toContain(word)
  }
})

test('既存顧客のティア画面は今までどおり', async ({ page }) => {
  await install(page, LEGACY_CUSTOMER)
  await page.goto('/admin.html?tab=tiers')
  const text = await page.getByTestId('tiers-tab').innerText()
  expect(text).toContain('列インデックス')
  expect(text).toContain('キー（シート上のタイトルと一致させる）')
})

test('新規顧客には、段階の名前を〇Kの形で見せる', async ({ page }) => {
  await install(page, NEW_CUSTOMER)
  await page.goto('/admin.html?tab=tiers')
  // 何も入っていない状態でも、何を書けばよいか分かる。
  await expect(page.getByTestId('tiers-empty')).toContainText('5K')
  await page.getByTestId('tiers-add').click()
  // 勝手に決めない。例として見せるだけ。
  const nameInput = page.getByPlaceholder('5K')
  await expect(nameInput).toHaveValue('')
  await expect(page.getByTestId('tiers-tab')).toContainText('好きな名前にもできます')
})

test('新規顧客の列位置は、画面の並びから自動で決まる', async ({ page }) => {
  await install(page, NEW_CUSTOMER)
  await page.goto('/admin.html?tab=tiers')
  await page.getByTestId('tiers-add').click()
  await page.getByPlaceholder('5K').fill('5K')
  await page.getByTestId('tiers-add').click()
  await page.getByPlaceholder('5K').nth(1).fill('10K')

  expect(await readTiers(page)).toMatchObject([
    { key: '5K', columnIndex: 1 },
    { key: '10K', columnIndex: 2 },
  ])

  // 並び替えても、位置は並びに追従する。手で直させない。
  await page.locator('button', { hasText: '▲' }).nth(1).click()
  expect(await readTiers(page)).toMatchObject([
    { key: '10K', columnIndex: 1 },
    { key: '5K', columnIndex: 2 },
  ])
})

test('顧客が決めていない特典を、最初から並べない', async ({ page }) => {
  // customer/config.js を差し替えず、テンプレートが配る既定のまま開く。
  await page.goto('/admin.html?tab=tiers')
  await expect(page.getByTestId('tiers-empty')).toBeVisible()
})

test('スプレッドシート前提のマニュアルを、新規顧客に出さない', async ({ page }) => {
  await install(page, NEW_CUSTOMER)
  await page.goto('/admin.html')
  await expect(page.locator('a[href="./manual.html"]')).toHaveCount(0)

  await install(page, LEGACY_CUSTOMER)
  await page.goto('/admin.html')
  expect(await page.locator('a[href="./manual.html"]').count()).toBeGreaterThan(0)
})
