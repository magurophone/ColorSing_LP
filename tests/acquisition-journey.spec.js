import { expect, test } from '@playwright/test'

const OUT = 'C:/Users/iimy/AppData/Local/Temp/claude/C--Users-iimy-desktop-SLT/9b16243b-f739-42c8-a0a8-d22f6748fa2b/scratchpad'

// 利用権とアカウントを持つ人が、歌推しページ作成からDAPを経て公開の直前まで進む通し確認。
// 決済と認証の事業者が未確定でも、この範囲は成立していなければならない。
const CONFIG = {
  brand: { name: '', pageTitle: '' },
  sheets: { spreadsheetId: '' },
  admin: { password: '' },
  views: [
    { id: 'home', label: 'Home', icon: 'home', enabled: true },
    { id: 'rights', label: '権利者', icon: 'users', enabled: true },
  ],
}

async function installJourney(page) {
  await page.addInitScript(`
    window.__fanPagePreviewBase = 'https://service.example.com';
  `)
  await page.addInitScript(() => {
    window.__fanPageCreateAdapters = {
      checkAvailability: async () => {
        await new Promise(resolve => setTimeout(resolve, 30))
        return true
      },
      provisioningAdapter: {
        executeStep: async (stepId) => {
          await new Promise(resolve => setTimeout(resolve, 10))
          return { resource: stepId }
        },
      },
    }
  })
  await page.route('**/customer/config.js', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: `window.DASHBOARD_CONFIG = ${JSON.stringify(CONFIG)}`,
  }))
}

test('歌推しページ未作成のDAPは、行き止まりではなく作成への導線を示す', async ({ page }, testInfo) => {
  await installJourney(page)
  await page.goto('/onboarding.html')

  const detail = page.getByTestId('step-action')
  await expect(page.getByRole('heading', { name: '歌推しページの準備' }).first()).toBeVisible()
  await expect(page.getByText('まだ歌推しページを作っていません')).toBeVisible()
  await expect(detail).toBeVisible()
  await expect(detail).toHaveText('歌推しページを作成する')
  // 以前の「歌推しページが作成されていること。」は出さない。
  await expect(page.getByText('Portalの識別情報')).toHaveCount(0)
  await page.screenshot({ path: `${OUT}/journey-1-dap-not-created-${testInfo.project.name}.png`, fullPage: true })
})

test('作成の導線から歌推しページを作り、DAPへ戻ると準備済みとして扱われる', async ({ page }, testInfo) => {
  await installJourney(page)
  await page.goto('/onboarding.html')

  // DAPの案内から作成画面へ移動する。
  await page.getByTestId('step-action').click()
  await expect(page.getByTestId('fanpage-create')).toBeVisible()

  await page.getByTestId('page-name-input').fill('通しテスト 歌推しページ')
  await page.getByTestId('address-input').fill('journey-portal')
  await expect(page.getByTestId('availability-message')).toHaveAttribute('data-status', 'available')
  await page.screenshot({ path: `${OUT}/journey-2-create-${testInfo.project.name}.png`, fullPage: true })

  await page.getByTestId('fanpage-create-submit').click()
  await expect(page.getByTestId('fanpage-progress')).toHaveAttribute('data-tone', 'ready', { timeout: 15_000 })
  await page.screenshot({ path: `${OUT}/journey-3-ready-${testInfo.project.name}.png`, fullPage: true })

  // 作成完了の導線からDAPへ戻る。
  await page.getByTestId('fanpage-next').click()
  await expect(page.getByRole('heading', { name: '歌推しページの準備' }).first()).toBeVisible()
  await expect(page.getByText('まだ歌推しページを作っていません')).toHaveCount(0)
  await expect(page.getByTestId('step-action')).toHaveCount(0)
  await page.screenshot({ path: `${OUT}/journey-4-dap-ready-${testInfo.project.name}.png`, fullPage: true })
})

test('歌推しページ作成後は基本情報から公開準備まで順に進める', async ({ page }, testInfo) => {
  await installJourney(page)
  await page.goto('/fanpage-create.html')
  await page.getByTestId('page-name-input').fill('通しテスト 歌推しページ')
  await page.getByTestId('address-input').fill('journey-portal')
  await expect(page.getByTestId('availability-message')).toHaveAttribute('data-status', 'available')
  await page.getByTestId('fanpage-create-submit').click()
  await expect(page.getByTestId('fanpage-progress')).toHaveAttribute('data-tone', 'ready', { timeout: 15_000 })
  await page.getByTestId('fanpage-next').click()

  // 基本情報。
  await page.getByRole('button', { name: /基本情報/ }).first().click()
  await page.getByRole('textbox', { name: '表示名' }).fill('通しテスト')
  await page.getByRole('textbox', { name: 'ページ名' }).fill('通しテスト 歌推しページ')

  // 新規顧客にスプレッドシートの用意を求めない。手順そのものを出さない。
  await expect(page.getByRole('button', { name: /データ管理方法/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /データ接続/ })).toHaveCount(0)

  // 代わりに、利用者の作業であるリスナー情報を出す。
  await page.getByRole('button', { name: /リスナー情報/ }).first().click()
  await expect(page.getByText('リスナー情報の管理画面を準備しています')).toBeVisible()

  await page.screenshot({ path: `${OUT}/journey-5-dap-progress-${testInfo.project.name}.png`, fullPage: true })
  // 歌推しページの準備が完了として残り続けることが、この通しで守りたい状態。
  await page.getByRole('button', { name: /歌推しページの準備/ }).first().click()
  await expect(page.getByText('まだ歌推しページを作っていません')).toHaveCount(0)
})

test('準備中の歌推しページはDAPでも待ちとして示し、エラーにしない', async ({ page }, testInfo) => {
  await installJourney(page)
  // 作成途中の記録だけを置いた状態でDAPを開く。
  await page.addInitScript(() => {
    localStorage.setItem('fanpage_creation_state_v1', JSON.stringify({
      version: 1,
      pageName: '準備中のページ',
      publicAddress: 'preparing-portal',
      startedAt: new Date().toISOString(),
      provisioning: {
        version: 1,
        tenantId: 'preparing-portal',
        operationId: 'op-preparing',
        status: 'in_progress',
        currentStep: 'hosting',
        steps: {},
        audit: [],
      },
    }))
  })
  await page.goto('/onboarding.html')
  await expect(page.getByText('歌推しページを準備しています')).toBeVisible()
  await expect(page.getByTestId('step-action')).toHaveCount(0)
  await page.screenshot({ path: `${OUT}/journey-6-dap-preparing-${testInfo.project.name}.png`, fullPage: true })
})
