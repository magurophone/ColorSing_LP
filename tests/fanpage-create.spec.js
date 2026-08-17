import { expect, test } from '@playwright/test'

const OUT = 'C:/Users/iimy/AppData/Local/Temp/claude/C--Users-iimy-desktop-SLT/9b16243b-f739-42c8-a0a8-d22f6748fa2b/scratchpad'

// 確認処理と作成処理を注入し、5つの確認状態と3つの作成状態を決定的に再現する。
async function installAdapters(page, { checkDelay = 50 } = {}) {
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

async function openCreate(page, options) {
  await installAdapters(page, options)
  await page.goto('/fanpage-create.html')
  await expect(page.getByTestId('fanpage-create')).toBeVisible()
}

const message = (page) => page.getByTestId('availability-message')
const submit = (page) => page.getByTestId('fanpage-create-submit')

test('ページ名と公開URLを分けて入力し、確定前に実際のURLを見せる', async ({ page }) => {
  await openCreate(page)
  await page.getByTestId('page-name-input').fill('まぐろふぉん 歌推しページ')
  await page.getByTestId('address-input').fill('MaguroPhone2')
  await expect(page.getByTestId('address-preview')).toHaveText('https://service.example.com/magurophone2')
})

test('未確認と確認中は作成できない', async ({ page }, testInfo) => {
  await openCreate(page, { checkDelay: 3000 })
  await page.getByTestId('page-name-input').fill('テストページ')
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
  await openCreate(page)
  await page.getByTestId('page-name-input').fill('テストページ')
  await page.getByTestId('address-input').fill('free-name')
  await expect(message(page)).toHaveAttribute('data-status', 'available')
  await expect(submit(page)).toBeEnabled()
  await page.screenshot({ path: `${OUT}/portal-available-${testInfo.project.name}.png`, fullPage: true })
})

test('使用済みなら作成できない', async ({ page }, testInfo) => {
  await openCreate(page)
  await page.getByTestId('page-name-input').fill('テストページ')
  await page.getByTestId('address-input').fill('taken-name')
  await expect(message(page)).toHaveAttribute('data-status', 'unavailable')
  await expect(submit(page)).toBeDisabled()
  await page.screenshot({ path: `${OUT}/portal-unavailable-${testInfo.project.name}.png`, fullPage: true })
})

test('確認に失敗したときは空きとみなさず作成できない', async ({ page }, testInfo) => {
  await openCreate(page)
  await page.getByTestId('page-name-input').fill('テストページ')
  await page.getByTestId('address-input').fill('error-name')
  await expect(message(page)).toHaveAttribute('data-status', 'check_failed')
  await expect(submit(page)).toBeDisabled()
  await page.screenshot({ path: `${OUT}/portal-check-failed-${testInfo.project.name}.png`, fullPage: true })
})

test('ページ名を変えても、確認済みの判定を新しいURLへ持ち越さない', async ({ page }) => {
  await openCreate(page)
  await page.getByTestId('page-name-input').fill('テストページ')
  await page.getByTestId('address-input').fill('free-name')
  await expect(message(page)).toHaveAttribute('data-status', 'available')

  await page.getByTestId('address-input').fill('taken-name')
  await expect(message(page)).toHaveAttribute('data-status', 'unavailable')
  await expect(submit(page)).toBeDisabled()
})

test('作成すると準備中を見せ、完了したら次へ進める', async ({ page }, testInfo) => {
  await openCreate(page)
  await page.getByTestId('page-name-input').fill('テストページ')
  await page.getByTestId('address-input').fill('ready-name')
  await expect(message(page)).toHaveAttribute('data-status', 'available')
  await submit(page).click()

  const progress = page.getByTestId('fanpage-progress')
  await expect(progress).toBeVisible()
  await expect(progress).toHaveAttribute('data-tone', 'ready', { timeout: 15_000 })
  await expect(page.getByRole('heading', { name: '歌推しページの作成が完了しました' })).toBeVisible()
  await expect(page.getByTestId('fanpage-next')).toBeVisible()
  await page.screenshot({ path: `${OUT}/portal-ready-${testInfo.project.name}.png`, fullPage: true })
})

test('失敗したときだけ、やり直しを示す', async ({ page }, testInfo) => {
  await openCreate(page)
  await page.getByTestId('page-name-input').fill('テストページ')
  await page.getByTestId('address-input').fill('fail-name')
  await expect(message(page)).toHaveAttribute('data-status', 'available')
  await submit(page).click()

  const progress = page.getByTestId('fanpage-progress')
  await expect(progress).toHaveAttribute('data-tone', 'failed', { timeout: 15_000 })
  await expect(page.getByRole('heading', { name: '歌推しページの作成に失敗しました' })).toBeVisible()
  await expect(page.getByTestId('fanpage-retry')).toBeVisible()
  await page.screenshot({ path: `${OUT}/portal-failed-${testInfo.project.name}.png`, fullPage: true })
})

test('準備の途中で再読み込みしても状態が消えない', async ({ page }) => {
  await openCreate(page)
  await page.getByTestId('page-name-input').fill('テストページ')
  await page.getByTestId('address-input').fill('fail-name')
  await expect(message(page)).toHaveAttribute('data-status', 'available')
  await submit(page).click()
  await expect(page.getByTestId('fanpage-progress')).toHaveAttribute('data-tone', 'failed', { timeout: 15_000 })

  // フルリロード。入力画面へ戻らず、作成の状態が残っていること。
  await page.reload()
  await expect(page.getByTestId('fanpage-progress')).toBeVisible()
  await expect(page.getByRole('heading', { name: '歌推しページの作成に失敗しました' })).toBeVisible()
  await expect(page.getByText('https://service.example.com/fail-name')).toBeVisible()
})

test('顧客向け画面に内部工程名を出さない', async ({ page }) => {
  await openCreate(page)
  await page.getByTestId('page-name-input').fill('テストページ')
  await page.getByTestId('address-input').fill('fail-name')
  await expect(message(page)).toHaveAttribute('data-status', 'available')
  await submit(page).click()
  await expect(page.getByTestId('fanpage-progress')).toHaveAttribute('data-tone', 'failed', { timeout: 15_000 })

  const text = await page.locator('body').innerText()
  for (const word of ['slug', 'repository', 'tenant', 'hosting', 'verification', 'provisioning', 'commit']) {
    expect(text.toLowerCase(), word).not.toContain(word.toLowerCase())
  }
})

test('ページ名から公開URLを勝手に決めず、候補として提示する', async ({ page }) => {
  await openCreate(page)
  await page.getByTestId('page-name-input').fill('Maguro Phone')

  // 入力しただけでは公開URLを埋めない。
  await expect(page.getByTestId('address-input')).toHaveValue('')
  await expect(page.getByTestId('availability-message')).toHaveAttribute('data-status', 'unchecked')

  // 候補は提示し、押したときだけ反映する。
  const suggestion = page.getByTestId('address-suggestion')
  await expect(suggestion).toHaveText('ページ名から「maguro-phone」を使う')
  await suggestion.click()
  await expect(page.getByTestId('address-input')).toHaveValue('maguro-phone')
  await expect(suggestion).toHaveCount(0)
})

test('日本語のページ名では候補を出さず、URLは空のままにする', async ({ page }) => {
  await openCreate(page)
  await page.getByTestId('page-name-input').fill('まぐろふぉん 歌推しページ')
  await expect(page.getByTestId('address-input')).toHaveValue('')
  await expect(page.getByTestId('address-suggestion')).toHaveCount(0)
  await expect(page.getByTestId('fanpage-create-submit')).toBeDisabled()
})

test('作成済みの記録が残っていても、名前とURLを決め直せる', async ({ page }) => {
  await openCreate(page)
  await page.getByTestId('page-name-input').fill('最初の名前')
  await page.getByTestId('address-input').fill('first-name')
  await expect(page.getByTestId('availability-message')).toHaveAttribute('data-status', 'available')
  await page.getByTestId('fanpage-create-submit').click()
  await expect(page.getByTestId('fanpage-progress')).toHaveAttribute('data-tone', 'ready', { timeout: 15_000 })

  // 記録が残ったまま開き直しても、決定済みの結果だけで終わらせない。
  await page.reload()
  await expect(page.getByTestId('fanpage-progress')).toBeVisible()
  await expect(page.getByTestId('fanpage-restart')).toBeVisible()

  await page.getByTestId('fanpage-restart').click()
  await expect(page.getByTestId('page-name-input')).toBeVisible()
  await expect(page.getByTestId('page-name-input')).toHaveValue('')
  await expect(page.getByTestId('address-input')).toHaveValue('')
})
