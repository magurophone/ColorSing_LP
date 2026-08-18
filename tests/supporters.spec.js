import { expect, test } from '@playwright/test'

// リスナー情報。実体はCentral DBにあり、この画面はその管理APIを叩く。
// 未接続で偽の一覧を出さない。0人と未接続を取り違えない。

const API = 'https://api.example.test'

const NEW_CUSTOMER = {
  brand: { name: '歌う人', pageTitle: '歌う人の特典ページ' },
  sheets: { spreadsheetId: '' },
  admin: { password: '' },
  benefitTiers: [],
  platform: { tenantSlug: 'utau-hito', adminApiBaseUrl: API },
}

const NOT_CONNECTED = { ...NEW_CUSTOMER, platform: { tenantSlug: '', adminApiBaseUrl: '' } }

const LEGACY_CUSTOMER = {
  brand: { name: '既存', pageTitle: '既存' },
  sheets: { spreadsheetId: 'existing-sheet' },
  admin: { password: '' },
}

async function install(page, config) {
  await page.route('**/customer/config.js*', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: `window.DASHBOARD_CONFIG = ${JSON.stringify(config)}`,
  }))
}

// SLT側の管理APIを模す。実際のレスポンス形に合わせる。
async function installApi(page, { supporters = [], definitions = [], failStatus = 0 } = {}) {
  const state = { rows: [...supporters], defs: [...definitions], cells: [] }

  await page.route(`${API}/api/admin/benefit-grid*`, async route => {
    if (failStatus) return route.fulfill({ status: failStatus, contentType: 'application/json', body: '{}' })
    const includeArchived = new URL(route.request().url()).searchParams.get('includeArchived') === 'true'
    const visible = includeArchived ? state.rows : state.rows.filter(row => !row.archived_at)
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        tenant: 'utau-hito',
        definitions: state.defs,
        supporters: visible,
        entitlements: state.cells,
      }),
    })
  })

  await page.route(`${API}/api/admin/supporters*`, async route => {
    if (failStatus) return route.fulfill({ status: failStatus, contentType: 'application/json', body: '{}' })
    const request = route.request()
    if (request.method() === 'POST') {
      const body = JSON.parse(request.postData() ?? '{}')
      const row = {
        id: `s-${state.rows.length + 1}`,
        display_name: body.displayName,
        note: body.note ?? '',
        latest_tier_key: null,
        archived_at: null,
        app_user_id: null,
      }
      state.rows.push(row)
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ tenant: 'utau-hito', supporter: row }) })
    }
    const url = new URL(request.url())
    const includeArchived = url.searchParams.get('includeArchived') === 'true'
    const visible = includeArchived ? state.rows : state.rows.filter(row => !row.archived_at)
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ tenant: 'utau-hito', supporters: visible }),
    })
  })
  await page.route(`${API}/api/admin/supporters/**`, async route => {
    const body = JSON.parse(route.request().postData() ?? '{}')
    const id = new URL(route.request().url()).pathname.split('/').pop()
    const row = state.rows.find(item => item.id === id)
    if (row) {
      if (typeof body.displayName === 'string') row.display_name = body.displayName
      if (typeof body.archived === 'boolean') row.archived_at = body.archived ? '2026-08-18T00:00:00.000Z' : null
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ tenant: 'utau-hito', supporter: row }) })
  })
  // 後から登録したものが先に照合されるため、これを最後に置く。
  await page.route(`${API}/api/admin/supporters/*/entitlements*`, async route => {
    const body = JSON.parse(route.request().postData() ?? '{}')
    const supporterId = new URL(route.request().url()).pathname.split('/').slice(-2)[0]
    for (const cell of body.cells ?? []) {
      state.cells = state.cells.filter(item => !(item.supporter_id === supporterId
        && item.benefit_definition_id === cell.benefitDefinitionId))
      if (Number(cell.quantity) > 0) {
        state.cells.push({
          supporter_id: supporterId,
          benefit_definition_id: cell.benefitDefinitionId,
          quantity: Number(cell.quantity),
          status: 'active',
        })
      }
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ entitlements: state.cells }) })
  })

  return state
}

test('未接続のときは、偽の一覧を出さずに理由を伝える', async ({ page }) => {
  await install(page, NOT_CONNECTED)
  await page.goto('/admin.html?tab=supporters')

  await expect(page.getByTestId('supporters-not-configured')).toBeVisible()
  await expect(page.getByTestId('supporters-grid')).toHaveCount(0)
  await expect(page.getByTestId('supporter-add')).toHaveCount(0)
})

const DEFS = [
  { id: 'd-1k', key: '1K', title: '1K', sort_order: 1 },
  { id: 'd-5k', key: '5K', title: '5K', sort_order: 2 },
  { id: 'd-10k', key: '10K', title: '10K', sort_order: 3 },
  // 数を持たない特典。持つか持たないかだけを聞く。
  { id: 'd-chat', key: 'チャット招待', title: 'チャット招待', sort_order: 4, input_type: 'boolean' },
]
const SUP = [{ id: 's-1', display_name: 'ほしぞら', note: '', latest_tier_key: null, archived_at: null, app_user_id: null }]

test('接続されていれば、リスナーを登録できる', async ({ page }) => {
  await install(page, NEW_CUSTOMER)
  await installApi(page, { definitions: DEFS })
  await page.goto('/admin.html?tab=supporters')

  // 0人は「まだ登録していない」であって、未接続ではない。
  await expect(page.getByTestId('supporters-empty')).toBeVisible()
  await expect(page.getByTestId('supporters-not-configured')).toHaveCount(0)

  await page.getByTestId('supporter-name-input').fill('ほしぞら')
  await page.getByTestId('supporter-add').click()

  await expect(page.getByTestId('supporters-grid')).toBeVisible()
  await expect(page.getByTestId('grid-row')).toHaveCount(1)
  await expect(page.getByTestId('grid-row-name')).toHaveText('ほしぞら')
})

test('表で、リスナーごとの特典をまとめて入れられる', async ({ page }) => {
  await install(page, NEW_CUSTOMER)
  await installApi(page, { supporters: SUP, definitions: DEFS })
  await page.goto('/admin.html?tab=supporters')

  // 列は特典段階に対応する。列番号は画面に出さない。
  const grid = page.getByTestId('supporters-grid')
  await expect(grid.locator('th')).toContainText(['リスナー', '1K', '5K', '10K'])

  const cell = page.getByLabel('ほしぞら の 5K')
  await cell.fill('2')
  await cell.blur()
  await expect(page.getByLabel('ほしぞら の 5K')).toHaveValue('2')

  // 空にすると、持っていない状態へ戻る。
  await page.getByLabel('ほしぞら の 5K').fill('')
  await page.getByLabel('ほしぞら の 5K').blur()
  await expect(page.getByLabel('ほしぞら の 5K')).toHaveValue('')
})

test('数を持たない特典は、数字ではなくチェックで入れる', async ({ page }) => {
  await install(page, NEW_CUSTOMER)
  await installApi(page, { supporters: SUP, definitions: DEFS })
  await page.goto('/admin.html?tab=supporters')

  // 数量のある特典は数字を入れる欄。
  await expect(page.getByLabel('ほしぞら の 5K')).toHaveAttribute('inputmode', 'numeric')

  // 数を持たない特典はチェック。数字を入れさせない。
  const toggle = page.getByLabel('ほしぞら の チャット招待')
  await expect(toggle).toHaveAttribute('type', 'checkbox')
  await expect(toggle).not.toBeChecked()
  await toggle.check()
  await expect(page.getByLabel('ほしぞら の チャット招待')).toBeChecked()
  await page.getByLabel('ほしぞら の チャット招待').uncheck()
  await expect(page.getByLabel('ほしぞら の チャット招待')).not.toBeChecked()
})

test('名前を押すと詳細へ入り、そこでも直せる', async ({ page }) => {
  await install(page, NEW_CUSTOMER)
  await installApi(page, { supporters: SUP, definitions: DEFS })
  await page.goto('/admin.html?tab=supporters')

  await page.getByTestId('grid-row-name').click()
  await expect(page.getByTestId('supporter-detail')).toBeVisible()

  const nameField = page.getByTestId('supporter-detail-name')
  await expect(nameField).toHaveValue('ほしぞら')
  await nameField.fill('ほしぞらリスナー')
  await nameField.blur()

  await page.getByTestId('supporter-detail-back').click()
  await expect(page.getByTestId('grid-row-name')).toHaveText('ほしぞらリスナー')
})

test('一覧から外した人は既定で出さず、必要なときだけ出せる', async ({ page }) => {
  await install(page, NEW_CUSTOMER)
  await installApi(page, { supporters: SUP, definitions: DEFS })
  await page.goto('/admin.html?tab=supporters')

  await page.getByTestId('grid-row-name').click()
  await page.getByTestId('supporter-archive').click()
  await expect(page.getByTestId('supporters-empty')).toBeVisible()

  await page.getByTestId('supporter-include-archived').check()
  await expect(page.getByTestId('grid-row')).toHaveCount(1)
  await expect(page.getByTestId('grid-row')).toContainText('休止中')
})

test('シート固有の言葉を、画面へ持ち込まない', async ({ page }) => {
  await install(page, NEW_CUSTOMER)
  await installApi(page, { supporters: SUP, definitions: DEFS })
  await page.goto('/admin.html?tab=supporters')

  const text = await page.getByTestId('supporters-tab').innerText()
  for (const word of ['列インデックス', '列番号', 'スプレッドシート', 'シート', 'supporter']) {
    expect(text, word).not.toContain(word)
  }
})

test('読み込みに失敗したら、中身を作らずに理由を出す', async ({ page }) => {
  await install(page, NEW_CUSTOMER)
  await installApi(page, { failStatus: 403 })
  await page.goto('/admin.html?tab=supporters')

  await expect(page.getByTestId('supporters-error')).toBeVisible()
  await expect(page.getByTestId('supporters-error')).toContainText('権限')
  await expect(page.getByTestId('supporters-grid')).toHaveCount(0)
})

test('既存顧客にはこのタブを出さない', async ({ page }) => {
  await install(page, LEGACY_CUSTOMER)
  await page.goto('/admin.html?tab=supporters')
  // URLで直接指定しても開かない。既存顧客の正本はSheetsのまま。
  await expect(page.getByRole('heading', { name: 'ブランディング' }).first()).toBeVisible()
  await expect(page.getByTestId('supporters-tab')).toHaveCount(0)
})

test('未接続のうちは、設定の手順にリスナー情報を出さない', async ({ page }) => {
  await install(page, NOT_CONNECTED)
  await page.goto('/onboarding.html')
  // 何をすればよいか分からない項目を、番号付きで手順に並べない。
  await expect(page.getByRole('button', { name: /リスナー情報/ })).toHaveCount(0)
})

test('接続されたら、設定の手順に出てリスナー画面へ連れて行く', async ({ page }) => {
  await install(page, NEW_CUSTOMER)
  await installApi(page)
  await page.goto('/onboarding.html')

  const step = page.getByRole('button', { name: /リスナー情報/ }).first()
  await expect(step).toBeVisible()
  await step.click()
  await page.getByTestId('step-action').click()
  await expect(page).toHaveURL(/admin\.html\?tab=supporters&guide=setup-supporters/)
  await expect(page.getByTestId('setup-guide-bar')).toBeVisible()
})
