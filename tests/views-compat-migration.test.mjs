import assert from 'node:assert/strict'
import test from 'node:test'
import {
  adminBrowserKey,
  configMetaKey,
  isAdminBrowser,
  markAdminBrowser,
  migrateStoredViews,
  storedConfigKey,
} from '../src/lib/viewsCompatMigration.js'

const SLUG = 'NaNa7'

// NaNa7 の公開済み config.js が持つ views（events は表示有効）
const PUBLISHED_VIEWS = [
  { id: 'home', label: 'Home', icon: 'home', enabled: true },
  { id: 'menu', label: '特典内容', icon: 'book-open', enabled: true },
  { id: 'rights', label: '特典権利者', icon: 'user-check', enabled: true, title: '特典権利者一覧' },
  { id: 'icons', label: '枠内アイコン', icon: 'gift', enabled: true, title: '枠内アイコン' },
  { id: 'events', label: 'イベント', icon: 'calendar-days', enabled: true },
]

function storageWith(entries = {}) {
  const map = new Map(Object.entries(entries))
  return {
    getItem: key => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, value),
    removeItem: key => map.delete(key),
    keys: () => [...map.keys()].sort(),
    readJson: key => JSON.parse(map.get(key)),
  }
}

function storedConfig(overrides = {}) {
  return {
    brand: { name: 'NaNa7' },
    sheets: { spreadsheetId: 'sheet-id', eventSheetName: 'イベント' },
    benefitTiers: [{ key: '1k', label: 'チワワ' }],
    admin: { password: 'secret' },
    ...overrides,
  }
}

function run(storage, version = 1, publishedViews = PUBLISHED_VIEWS) {
  return migrateStoredViews({ storage, repoSlug: SLUG, publishedViews, version })
}

// --- 一般閲覧者 -------------------------------------------------------------

test('1. 古いlocalStorageにeventsが無いと、公開されているviews構成へ移行される', () => {
  const stale = storedConfig({
    views: [
      { id: 'home', label: 'Home', icon: 'home', enabled: true },
      { id: 'menu', label: '特典内容', icon: 'book-open', enabled: true },
    ],
  })
  const storage = storageWith({ [storedConfigKey(SLUG)]: JSON.stringify(stale) })

  const result = run(storage)

  assert.equal(result.applied, true)
  assert.deepEqual(storage.readJson(storedConfigKey(SLUG)).views, PUBLISHED_VIEWS)
})

test('2. events.enabled=false が残っていても、公開状態のtrueへ修復される', () => {
  const stale = storedConfig({
    views: [
      ...PUBLISHED_VIEWS.slice(0, 4),
      { id: 'events', label: 'イベント', icon: '📖', enabled: false, title: 'イベント' },
    ],
  })
  const storage = storageWith({ [storedConfigKey(SLUG)]: JSON.stringify(stale) })

  assert.equal(run(storage).applied, true)

  const events = storage.readJson(storedConfigKey(SLUG)).views.find(v => v.id === 'events')
  assert.equal(events.enabled, true, 'イベントタブが表示される状態になる')
  assert.equal(events.icon, 'calendar-days')
})

test('3. events以外のviewの食い違い（順序・label・enabled）も公開構成へ揃う', () => {
  const stale = storedConfig({
    views: [
      { id: 'events', label: '昔のイベント', icon: '📖', enabled: false },
      { id: 'icons', label: '枠内アイコン', icon: '🖼️', enabled: false, title: '🖼️ 枠内アイコン' },
      { id: 'home', label: 'ホーム', icon: 'home', enabled: true },
    ],
  })
  const storage = storageWith({ [storedConfigKey(SLUG)]: JSON.stringify(stale) })

  assert.equal(run(storage).applied, true)
  assert.deepEqual(storage.readJson(storedConfigKey(SLUG)).views, PUBLISHED_VIEWS)
})

test('4. views以外のlocalStorage設定は一切変更されない', () => {
  const stale = storedConfig({ views: [{ id: 'home', label: 'Home', icon: 'home', enabled: true }] })
  const storage = storageWith({
    [storedConfigKey(SLUG)]: JSON.stringify(stale),
    admin_theme: 'light',
    other_tenant: 'untouched',
  })

  run(storage)

  const after = storage.readJson(storedConfigKey(SLUG))
  const { views: _before, ...beforeRest } = stale
  const { views: _after, ...afterRest } = after
  assert.deepEqual(afterRest, beforeRest, 'views以外のキーはそのまま')
  assert.equal(storage.getItem('admin_theme'), 'light')
  assert.equal(storage.getItem('other_tenant'), 'untouched')
})

test('4b. dashboard_config を丸ごと消さない', () => {
  const storage = storageWith({
    [storedConfigKey(SLUG)]: JSON.stringify(storedConfig({ views: [] })),
  })
  run(storage)
  assert.ok(storage.getItem(storedConfigKey(SLUG)), 'キーは残る')
})

test('5. migration済みのブラウザでは再実行されない', () => {
  const stale = storedConfig({ views: [{ id: 'home', label: 'Home', icon: 'home', enabled: true }] })
  const storage = storageWith({ [storedConfigKey(SLUG)]: JSON.stringify(stale) })

  assert.equal(run(storage).applied, true)
  assert.equal(storage.readJson(configMetaKey(SLUG)).viewsCompatVersion, 1)

  // 移行後、管理者がこの端末でローカルにOFFへ戻した場合を模す
  const local = storage.readJson(storedConfigKey(SLUG))
  local.views = local.views.map(v => (v.id === 'events' ? { ...v, enabled: false } : v))
  storage.setItem(storedConfigKey(SLUG), JSON.stringify(local))

  const second = run(storage)
  assert.equal(second.applied, false)
  assert.equal(second.reason, 'already-migrated')
  assert.equal(
    storage.readJson(storedConfigKey(SLUG)).views.find(v => v.id === 'events').enabled,
    false,
    '毎アクセスでconfig.jsへ強制追従しない',
  )
})

test('5b. version を記録するとき lastModified を足さない（管理操作の印を偽らない）', () => {
  const storage = storageWith({
    [storedConfigKey(SLUG)]: JSON.stringify(storedConfig({ views: [{ id: 'home', enabled: true }] })),
  })
  run(storage)
  const meta = storage.readJson(configMetaKey(SLUG))
  assert.equal(meta.viewsCompatVersion, 1)
  assert.equal(meta.lastModified, undefined)
})

test('6. localStorage の JSON が壊れていてもクラッシュせず、消しもしない', () => {
  const storage = storageWith({ [storedConfigKey(SLUG)]: '{壊れている' })
  const result = run(storage)
  assert.equal(result.applied, false)
  assert.equal(result.reason, 'unreadable-stored-config')
  assert.equal(storage.getItem(storedConfigKey(SLUG)), '{壊れている', '壊れた値も勝手に消さない')
})

test('6b. storage が例外を投げてもクラッシュしない', () => {
  const hostile = {
    getItem: () => { throw new Error('blocked') },
    setItem: () => { throw new Error('blocked') },
  }
  assert.doesNotThrow(() => migrateStoredViews({
    storage: hostile, repoSlug: SLUG, publishedViews: PUBLISHED_VIEWS, version: 1,
  }))
})

// --- 既存管理者 -------------------------------------------------------------

test('7. config_meta.lastModified がある既存端末では views を変更しない', () => {
  const adminLocal = storedConfig({
    views: [...PUBLISHED_VIEWS.slice(0, 4), { id: 'events', label: 'イベント', icon: '📖', enabled: false }],
  })
  const storage = storageWith({
    [storedConfigKey(SLUG)]: JSON.stringify(adminLocal),
    [configMetaKey(SLUG)]: JSON.stringify({ lastModified: 1756000000000 }),
  })

  const result = run(storage)

  assert.equal(result.applied, false)
  assert.equal(result.reason, 'admin-browser')
  assert.deepEqual(storage.readJson(storedConfigKey(SLUG)), adminLocal, '一切変更されない')
  assert.equal(storage.readJson(configMetaKey(SLUG)).viewsCompatVersion, undefined, 'versionも記録しない')
})

test('8. 管理者がローカルでeventsをOFFにしているなら、OFFのまま維持される', () => {
  const adminLocal = storedConfig({
    views: [...PUBLISHED_VIEWS.slice(0, 4), { id: 'events', label: 'イベント', icon: 'calendar-days', enabled: false }],
  })
  const storage = storageWith({
    [storedConfigKey(SLUG)]: JSON.stringify(adminLocal),
    [adminBrowserKey(SLUG)]: 'true',
  })

  run(storage)

  assert.equal(
    storage.readJson(storedConfigKey(SLUG)).views.find(v => v.id === 'events').enabled,
    false,
  )
})

test('9. 管理者が変更した label/icon/title/order/enabled は一切変更されない', () => {
  const adminLocal = storedConfig({
    views: [
      { id: 'events', label: '出演予定', icon: 'star', enabled: true, title: '出演予定' },
      { id: 'home', label: 'トップ', icon: 'home', enabled: true },
      { id: 'menu', label: 'メニュー', icon: 'book-open', enabled: false },
    ],
  })
  const storage = storageWith({
    [storedConfigKey(SLUG)]: JSON.stringify(adminLocal),
    [adminBrowserKey(SLUG)]: 'true',
  })

  run(storage)

  assert.deepEqual(storage.readJson(storedConfigKey(SLUG)).views, adminLocal.views)
})

// --- 管理者フラグ -----------------------------------------------------------

test('10. 管理画面を開いただけでは永続管理者フラグは立たない', () => {
  const storage = storageWith({ [storedConfigKey(SLUG)]: JSON.stringify(storedConfig()) })
  // 認証成功時にしか markAdminBrowser を呼ばないので、何も起きていない状態
  assert.equal(storage.getItem(adminBrowserKey(SLUG)), null)
  assert.equal(isAdminBrowser({ storage, repoSlug: SLUG }), false)
})

test('11. パスワード認証失敗では永続管理者フラグは立たない', () => {
  const storage = storageWith({})
  // AdminApp は認証失敗時 markAdminBrowser を呼ばない
  assert.equal(storage.getItem(adminBrowserKey(SLUG)), null)
  assert.equal(isAdminBrowser({ storage, repoSlug: SLUG }), false)
})

test('12. パスワード認証成功で永続管理者フラグが立つ', () => {
  const storage = storageWith({})
  markAdminBrowser({ storage, repoSlug: SLUG })
  assert.equal(storage.getItem(adminBrowserKey(SLUG)), 'true')
  assert.equal(isAdminBrowser({ storage, repoSlug: SLUG }), true)
})

test('12b. 管理者フラグは tenant ごとに分かれる', () => {
  const storage = storageWith({})
  markAdminBrowser({ storage, repoSlug: SLUG })
  assert.equal(isAdminBrowser({ storage, repoSlug: 'yusuke' }), false)
})

test('12c. admin_theme だけでは管理者と判定しない', () => {
  const storage = storageWith({ admin_theme: 'light' })
  assert.equal(isAdminBrowser({ storage, repoSlug: SLUG }), false)
})

test('13. 認証後に管理者がローカル設定を変えても、以降の修復に壊されない', () => {
  const storage = storageWith({ [storedConfigKey(SLUG)]: JSON.stringify(storedConfig({ views: PUBLISHED_VIEWS })) })
  markAdminBrowser({ storage, repoSlug: SLUG })

  // 管理画面での変更（saveConfig + saveConfigMeta 相当）
  const local = storage.readJson(storedConfigKey(SLUG))
  local.views = local.views.map(v => (v.id === 'events' ? { ...v, enabled: false, label: '準備中' } : v))
  storage.setItem(storedConfigKey(SLUG), JSON.stringify(local))
  storage.setItem(configMetaKey(SLUG), JSON.stringify({ lastModified: Date.now() }))

  run(storage)

  const events = storage.readJson(storedConfigKey(SLUG)).views.find(v => v.id === 'events')
  assert.equal(events.enabled, false, 'その端末だけのローカルプレビューが成立する')
  assert.equal(events.label, '準備中')
})

// --- 非回帰 -----------------------------------------------------------------

test('15. 新規ブラウザは何も書かれず、公開設定そのままになる', () => {
  const storage = storageWith({})
  const result = run(storage)
  assert.equal(result.applied, false)
  assert.equal(result.reason, 'no-stored-config')
  assert.deepEqual(storage.keys(), [], '一般の新規訪問者に書き込みをしない')
})

test('16. opt-in していない tenant では読み書きともに起きない', () => {
  const stale = storedConfig({ views: [{ id: 'home', label: 'Home', icon: 'home', enabled: true }] })
  const storage = storageWith({ [storedConfigKey('yusuke')]: JSON.stringify(stale) })

  // config.js に compat.viewsMigrationVersion が無い tenant は version が渡らない
  const result = migrateStoredViews({
    storage, repoSlug: 'yusuke', publishedViews: PUBLISHED_VIEWS, version: Number.NaN,
  })

  assert.equal(result.applied, false)
  assert.equal(result.reason, 'not-opted-in')
  assert.deepEqual(storage.readJson(storedConfigKey('yusuke')), stale)
  assert.deepEqual(storage.keys(), [storedConfigKey('yusuke')])
})

test('16b. 公開viewsが空・未定義なら何もしない', () => {
  const stale = storedConfig({ views: [{ id: 'home', enabled: true }] })
  for (const published of [undefined, null, []]) {
    const storage = storageWith({ [storedConfigKey(SLUG)]: JSON.stringify(stale) })
    const result = migrateStoredViews({ storage, repoSlug: SLUG, publishedViews: published, version: 1 })
    assert.equal(result.applied, false)
    assert.equal(result.reason, 'no-published-views')
    assert.deepEqual(storage.readJson(storedConfigKey(SLUG)), stale)
  }
})

test('17. 既に公開構成と一致していれば書き換えず、versionだけ記録する', () => {
  const same = storedConfig({ views: PUBLISHED_VIEWS })
  const storage = storageWith({ [storedConfigKey(SLUG)]: JSON.stringify(same) })

  const result = run(storage)

  assert.equal(result.applied, false)
  assert.equal(result.reason, 'already-matching')
  assert.deepEqual(storage.readJson(storedConfigKey(SLUG)), same)
  assert.equal(storage.readJson(configMetaKey(SLUG)).viewsCompatVersion, 1)
})

test('18. 保存済み設定に views キーが無ければ、公開設定が既に効いているので触らない', () => {
  const noViews = storedConfig()
  const storage = storageWith({ [storedConfigKey(SLUG)]: JSON.stringify(noViews) })

  const result = run(storage)

  assert.equal(result.applied, false)
  assert.equal(result.reason, 'no-stored-views')
  assert.deepEqual(storage.readJson(storedConfigKey(SLUG)), noViews)
})
