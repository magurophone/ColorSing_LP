import { expect, test } from '@playwright/test'

const OUT = 'C:/Users/iimy/AppData/Local/Temp/claude/C--Users-iimy-desktop-SLT/9b16243b-f739-42c8-a0a8-d22f6748fa2b/scratchpad'

// 確認処理と作成処理を注入し、5つの確認状態と3つの作成状態を決定的に再現する。
async function installAdapters(page, { checkDelay = 50 } = {}) {
  await page.addInitScript(`
    window.__checkDelay = ${checkDelay};
  `)
  await page.addInitScript(() => {
    window.__portalCreateAdapters = {
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
  await page.goto('/portal-create.html')
  await expect(page.getByTestId('portal-create')).toBeVisible()
}

const message = (page) => page.getByTestId('availability-message')
const submit = (page) => page.getByTestId('portal-create-submit')

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

  const progress = page.getByTestId('portal-progress')
  await expect(progress).toBeVisible()
  await expect(progress).toHaveAttribute('data-tone', 'ready', { timeout: 15_000 })
  await expect(page.getByRole('heading', { name: '公開ページの準備ができました' })).toBeVisible()
  await expect(page.getByTestId('portal-next')).toBeVisible()
  await page.screenshot({ path: `${OUT}/portal-ready-${testInfo.project.name}.png`, fullPage: true })
})

test('失敗したときだけ、やり直しを示す', async ({ page }, testInfo) => {
  await openCreate(page)
  await page.getByTestId('page-name-input').fill('テストページ')
  await page.getByTestId('address-input').fill('fail-name')
  await expect(message(page)).toHaveAttribute('data-status', 'available')
  await submit(page).click()

  const progress = page.getByTestId('portal-progress')
  await expect(progress).toHaveAttribute('data-tone', 'failed', { timeout: 15_000 })
  await expect(page.getByRole('heading', { name: '公開ページの準備に失敗しました' })).toBeVisible()
  await expect(page.getByTestId('portal-retry')).toBeVisible()
  await page.screenshot({ path: `${OUT}/portal-failed-${testInfo.project.name}.png`, fullPage: true })
})

test('準備の途中で再読み込みしても状態が消えない', async ({ page }) => {
  await openCreate(page)
  await page.getByTestId('page-name-input').fill('テストページ')
  await page.getByTestId('address-input').fill('fail-name')
  await expect(message(page)).toHaveAttribute('data-status', 'available')
  await submit(page).click()
  await expect(page.getByTestId('portal-progress')).toHaveAttribute('data-tone', 'failed', { timeout: 15_000 })

  // フルリロード。入力画面へ戻らず、作成の状態が残っていること。
  await page.reload()
  await expect(page.getByTestId('portal-progress')).toBeVisible()
  await expect(page.getByRole('heading', { name: '公開ページの準備に失敗しました' })).toBeVisible()
  await expect(page.getByText('https://service.example.com/fail-name')).toBeVisible()
})

test('顧客向け画面に内部工程名を出さない', async ({ page }) => {
  await openCreate(page)
  await page.getByTestId('page-name-input').fill('テストページ')
  await page.getByTestId('address-input').fill('fail-name')
  await expect(message(page)).toHaveAttribute('data-status', 'available')
  await submit(page).click()
  await expect(page.getByTestId('portal-progress')).toHaveAttribute('data-tone', 'failed', { timeout: 15_000 })

  const text = await page.locator('body').innerText()
  for (const word of ['slug', 'repository', 'tenant', 'hosting', 'verification', 'provisioning', 'commit']) {
    expect(text.toLowerCase(), word).not.toContain(word.toLowerCase())
  }
})
