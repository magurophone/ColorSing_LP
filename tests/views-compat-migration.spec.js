import { expect, test } from '@playwright/test'

// dev サーバーは /index.html を配信するため、configIO の _repoSlug は 'default' になる
const SLUG = 'default'
const STORED_KEY = `dashboard_config_${SLUG}`
const META_KEY = `config_meta_${SLUG}`
const ADMIN_KEY = `admin_browser_${SLUG}`

const PUBLISHED_VIEWS = [
  { id: 'home', label: 'Home', icon: 'home', enabled: true },
  { id: 'menu', label: '特典内容', icon: 'book-open', enabled: true },
  { id: 'rights', label: '特典権利者', icon: 'user-check', enabled: true, title: '特典権利者一覧' },
  { id: 'icons', label: '枠内アイコン', icon: 'gift', enabled: true, title: '枠内アイコン' },
  { id: 'events', label: 'イベント', icon: 'calendar-days', enabled: true },
]

// NaNa7 相当の公開設定。compat で今回の移行に opt-in している。
const OPTED_IN_CONFIG = {
  brand: { name: 'NaNa7', sidebarTitle: 'NaNa7', pageTitle: 'NaNa7 契約テスト' },
  sheets: { spreadsheetId: 'demo' },
  compat: { viewsMigrationVersion: 1 },
  views: PUBLISHED_VIEWS,
}

// opt-in していない既存 tenant
const LEGACY_CONFIG = { ...OPTED_IN_CONFIG, compat: undefined, brand: { ...OPTED_IN_CONFIG.brand, pageTitle: 'legacy' } }

// 古い端末に残っている設定。events が無効のまま保存されている。
const STALE_STORED = {
  brand: { name: 'NaNa7' },
  sheets: { spreadsheetId: 'demo' },
  home: { pointsLabel: '歌推しPt' },
  views: [
    ...PUBLISHED_VIEWS.slice(0, 4),
    { id: 'events', label: 'イベント', icon: '📖', enabled: false, title: 'イベント' },
  ],
}

async function installConfig(page, config) {
  await page.route('**/customer/config.js', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: `window.DASHBOARD_CONFIG = ${JSON.stringify(config)}`,
  }))
}

async function seedStorage(page, entries) {
  await page.addInitScript(seed => {
    for (const [key, value] of Object.entries(seed)) {
      localStorage.setItem(key, value)
    }
  }, entries)
}

// デスクトップは Sidebar、モバイルは BottomNav。どちらでも「見えている」タブだけ数える。
function visibleTabCount(page, label) {
  return page.evaluate(text => [...document.querySelectorAll('button')]
    .filter(b => b.textContent?.includes(text) && b.getBoundingClientRect().width > 0)
    .length, label)
}

async function readStored(page) {
  return JSON.parse(await page.evaluate(key => localStorage.getItem(key), STORED_KEY))
}

test('古いlocalStorageの端末でも、公開済みのイベントタブが表示される', async ({ page }) => {
  await installConfig(page, OPTED_IN_CONFIG)
  await seedStorage(page, { [STORED_KEY]: JSON.stringify(STALE_STORED) })

  await page.goto('/index.html')
  await expect(page.getByRole('button', { name: 'Home' }).first()).toBeVisible()

  expect(await visibleTabCount(page, 'イベント')).toBeGreaterThan(0)

  const stored = await readStored(page)
  expect(stored.views.find(v => v.id === 'events').enabled).toBe(true)
  expect(stored.home).toEqual({ pointsLabel: '歌推しPt' }) // views以外は保持
})

test('修復は一度きりで、あとから管理者がOFFにしたらOFFのまま', async ({ page }) => {
  await installConfig(page, OPTED_IN_CONFIG)
  await seedStorage(page, { [STORED_KEY]: JSON.stringify(STALE_STORED) })

  await page.goto('/index.html')
  await expect(page.getByRole('button', { name: 'Home' }).first()).toBeVisible()
  expect(await visibleTabCount(page, 'イベント')).toBeGreaterThan(0)

  // 管理者がこの端末でローカルに OFF へ戻す（admin.html での保存に相当）
  await page.evaluate(({ storedKey, metaKey }) => {
    const config = JSON.parse(localStorage.getItem(storedKey))
    config.views = config.views.map(v => (v.id === 'events' ? { ...v, enabled: false } : v))
    localStorage.setItem(storedKey, JSON.stringify(config))
    localStorage.setItem(metaKey, JSON.stringify({
      ...JSON.parse(localStorage.getItem(metaKey) ?? '{}'),
      lastModified: Date.now(),
    }))
  }, { storedKey: STORED_KEY, metaKey: META_KEY })

  await page.reload()
  await expect(page.getByRole('button', { name: 'Home' }).first()).toBeVisible()
  expect(await visibleTabCount(page, 'イベント')).toBe(0)
})

test('既存の管理者端末（config_meta.lastModified あり）は修復されない', async ({ page }) => {
  await installConfig(page, OPTED_IN_CONFIG)
  await seedStorage(page, {
    [STORED_KEY]: JSON.stringify(STALE_STORED),
    [META_KEY]: JSON.stringify({ lastModified: 1756000000000 }),
  })

  await page.goto('/index.html')
  await expect(page.getByRole('button', { name: 'Home' }).first()).toBeVisible()

  expect(await visibleTabCount(page, 'イベント')).toBe(0)
  expect(await readStored(page)).toEqual(STALE_STORED)
})

test('永続管理者フラグのある端末は修復されない', async ({ page }) => {
  await installConfig(page, OPTED_IN_CONFIG)
  await seedStorage(page, {
    [STORED_KEY]: JSON.stringify(STALE_STORED),
    [ADMIN_KEY]: 'true',
  })

  await page.goto('/index.html')
  await expect(page.getByRole('button', { name: 'Home' }).first()).toBeVisible()

  expect(await visibleTabCount(page, 'イベント')).toBe(0)
  expect(await readStored(page)).toEqual(STALE_STORED)
})

test('opt-in していない tenant は従来どおり localStorage が優先される', async ({ page }) => {
  await installConfig(page, LEGACY_CONFIG)
  await seedStorage(page, { [STORED_KEY]: JSON.stringify(STALE_STORED) })

  await page.goto('/index.html')
  await expect(page.getByRole('button', { name: 'Home' }).first()).toBeVisible()

  expect(await visibleTabCount(page, 'イベント')).toBe(0)
  expect(await readStored(page)).toEqual(STALE_STORED)
  expect(await page.evaluate(key => localStorage.getItem(key), META_KEY)).toBeNull()
})

test('新規ブラウザは公開設定どおりで、余計な書き込みをしない', async ({ page }) => {
  await installConfig(page, OPTED_IN_CONFIG)

  await page.goto('/index.html')
  await expect(page.getByRole('button', { name: 'Home' }).first()).toBeVisible()

  expect(await visibleTabCount(page, 'イベント')).toBeGreaterThan(0)
  expect(await page.evaluate(key => localStorage.getItem(key), META_KEY)).toBeNull()
  expect(await page.evaluate(key => localStorage.getItem(key), STORED_KEY)).toBeNull()
})

// --- 管理画面: 永続管理者フラグ ---------------------------------------------

const ADMIN_CONFIG = { ...OPTED_IN_CONFIG, admin: { password: 'test-pass' } }

async function openAdmin(page) {
  await installConfig(page, ADMIN_CONFIG)
  page.on('dialog', dialog => dialog.dismiss())
  await page.goto('/admin.html')
  await expect(page.getByPlaceholder('パスワードを入力')).toBeVisible()
}

const adminFlag = page => page.evaluate(key => localStorage.getItem(key), ADMIN_KEY)

test('管理画面を開いただけでは永続管理者フラグが立たない', async ({ page }) => {
  await openAdmin(page)
  expect(await adminFlag(page)).toBeNull()
})

test('パスワード認証に失敗しても永続管理者フラグは立たない', async ({ page }) => {
  await openAdmin(page)

  await page.getByPlaceholder('パスワードを入力').fill('wrong-pass')
  await page.getByRole('button', { name: 'ログイン' }).click()

  await expect(page.getByPlaceholder('パスワードを入力')).toBeVisible()
  expect(await adminFlag(page)).toBeNull()
})

test('パスワード認証に成功すると永続管理者フラグが立つ', async ({ page }) => {
  await openAdmin(page)

  await page.getByPlaceholder('パスワードを入力').fill('test-pass')
  await page.getByRole('button', { name: 'ログイン' }).click()

  await expect(page.getByPlaceholder('パスワードを入力')).toBeHidden()
  expect(await adminFlag(page)).toBe('true')
})

test('壊れたlocalStorageでも公開ページが落ちない', async ({ page }) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))

  await installConfig(page, OPTED_IN_CONFIG)
  await seedStorage(page, { [STORED_KEY]: '{壊れている' })

  await page.goto('/index.html')
  await expect(page.getByRole('button', { name: 'Home' }).first()).toBeVisible()

  expect(await visibleTabCount(page, 'イベント')).toBeGreaterThan(0)
  expect(errors).toEqual([])
  expect(await page.evaluate(key => localStorage.getItem(key), STORED_KEY)).toBe('{壊れている')
})
