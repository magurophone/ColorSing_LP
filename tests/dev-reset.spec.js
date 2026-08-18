import { expect, test } from '@playwright/test'

const OUT = 'C:/Users/iimy/AppData/Local/Temp/claude/C--Users-iimy-desktop-SLT/9b16243b-f739-42c8-a0a8-d22f6748fa2b/scratchpad'

// 以前の試行が残った状態を作る。遷移のたびに撒き直さないよう、一度だけ入れる。
async function seedState(page) {
  await page.route('**/customer/config.js', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: 'window.DASHBOARD_CONFIG = {"brand":{},"sheets":{"spreadsheetId":""},"admin":{"password":""}}',
  }))
  await page.goto('/dev-reset.html')
  await page.evaluate(() => {
    localStorage.setItem('fanpage_creation_state_v1', JSON.stringify({ version: 1, pageName: 'aaa' }))
    localStorage.setItem('acquisition_session_v1', JSON.stringify({ version: 1, planId: 'fanpage' }))
    localStorage.setItem('onboarding_state_default', JSON.stringify({ previewConfirmed: true }))
    localStorage.setItem('dashboard_config_default', JSON.stringify({ brand: { name: '顧客の設定' } }))
    localStorage.setItem('config_meta_default', JSON.stringify({ lastModified: 1 }))
    sessionStorage.setItem('onboarding_auth', 'true')
  })
  await page.reload()
}

test('消すものと残すものを、実行前に見せる', async ({ page }, testInfo) => {
  await seedState(page)
  await expect(page.getByTestId('dev-reset')).toBeVisible()

  await expect(page.getByText('fanpage_creation_state_v1')).toBeVisible()
  await expect(page.getByText('acquisition_session_v1')).toBeVisible()
  await expect(page.getByText('onboarding_state_default')).toBeVisible()
  await expect(page.getByText('dashboard_config_default')).toBeVisible()
  await page.screenshot({ path: `${OUT}/dev-reset-${testInfo.project.name}.png`, fullPage: true })
})

test('進行状況だけを消し、顧客の設定は残す', async ({ page }) => {
  await seedState(page)
  await page.getByTestId('dev-reset-run').click()
  await expect(page.getByTestId('dev-reset-result')).toBeVisible()

  const remaining = await page.evaluate(() => ({
    local: Object.keys(localStorage).sort(),
    session: Object.keys(sessionStorage).sort(),
    config: localStorage.getItem('dashboard_config_default'),
  }))
  expect(remaining.local).toEqual(['config_meta_default', 'dashboard_config_default'])
  expect(remaining.session).toEqual([])
  expect(remaining.config).toContain('顧客の設定')
})

test('リセット後は、歌推しページ作成が入力からやり直しになる', async ({ page }) => {
  await seedState(page)
  await page.getByTestId('dev-reset-run').click()
  await expect(page.getByTestId('dev-reset-result')).toBeVisible()

  await page.goto('/fanpage-create.html')
  await expect(page.getByTestId('page-name-input')).toBeVisible()
  await expect(page.getByTestId('page-name-input')).toHaveValue('')
  await expect(page.getByTestId('fanpage-progress')).toHaveCount(0)
})

test('進行状況だけでは色や特典の設定は消えない', async ({ page }) => {
  await seedState(page)
  await page.getByTestId('dev-reset-run').click()
  await expect(page.getByTestId('dev-reset-result')).toBeVisible()
  const config = await page.evaluate(() => localStorage.getItem('dashboard_config_default'))
  expect(config).toContain('顧客の設定')
})

test('設定も消すを選べば、顧客の設定まで消える', async ({ page }) => {
  await seedState(page)
  await page.getByTestId('dev-reset-settings').click()
  await expect(page.getByTestId('dev-reset-result')).toBeVisible()
  const remaining = await page.evaluate(() => Object.keys(localStorage).sort())
  // 顧客設定だけが消え、進行状況は別操作のまま残る。
  expect(remaining).not.toContain('dashboard_config_default')
  expect(remaining).not.toContain('config_meta_default')
  expect(remaining).toContain('fanpage_creation_state_v1')
})

test('消すものが無くても、やり直す操作は押せる', async ({ page }) => {
  await page.route('**/customer/config.js*', route => route.fulfill({
    status: 200, contentType: 'application/javascript',
    body: 'window.DASHBOARD_CONFIG = {"brand":{},"sheets":{"spreadsheetId":""},"admin":{"password":""}}',
  }))
  await page.goto('/dev-reset.html')
  await expect(page.getByTestId('dev-reset-run')).toBeEnabled()
  await expect(page.getByTestId('dev-reset-settings')).toBeEnabled()
})
