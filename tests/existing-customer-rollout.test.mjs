import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  buildPlatformConfig,
  clickConfiguredView,
  readSettledText,
  requireImportSuccess,
  requireSecondApplyZero,
  requireSemanticDiffZero,
  requireTenantCreationResult,
  runDbCutoverProof,
  selectCustomer,
  validateCliArguments,
  validateCustomerConfig,
  validatePublicLpPayload,
} from '../scripts/lib/existing-customer-rollout.mjs'

const customers = JSON.parse(await readFile(
  new URL('../scripts/existing-customer-rollout.customers.json', import.meta.url),
  'utf8',
))

function configFor(customer) {
  return {
    brand: { name: customer.displayName },
    sheets: { spreadsheetId: 'real-sheet-id' },
    deploy: { owner: 'colorsing-dashboard', repo: customer.repo, branch: customer.branch },
    views: [
      { id: 'home', label: 'Home', enabled: customer.expectedEnabledViews.includes('home') },
      { id: 'menu', label: 'Menu', enabled: customer.expectedEnabledViews.includes('menu') },
      { id: 'rights', label: 'Rights', enabled: customer.expectedEnabledViews.includes('rights') },
      { id: 'icons', label: 'Icons', enabled: customer.expectedEnabledViews.includes('icons') },
      { id: 'events', label: 'Events', enabled: customer.expectedEnabledViews.includes('events') },
    ],
  }
}

const sourceHash = 'a'.repeat(64)

function importResult(overrides = {}) {
  return {
    sourceHash,
    inserted: 0,
    updated: 0,
    deleted: 0,
    skipped: 0,
    errors: 0,
    ...overrides,
  }
}

test('rollout manifest is a one-customer allowlist with the NaNa7 repo/tenant distinction', () => {
  assert.deepEqual(customers.map(customer => customer.key), ['npe', 'yuzukkuma', 'aruma', 'NaNa7', 'war-mi'])
  assert.equal(customers.some(customer => customer.key === 'yusuke'), false)
  assert.equal(customers.some(customer => customer.key === 'Hina_Amagi'), false)
  const nana = selectCustomer(customers, 'NaNa7')
  assert.equal(nana.repo, 'NaNa7')
  assert.equal(nana.tenantSlug, 'nana7')
  assert.throws(() => selectCustomer(customers, 'all'), /no batch\/all mode/)
})

test('CLI rejects every unknown option including --all instead of silently ignoring it', () => {
  validateCliArguments(['--customer', 'npe', '--through', 'plan'])
  validateCliArguments(['--customer', 'npe', '--through', 'stage', '--execute', '--confirm', 'npe'])
  assert.throws(
    () => validateCliArguments(['--customer', 'npe', '--all']),
    /Unknown argument: --all.*no batch\/all mode/,
  )
  assert.throws(() => validateCliArguments(['--customer']), /requires a value/)
})

test('platform patch preserves Sheets as local fallback and enables runtime-controlled shadow', () => {
  const customer = selectCustomer(customers, 'war-mi')
  const original = configFor(customer)
  validateCustomerConfig(customer, original)
  const patched = buildPlatformConfig(original, customer, 'https://tsumuen.com/')
  assert.deepEqual(patched.platform, {
    tenantSlug: 'war-mi',
    publicApiBaseUrl: 'https://tsumuen.com',
    readSource: 'sheets',
    shadowCompareEnabled: true,
    useRuntimeConfig: true,
  })
  assert.equal(patched.sheets, original.sheets)
  validateCustomerConfig(customer, patched, {
    allowPlatform: true,
    publicApiBaseUrl: 'https://tsumuen.com',
  })
})

test('each server stop condition rejects a non-zero or failed result', () => {
  requireImportSuccess(importResult(), 'dry-run')
  assert.throws(() => requireImportSuccess(importResult({ errors: 1 })), /errors=1/)
  assert.throws(() => requireImportSuccess({ ...importResult(), errors: undefined }, 'dry-run'), /invalid errors/)
  assert.throws(() => requireImportSuccess(importResult({ errors: '0' }), 'dry-run'), /invalid errors/)
  assert.throws(() => requireImportSuccess(importResult({ sourceHash: '' }), 'dry-run'), /invalid sourceHash/)

  requireSecondApplyZero(importResult())
  assert.throws(
    () => requireSecondApplyZero(importResult({ updated: 1 })),
    /updated=1/,
  )

  requireSemanticDiffZero({ equal: true, differences: [] })
  assert.throws(
    () => requireSemanticDiffZero({ equal: false, differences: [{ path: 'ranking' }] }),
    /differences=1/,
  )
})

test('tenant creation response must match the selected slug and new-tenant safety defaults', () => {
  const customer = selectCustomer(customers, 'NaNa7')
  const valid = {
    status: 201,
    payload: {
      created: true,
      tenant: { id: 'tenant-1', slug: 'nana7', displayName: customer.displayName },
      settings: { lpReadSource: 'sheets', shadowCompareEnabled: false },
    },
  }
  assert.equal(requireTenantCreationResult(valid, customer), valid.payload)
  assert.throws(
    () => requireTenantCreationResult({
      ...valid,
      payload: { ...valid.payload, tenant: { ...valid.payload.tenant, slug: 'NaNa7' } },
    }, customer),
    /tenant slug must be nana7/,
  )
  assert.throws(
    () => requireTenantCreationResult({
      ...valid,
      payload: { ...valid.payload, settings: { lpReadSource: 'sheets', shadowCompareEnabled: true } },
    }, customer),
    /must start with sheets \/ shadow=false/,
  )
})

test('public lp-data browser gate validates the DB DTO instead of accepting HTTP 200 alone', () => {
  const valid = {
    version: 1,
    tenant: 'npe',
    source: 'db',
    data: {
      ranking: [],
      goals: [],
      benefits: [],
      rights: [],
      history: [],
      specialIndex: 0,
      events: {},
      icons: {},
    },
  }
  assert.equal(validatePublicLpPayload(valid, 'npe'), valid)
  assert.throws(
    () => validatePublicLpPayload({ ...valid, data: { ...valid.data, rights: null } }, 'npe'),
    /rights is invalid/,
  )
  assert.throws(() => validatePublicLpPayload({ ...valid, tenant: 'aruma' }, 'npe'), /tenant must be npe/)
})

test('DB cutover rolls back to Sheets even when the DB settings response is lost', async () => {
  const actions = []
  let activeSource = 'sheets'
  await assert.rejects(
    () => runDbCutoverProof({
      setSource: async source => {
        actions.push(source)
        activeSource = source
        if (source === 'db') throw new Error('response lost')
      },
      verifyDb: async () => {},
      verifySheets: async () => {},
    }),
    /response lost/,
  )
  assert.deepEqual(actions, ['db', 'sheets'])
  assert.equal(activeSource, 'sheets')
})

test('DB cutover proof verifies DB, rollback, then DB in order', async () => {
  const actions = []
  const result = await runDbCutoverProof({
    setSource: async source => actions.push(`set:${source}`),
    verifyDb: async stage => {
      actions.push(`verify:db:${stage}`)
      return stage
    },
    verifySheets: async () => {
      actions.push('verify:sheets')
      return 'rollback'
    },
  })
  assert.deepEqual(actions, ['set:db', 'verify:db:first', 'set:sheets', 'verify:sheets', 'set:db', 'verify:db:final'])
  assert.deepEqual(result, { firstDb: 'first', rollback: 'rollback', secondDb: 'final' })
})

test('browser gate stops when an enabled view button cannot be found', async () => {
  const missingPage = {
    getByRole: () => ({ filter: () => ({ count: async () => 0 }) }),
    getByText: () => ({}),
  }
  await assert.rejects(
    () => clickConfiguredView(missingPage, { id: 'icons', label: 'Icons' }),
    /Enabled view button was not found: icons/,
  )
})

test('browser gate finds view buttons whose icon is an emoji (live legacy pages) or an svg', async () => {
  const { chromium } = await import('playwright')
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    // Sidebar.jsx と同じ形：絵柄（絵文字の span か svg）＋名前の span。旧ページの実物は「🏠 Home」。
    await page.setContent(`
      <button onclick="window.clicked='home'"><span style="font-size:20px">🏠</span><span class="font-body">Home</span></button>
      <button onclick="window.clicked='menu'"><svg width="20" height="20"></svg><span class="font-body">特典一覧</span></button>
      <button onclick="window.clicked='menu-long'"><span class="font-body">特典一覧の説明</span></button>
    `)
    await clickConfiguredView(page, { id: 'home', label: 'Home' })
    assert.equal(await page.evaluate(() => window.clicked), 'home')
    await clickConfiguredView(page, { id: 'menu', label: '特典一覧' })
    assert.equal(await page.evaluate(() => window.clicked), 'menu')
  } finally {
    await browser.close()
  }
})

test('browser gate reads the page text only after a counting-up number has settled', async () => {
  // 2026-11-04：旧ページのホームは数え上がる動き（CountUp）の途中で文字を取り、同じページでもハッシュが変わった。
  const { chromium } = await import('playwright')
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.setContent(`<div id="box"><span id="n">0</span>kg</div><script>
      const start = performance.now()
      const step = now => { const p = Math.min((now - start) / 1500, 1); document.getElementById('n').textContent = String(Math.floor(25 * p)); if (p < 1) requestAnimationFrame(step) }
      requestAnimationFrame(step)
    </script>`)
    assert.equal(await readSettledText(page.locator('#box'), { quietMs: 500 }), '25kg')
    // 動き続ける画面は、落ち着かないものとして止める。
    await page.setContent(`<div id="box">0</div><script>let i = 0; setInterval(() => { document.getElementById('box').textContent = String(++i) }, 50)</script>`)
    await assert.rejects(() => readSettledText(page.locator('#box'), { quietMs: 500, timeoutMs: 1500 }), /落ち着かなかった/)
    // 読み込み中の表示（止まって見える）が quietMs より長く出ても、それを取らずに中身を待つ（2026-11-04、npe のアイコン画面）。
    // 同じタブで setContent を続けると前の中身のタイマーが残って書き換えるので、1件ずつ新しいタブで見る。
    const loadingPage = async () => {
      const fresh = await browser.newPage()
      await fresh.setContent(`<div id="box"><div data-page-setting-target="ui.iconLoading">検索中....</div></div><script>
        setTimeout(() => { document.getElementById('box').textContent = '2026年7月' }, 1500)
      </script>`)
      return fresh.locator('#box')
    }
    assert.equal(await readSettledText(await loadingPage(), { quietMs: 500 }), '検索中....')
    assert.equal(await readSettledText(await loadingPage(), { quietMs: 500, busySelector: '[data-page-setting-target="ui.iconLoading"]' }), '2026年7月')
  } finally {
    await browser.close()
  }
})

test('rollout evidence directory is ignored by git', async () => {
  const gitignore = await readFile(new URL('../.gitignore', import.meta.url), 'utf8')
  assert.match(gitignore, /(^|\r?\n)\.local(?:\r?\n|$)/)
})

test('config drift stops before tenant creation or import', () => {
  const customer = selectCustomer(customers, 'npe')
  const config = configFor(customer)
  config.views.find(view => view.id === 'events').enabled = false
  assert.throws(() => validateCustomerConfig(customer, config), /Enabled views changed/)

  const wrongTarget = configFor(customer)
  wrongTarget.deploy.repo = 'another-repo'
  assert.throws(() => validateCustomerConfig(customer, wrongTarget), /target no longer matches/)
})
