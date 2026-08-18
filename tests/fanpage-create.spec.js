import { expect, test } from '@playwright/test'

const OUT = 'C:/Users/iimy/AppData/Local/Temp/claude/C--Users-iimy-desktop-SLT/9b16243b-f739-42c8-a0a8-d22f6748fa2b/scratchpad'

// 歌推しページの作成は、設定の最初の手順として行う。専用画面は持たない。
// 表示名は基本情報で一度だけ決め、この手順では公開URLだけを決める。

const CONFIG = {
  brand: { name: '', pageTitle: '' },
  sheets: { spreadsheetId: '' },
  admin: { password: '' },
  benefitTiers: [],
}

// 確認処理と作成処理を注入し、5つの確認状態と3つの作成状態を決定的に再現する。
async function installAdapters(page, { checkDelay = 50 } = {}) {
  await page.route('**/customer/config.js*', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: `window.DASHBOARD_CONFIG = ${JSON.stringify(CONFIG)}`,
  }))
  await page.addInitScript(`
    window.__checkDelay = ${checkDelay};
    window.__fanPagePreviewBase = 'https://service.example.com';
  `)
  await page.addInitScript(() => {
    window.__fanPageCreateAdapters = {
      checkAvailability: async (address) => {
        await new Promise(resolve => setTimeout(resolve, window.__checkDelay))
        if (address.includes('error')) throw new Error('check failed')
        return address !== 'taken-name'
      },
      provisioningAdapter: {
        executeStep: async (stepId, context) => {
          await new Promise(resolve => setTimeout(resolve, 20))
          if (context.tenant.slug.includes('fail') && stepId === 'hosting') {
            const error = new Error('hosting failed')
            error.code = 'HOSTING_FAILED'
            throw error
          }
          return { resource: stepId }
        },
      },
    }
  })
}

async function openCreateStep(page, options, { displayName = 'テストページ' } = {}) {
  await installAdapters(page, options)
  await page.goto('/onboarding.html')
  if (displayName) {
    // 表示名はここで一度だけ決める。作成の手順ではもう聞かない。
    await page.getByRole('button', { name: /基本情報/ }).first().click()
    await page.getByRole('textbox', { name: '表示名' }).fill(displayName)
    await page.getByRole('textbox', { name: 'ページ名' }).fill(`${displayName}の特典ページ`)
  }
  await page.getByRole('button', { name: /歌推しページの準備/ }).first().click()
  await expect(page.getByTestId('fanpage-create')).toBeVisible()
}

const message = (page) => page.getByTestId('availability-message')
const submit = (page) => page.getByTestId('fanpage-create-submit')

test('公開URLは確定前に、実際のURLとして見せる', async ({ page }) => {
  await openCreateStep(page)
  await page.getByTestId('address-input').fill('MaguroPhone2')
  await expect(page.getByTestId('address-preview')).toHaveText('https://service.example.com/magurophone2')
})

test('未確認と確認中は作成できない', async ({ page }, testInfo) => {
  await openCreateStep(page, { checkDelay: 3000 })
  await page.getByTestId('address-input').fill('unchecked-name')

  await expect(message(page)).toHaveAttribute('data-status', 'unchecked')
  await expect(submit(page)).toBeDisabled()
  if (testInfo.project.name === 'chromium-desktop') {
    await page.screenshot({ path: `${OUT}/portal-unchecked-${testInfo.project.name}.png`, fullPage: true })
  }

  await expect(message(page)).toHaveAttribute('data-status', 'checking')
  await expect(submit(page)).toBeDisabled()
  await page.screenshot({ path: `${OUT}/portal-checking-${testInfo.project.name}.png`, fullPage: true })
})

test('空いているときだけ作成できる', async ({ page }, testInfo) => {
  await openCreateStep(page)
  await page.getByTestId('address-input').fill('free-name')
  await expect(message(page)).toHaveAttribute('data-status', 'available')
  await expect(submit(page)).toBeEnabled()
  await page.screenshot({ path: `${OUT}/portal-available-${testInfo.project.name}.png`, fullPage: true })
})

test('使用済みなら作成できない', async ({ page }, testInfo) => {
  await openCreateStep(page)
  await page.getByTestId('address-input').fill('taken-name')
  await expect(message(page)).toHaveAttribute('data-status', 'unavailable')
  await expect(submit(page)).toBeDisabled()
  await page.screenshot({ path: `${OUT}/portal-unavailable-${testInfo.project.name}.png`, fullPage: true })
})

test('確認に失敗したときは空きとみなさず作成できない', async ({ page }, testInfo) => {
  await openCreateStep(page)
  await page.getByTestId('address-input').fill('error-name')
  await expect(message(page)).toHaveAttribute('data-status', 'check_failed')
  await expect(submit(page)).toBeDisabled()
  await page.screenshot({ path: `${OUT}/portal-check-failed-${testInfo.project.name}.png`, fullPage: true })
})

test('URLを変えたら、確認済みの判定を持ち越さない', async ({ page }) => {
  await openCreateStep(page)
  await page.getByTestId('address-input').fill('free-name')
  await expect(message(page)).toHaveAttribute('data-status', 'available')

  await page.getByTestId('address-input').fill('taken-name')
  await expect(message(page)).toHaveAttribute('data-status', 'unavailable')
  await expect(submit(page)).toBeDisabled()
})

test('作成すると準備中を見せ、完了したら手順から消える', async ({ page }, testInfo) => {
  await openCreateStep(page)
  await page.getByTestId('address-input').fill('ready-name')
  await expect(message(page)).toHaveAttribute('data-status', 'available')
  await submit(page).click()

  await expect(page.getByTestId('fanpage-progress')).toBeVisible()
  // 出来ていれば「完了」と書かれただけの項目を並べない。手順ごと消える。
  await expect(page.getByRole('button', { name: /歌推しページの準備/ })).toHaveCount(0, { timeout: 15_000 })
  await page.screenshot({ path: `${OUT}/portal-ready-${testInfo.project.name}.png`, fullPage: true })
})

test('失敗したときだけ、やり直しを示す', async ({ page }, testInfo) => {
  await openCreateStep(page)
  await page.getByTestId('address-input').fill('fail-name')
  await expect(message(page)).toHaveAttribute('data-status', 'available')
  await submit(page).click()

  const progress = page.getByTestId('fanpage-progress')
  await expect(progress).toHaveAttribute('data-tone', 'failed', { timeout: 15_000 })
  await expect(progress).toContainText('歌推しページの作成に失敗しました')
  await expect(page.getByTestId('fanpage-retry')).toBeVisible()
  await page.screenshot({ path: `${OUT}/portal-failed-${testInfo.project.name}.png`, fullPage: true })
})

test('準備の途中で再読み込みしても状態が消えない', async ({ page }) => {
  await openCreateStep(page)
  await page.getByTestId('address-input').fill('fail-name')
  await expect(message(page)).toHaveAttribute('data-status', 'available')
  await submit(page).click()
  await expect(page.getByTestId('fanpage-progress')).toHaveAttribute('data-tone', 'failed', { timeout: 15_000 })

  // フルリロード。入力へ戻らず、作成の状態が残っていること。
  await page.reload()
  await page.getByRole('button', { name: /歌推しページの準備/ }).first().click()
  await expect(page.getByTestId('fanpage-progress')).toBeVisible()
  await expect(page.getByTestId('fanpage-progress')).toContainText('歌推しページの作成に失敗しました')
  await expect(page.getByText('https://service.example.com/fail-name')).toBeVisible()
})

test('顧客向け画面に内部工程名を出さない', async ({ page }) => {
  await openCreateStep(page)
  await page.getByTestId('address-input').fill('fail-name')
  await expect(message(page)).toHaveAttribute('data-status', 'available')
  await submit(page).click()
  await expect(page.getByTestId('fanpage-progress')).toHaveAttribute('data-tone', 'failed', { timeout: 15_000 })

  const text = await page.locator('body').innerText()
  for (const word of ['slug', 'repository', 'tenant', 'hosting', 'verification', 'provisioning', 'commit']) {
    expect(text.toLowerCase(), word).not.toContain(word.toLowerCase())
  }
})

test('表示名から公開URLを勝手に決めず、候補として提示する', async ({ page }) => {
  await openCreateStep(page, undefined, { displayName: 'Maguro Phone' })

  // 名前を入れただけでは公開URLを埋めない。
  await expect(page.getByTestId('address-input')).toHaveValue('')
  await expect(page.getByTestId('availability-message')).toHaveCount(0)

  // 候補は提示し、押したときだけ反映する。
  const suggestion = page.getByTestId('address-suggestion')
  await expect(suggestion).toHaveText('表示名から「maguro-phone」を使う')
  await suggestion.click()
  await expect(page.getByTestId('address-input')).toHaveValue('maguro-phone')
  await expect(suggestion).toHaveCount(0)
})

test('日本語の表示名では候補を出さず、URLは空のままにする', async ({ page }) => {
  await openCreateStep(page, undefined, { displayName: 'まぐろふぉん 歌推しページ' })
  await expect(page.getByTestId('address-input')).toHaveValue('')
  await expect(page.getByTestId('address-suggestion')).toHaveCount(0)
  await expect(page.getByTestId('fanpage-create-submit')).toBeDisabled()
})

test('失敗したあとは、URLを入力し直せる', async ({ page }) => {
  await openCreateStep(page)
  await page.getByTestId('address-input').fill('fail-name')
  await expect(page.getByTestId('availability-message')).toHaveAttribute('data-status', 'available')
  await page.getByTestId('fanpage-create-submit').click()
  await expect(page.getByTestId('fanpage-progress')).toHaveAttribute('data-tone', 'failed', { timeout: 15_000 })

  // 決まった結果だけを見せて終わりにしない。決め直す道を残す。
  await page.getByRole('button', { name: '最初からやり直す' }).click()
  await expect(page.getByTestId('address-input')).toBeVisible()
  await expect(page.getByTestId('address-input')).toHaveValue('')
})
