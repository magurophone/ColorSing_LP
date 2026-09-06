import { expect, test } from '@playwright/test'

// Control Plane / D1 の特典表示設定が公開ページへ届くことと、
// 「未設定」と「明示的に空」が別物として扱われることを実測する。
//
//   キーが届かない … 配布物 config.js の値を使う（移行期間の安全装置）
//   空文字が届く   … 明示的に空。配布物へ戻さない
//   値が届く       … その値を使う
//
// 空文字を未設定として扱うと、絵文字を消したときに配布物の絵文字が復活する。
// `??` を `||` に書き換えるとこの取り違えが起きるので、空文字の場合を必ず見る。

const PLATFORM_BASE = 'https://platform.example'

const BENEFIT_ROWS = [
  ['5k', '壱番纏', '強制リクエスト権', '好きな曲を1曲', ''],
  ['40k', '獺祭', '強制リクエスト権', '好きな曲を1曲', ''],
  ['memb', '山崎25年', '月内リクエスト対応', 'メンシプ期間中', ''],
]

// 0列目が表示名、1列目が5k、2列目が40k、3列目がmemb、4列目がSpecial。
const RIGHTS_ROWS = [
  ['みお', '3', '56', 'TRUE', ''],
]

/* 配布物にある既存の値。移行前はこれが公開ページに出ている。 */
const BENEFIT_TIERS = [
  { key: '5k', icon: '🎵', columnIndex: 1, displayTemplate: '強制リクエスト: {value}曲' },
  { key: '40k', icon: '⚡', columnIndex: 2, displayTemplate: '強制リクエスト: {value}曲' },
  {
    key: 'memb',
    icon: '👑',
    columnIndex: 3,
    displayTemplate: '月内リクエスト対応中',
    isBoolean: true,
    isMembership: true,
    useKey: false,
    accessKey: 'あああ',
  },
]

const VIEWS = [
  { id: 'menu', label: '特典案内', icon: 'gift', enabled: true, title: '特典案内' },
  { id: 'rights', label: '権利者', icon: 'users', enabled: true, title: '権利者一覧' },
]

async function install(page, { benefitDisplays = {}, benefitTierDisplay = undefined } = {}) {
  await page.route('**/customer/config.js', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: `window.DASHBOARD_CONFIG = ${JSON.stringify({
      brand: { name: '表示設定の接続', pageTitle: '表示設定の接続' },
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
    })}`,
  }))
  await page.route(`${PLATFORM_BASE}/api/public/v1/runtime-config?*`, route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      version: 1,
      tenant: 'magurophone',
      lpReadSource: 'db',
      shadowCompareEnabled: false,
      ...(benefitTierDisplay ? { pageSettings: { benefitTierDisplay } } : {}),
      benefitDisplays,
    }),
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
        specialIndex: 4,
        history: [],
        events: { upcoming: null, past: [] },
        icons: { _orderedKeys: [] },
      },
    }),
  }))
}

async function openPerson(page) {
  await page.goto('/index.html')
  await page.getByText('権利者', { exact: true }).filter({ visible: true }).first().click()
  await page.getByRole('heading', { name: 'みお', level: 3 }).click()
  await expect(page.getByRole('heading', { name: 'みお', level: 2 })).toBeVisible()
  /* 同じ絵文字が権利者一覧とポップアップの両方に出るので、見る範囲をポップアップに絞る。 */
  return page.locator('.fixed.inset-0')
}

/* 名前と単位だけを持つ定義。7項目はどれも届かない＝すべて未設定。 */
const DEFINITION_ONLY = {
  '5k': { title: '強制リクエスト権', unit: '曲', tierLabel: '5K / 40K', showUsers: true },
  '40k': { title: '強制リクエスト権', unit: '曲', tierLabel: '5K / 40K', showUsers: true },
  memb: { title: '月内リクエスト対応', unit: '', tierLabel: 'Membership', showUsers: true },
}

// ---------------------------------------------------------------------------
// 絵文字の3状態
// ---------------------------------------------------------------------------

test('絵文字: キーが届かなければ配布物の絵文字を使う', async ({ page }) => {
  await install(page, { benefitDisplays: DEFINITION_ONLY })
  const popup = await openPerson(page)
  await expect(popup.getByText('🎵', { exact: true })).toBeVisible()
  await expect(popup.getByText('⚡', { exact: true })).toBeVisible()
})

test('絵文字: 空文字が届いたら絵文字を出さない。配布物へ戻さない', async ({ page }) => {
  await install(page, {
    benefitDisplays: {
      ...DEFINITION_ONLY,
      '5k': { ...DEFINITION_ONLY['5k'], icon: '' },
    },
  })
  const popup = await openPerson(page)
  // 空文字で消した5kの絵文字は出ない。ここで🎵が出るなら、空文字が未設定に化けている。
  await expect(popup.getByText('🎵', { exact: true })).toHaveCount(0)
  // 触っていない40kは配布物のまま。
  await expect(popup.getByText('⚡', { exact: true })).toBeVisible()
})

test('絵文字: 値が届いたらD1の絵文字を使う', async ({ page }) => {
  await install(page, {
    benefitDisplays: {
      ...DEFINITION_ONLY,
      '5k': { ...DEFINITION_ONLY['5k'], icon: '🐟' },
    },
  })
  const popup = await openPerson(page)
  await expect(popup.getByText('🐟', { exact: true })).toBeVisible()
  await expect(popup.getByText('🎵', { exact: true })).toHaveCount(0)
})

test('絵文字: 権利一覧キーごとの設定が定義側より優先される', async ({ page }) => {
  // まとめて見せている特典。定義側の絵文字は5kと40kの両方へ配られるが、
  // キーごとの設定があるほうはそちらを使う。
  await install(page, {
    benefitDisplays: {
      ...DEFINITION_ONLY,
      '5k': { ...DEFINITION_ONLY['5k'], icon: '🎵' },
      '40k': { ...DEFINITION_ONLY['40k'], icon: '🎵' },
    },
    benefitTierDisplay: { '40k': { icon: '⚡' } },
  })
  const popup = await openPerson(page)
  await expect(popup.getByText('🎵', { exact: true })).toBeVisible()
  await expect(popup.getByText('⚡', { exact: true })).toBeVisible()
})

test('絵文字: 権利一覧キーごとに空文字を入れたら、そのキーだけ絵文字が消える', async ({ page }) => {
  await install(page, {
    benefitDisplays: DEFINITION_ONLY,
    benefitTierDisplay: { '40k': { icon: '' } },
  })
  const popup = await openPerson(page)
  await expect(popup.getByText('🎵', { exact: true })).toBeVisible()
  await expect(popup.getByText('⚡', { exact: true })).toHaveCount(0)
})

// ---------------------------------------------------------------------------
// 表示文
// ---------------------------------------------------------------------------

test('表示文: 未設定で定義が届いていれば、表示名と単位から自動で作る', async ({ page }) => {
  await install(page, { benefitDisplays: DEFINITION_ONLY })
  await openPerson(page)
  await expect(page.getByText('強制リクエスト権: 3曲', { exact: true })).toBeVisible()
  await expect(page.getByText('強制リクエスト権: 56曲', { exact: true })).toBeVisible()
  // 配布物の言い回しへ戻らない。
  await expect(page.getByText('強制リクエスト: 3曲', { exact: true })).toHaveCount(0)
})

test('表示文: 未設定で配布物が値を出さない指定なら、内部値を出さない', async ({ page }) => {
  // 移行前の20kと同じ形。定義は届いているが表示文はまだ未設定。
  await install(page, {
    benefitDisplays: {
      ...DEFINITION_ONLY,
      memb: { title: 'オープンチャット招待', unit: '回', tierLabel: '20k', showUsers: true },
    },
  })
  await openPerson(page)
  await expect(page.getByText('オープンチャット招待', { exact: true })).toBeVisible()
  await expect(page.getByText('オープンチャット招待: TRUE回', { exact: true })).toHaveCount(0)
})

test('表示文: 空文字は自動生成という意思表示', async ({ page }) => {
  await install(page, {
    benefitDisplays: { ...DEFINITION_ONLY, '5k': { ...DEFINITION_ONLY['5k'], template: '' } },
  })
  await openPerson(page)
  await expect(page.getByText('強制リクエスト権: 3曲', { exact: true })).toBeVisible()
})

test('表示文: {value} があれば残数を入れる', async ({ page }) => {
  await install(page, {
    benefitDisplays: {
      ...DEFINITION_ONLY,
      '5k': { ...DEFINITION_ONLY['5k'], template: 'リクエスト {value}曲' },
    },
  })
  await openPerson(page)
  await expect(page.getByText('リクエスト 3曲', { exact: true })).toBeVisible()
})

test('表示文: {value} が無ければ固定の文章として出し、値を出さない', async ({ page }) => {
  await install(page, {
    benefitDisplays: {
      ...DEFINITION_ONLY,
      memb: { ...DEFINITION_ONLY.memb, template: '月内リクエスト対応中' },
    },
  })
  await openPerson(page)
  await expect(page.getByText('月内リクエスト対応中', { exact: true })).toBeVisible()
  // 権利表の内部値がそのまま出ない。
  await expect(page.getByText('月内リクエスト対応: TRUE', { exact: true })).toHaveCount(0)
})

// ---------------------------------------------------------------------------
// 入・切の3状態
// ---------------------------------------------------------------------------

test('特典カードを強調表示: 未設定なら配布物の指定のまま', async ({ page }) => {
  await install(page, { benefitDisplays: DEFINITION_ONLY })
  await openPerson(page)
  const card = page.locator('.fixed.inset-0 div').filter({ hasText: '月内リクエスト対応' }).last()
  await expect(card).toBeVisible()
  // 配布物が isMembership: true なので強調の枠が付く。
  await expect(page.locator('.fixed.inset-0 .border-highlight\\/30').first()).toBeVisible()
})

test('特典カードを強調表示: 切が届いたら配布物が入でも強調しない', async ({ page }) => {
  await install(page, {
    benefitDisplays: { ...DEFINITION_ONLY, memb: { ...DEFINITION_ONLY.memb, membershipCard: false } },
  })
  await openPerson(page)
  await expect(page.locator('.fixed.inset-0 .from-gold\\/10')).toHaveCount(0)
})

test('合言葉で開く: 入が届いたら配布物が切でも合言葉の入口が出る', async ({ page }) => {
  await install(page, {
    benefitDisplays: {
      ...DEFINITION_ONLY,
      memb: { ...DEFINITION_ONLY.memb, locked: true, accessKey: 'ひらけ' },
    },
  })
  await page.goto('/index.html')
  await expect(page.getByRole('heading', { name: '特典案内' })).toBeVisible()
  await expect(page.getByText('限定コンテンツ', { exact: false }).filter({ visible: true }).first()).toBeVisible()
})

test('合言葉で開く: 未設定なら配布物のまま入口を出さない', async ({ page }) => {
  await install(page, { benefitDisplays: DEFINITION_ONLY })
  await page.goto('/index.html')
  await expect(page.getByRole('heading', { name: '特典案内' })).toBeVisible()
  // 配布物は useKey: false なので出ない。
  await expect(page.getByText('限定コンテンツ', { exact: false }).filter({ visible: true })).toHaveCount(0)
})

// ---------------------------------------------------------------------------
// 非回帰
// ---------------------------------------------------------------------------

test('非回帰: 7項目が1つも届かないとき、配布物の表示のまま変わらない', async ({ page }) => {
  // 定義そのものが無いテナントを模す。移行前の他テナントと同じ状態。
  await install(page, { benefitDisplays: {} })
  const popup = await openPerson(page)
  await expect(popup.getByText('強制リクエスト: 3曲', { exact: true })).toBeVisible()
  await expect(popup.getByText('強制リクエスト: 56曲', { exact: true })).toBeVisible()
  await expect(popup.getByText('月内リクエスト対応中', { exact: true })).toBeVisible()
  await expect(popup.getByText('🎵', { exact: true })).toBeVisible()
  await expect(popup.getByText('⚡', { exact: true })).toBeVisible()
  await expect(popup.getByText('👑', { exact: true })).toBeVisible()
})
