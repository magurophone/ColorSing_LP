import { expect, test } from '@playwright/test'

// 獲得者を表示しないティアは「特典管理」に列を作らないため、権利者一覧が参照して
// はいけない columnIndex を持つ。0 は A列＝ユーザー名と同じ値なので、そのまま
// 読むと表示名を権利値として評価してしまう。hasRight() は数字だけの文字列を
// 権利ありと判定するため、権利のない人が一覧へ出て、アイコンまで付いた。
//
// 判定はSheets由来でもDB由来でも同じ正規化済みview modelに対して行われる。
// 理屈だけで片方を省かず、両方の取得経路で同じ結果になることを実測する。
const PLATFORM_BASE = 'https://platform.example'
const SPREADSHEET_ID = 'rights-column-guard'

const BENEFIT_ROWS = [
  ['1k', '入門', '枠内専用ノーマルアイコン', '獲得者一覧には表示しない', ''],
  ['3k', 'サポーター', '名前入りの枠内専用アイコン', '獲得者一覧に表示する', ''],
]
// 0列目が表示名、1列目が3kの権利値、2列目がSpecial。
const RIGHTS_ROWS = [
  ['777', '', ''],
  ['888', 'TRUE', ''],
]

const BENEFIT_TIERS = [
  { key: '1k', label: '入門', icon: '⭐', columnIndex: 0, displayTemplate: '獲得済', isBoolean: true, showUsers: false },
  { key: '3k', label: 'サポーター', icon: '✅', columnIndex: 1, displayTemplate: '獲得済', isBoolean: true, showUsers: true },
]

const VIEWS = [
  { id: 'rights', label: '権利者', icon: 'users', enabled: true, title: '権利者一覧' },
]

function gviz(rows) {
  const table = { cols: [], rows: rows.map((row) => ({ c: row.map((value) => ({ v: value })) })) }
  return `/*O_o*/\ngoogle.visualization.Query.setResponse(${JSON.stringify({ table })})`
}

async function installConfig(page, config) {
  await page.route('**/customer/config.js', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: `window.DASHBOARD_CONFIG = ${JSON.stringify(config)}`,
  }))
}

// DB経路: 中央APIが正規化済みview modelをそのまま返す。
async function installDatabaseSource(page) {
  await installConfig(page, {
    brand: { name: '列ガード契約', pageTitle: '列ガード契約' },
    sheets: { spreadsheetId: 'demo' },
    platform: {
      tenantSlug: 'magurophone',
      publicApiBaseUrl: PLATFORM_BASE,
      readSource: 'db',
      shadowCompareEnabled: false,
      useRuntimeConfig: true,
    },
    benefitTiers: BENEFIT_TIERS,
    views: VIEWS,
  })
  await page.route(`${PLATFORM_BASE}/api/public/v1/runtime-config?*`, route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ version: 1, tenant: 'magurophone', lpReadSource: 'db', shadowCompareEnabled: false }),
  }))
  await page.route(`${PLATFORM_BASE}/api/public/v1/lp-data?*`, route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      version: 1,
      tenant: 'magurophone',
      source: 'db',
      data: {
        ranking: [],
        goals: [],
        benefits: BENEFIT_ROWS,
        rights: RIGHTS_ROWS,
        specialIndex: 2,
        history: [],
        events: { upcoming: null, past: [] },
        icons: { _orderedKeys: [] },
      },
    }),
  }))
}

// Sheets経路: GVizの生応答から現行parserが同じview modelを組み立てる。
async function installSheetsSource(page) {
  await installConfig(page, {
    brand: { name: '列ガード契約', pageTitle: '列ガード契約' },
    sheets: { spreadsheetId: SPREADSHEET_ID },
    benefitTiers: BENEFIT_TIERS,
    views: VIEWS,
  })
  await page.route('**/gviz/tq*', (route) => {
    const sheet = new URL(route.request().url()).searchParams.get('sheet') ?? ''
    let rows = []
    if (sheet.includes('特典管理')) {
      // 見出し行の Special を現行parserが検出し、以降を権利者行として扱う。
      rows = [['ユーザー名', '3k', 'Special'], ...RIGHTS_ROWS]
    } else if (sheet.includes('特典内容')) {
      rows = BENEFIT_ROWS
    }
    route.fulfill({ status: 200, contentType: 'text/javascript', body: gviz(rows) })
  })
}

const SOURCES = [
  { name: 'DB', install: installDatabaseSource },
  { name: 'Sheets', install: installSheetsSource },
]

for (const source of SOURCES) {
  test(`${source.name}経路: 数字だけの表示名を獲得者非表示ティアの列指定で権利ありと判定しない`, async ({ page }) => {
    await source.install(page)
    await page.goto('/index.html')
    await expect(page.getByRole('heading', { name: '権利者一覧' })).toBeVisible()

    // 権利を持つ人は従来どおり出る。
    await expect(page.getByRole('heading', { name: '888', level: 3 })).toBeVisible()
    // 権利を持たない数字名は一覧へ出ない。
    await expect(page.getByRole('heading', { name: '777', level: 3 })).toHaveCount(0)
  })

  test(`${source.name}経路: 獲得者非表示ティアのアイコンを一覧へ付けない`, async ({ page }) => {
    await source.install(page)
    await page.goto('/index.html')
    await expect(page.getByRole('heading', { name: '888', level: 3 })).toBeVisible()

    await expect(page.getByText('✅', { exact: true })).toBeVisible()
    await expect(page.getByText('⭐', { exact: true })).toHaveCount(0)
  })

  test(`${source.name}経路: 詳細でも獲得者非表示ティアを権利として見せない`, async ({ page }) => {
    await source.install(page)
    await page.goto('/index.html')

    await page.getByRole('heading', { name: '888', level: 3 }).click()
    await expect(page.getByRole('heading', { name: '888', level: 2 })).toBeVisible()
    await expect(page.getByText('3k サポーター', { exact: true })).toBeVisible()
    await expect(page.getByText('1k 入門', { exact: true })).toHaveCount(0)
  })
}
