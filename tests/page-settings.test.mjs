import assert from 'node:assert/strict'
import test from 'node:test'
import { applyPageSettings, pickRuntimeSettings } from '../src/lib/pageSettings.js'

const SNAPSHOT = {
  brand: { name: '写しの名前', pageTitle: '写しのタブ名', showTitle: true },
  colors: { deepBlue: '#111111', gold: '#666666' },
  views: [{ id: 'home', label: '写しHome', icon: '🏠', enabled: true }],
  sheets: { spreadsheetId: 'demo' },
  platform: { tenantSlug: 'magurophone' },
  deploy: { token: 'rev:secret' },
  admin: { password: 'legacy' },
}

test('D1の設定が写しより優先される', () => {
  const applied = applyPageSettings(SNAPSHOT, { brand: { name: 'D1の名前' } })
  assert.equal(applied.brand.name, 'D1の名前')
})

test('D1が触れていない項目は写しのまま残る', () => {
  const applied = applyPageSettings(SNAPSHOT, { brand: { name: 'D1の名前' } })
  assert.equal(applied.brand.pageTitle, '写しのタブ名')
  assert.equal(applied.brand.showTitle, true)
  assert.equal(applied.colors.gold, '#666666')
})

test('空文字は「空にした」として反映する', () => {
  const applied = applyPageSettings(SNAPSHOT, { brand: { pageTitle: '' } })
  assert.equal(applied.brand.pageTitle, '')
})

test('データの置き場所・配布・管理の設定は、応答に混ざっていても採らない', () => {
  const applied = applyPageSettings(SNAPSHOT, {
    sheets: { spreadsheetId: 'hijacked' },
    platform: { publicApiBaseUrl: 'https://elsewhere.example' },
    deploy: { token: 'stolen' },
    admin: { password: 'stolen' },
    brand: { name: 'D1の名前' },
  })
  assert.equal(applied.sheets.spreadsheetId, 'demo')
  assert.equal(applied.platform.tenantSlug, 'magurophone')
  assert.equal(applied.deploy.token, 'rev:secret')
  assert.equal(applied.admin.password, 'legacy')
})

test('ビューはD1の並びで丸ごと置き換わる', () => {
  const applied = applyPageSettings(SNAPSHOT, {
    views: [
      { id: 'home', label: 'D1のHome', icon: '🏠', enabled: true },
      { id: 'menu', label: 'D1のMenu', icon: '🍾', enabled: false },
    ],
  })
  assert.deepEqual(applied.views.map(view => view.label), ['D1のHome', 'D1のMenu'])
})

test('ビューが空で届いても、写しの並びは消さない', () => {
  const applied = applyPageSettings(SNAPSHOT, { views: [] })
  assert.deepEqual(applied.views.map(view => view.label), ['写しHome'])
})

test('設定がまだ無いテナントは、写しのまま何も変えない', () => {
  assert.equal(applyPageSettings(SNAPSHOT, {}), SNAPSHOT)
  assert.equal(applyPageSettings(SNAPSHOT, null), SNAPSHOT)
  assert.equal(applyPageSettings(SNAPSHOT, undefined), SNAPSHOT)
})

test('特典の見せ方だけが入っていても、見た目の設定は写しのまま', () => {
  const applied = applyPageSettings(SNAPSHOT, { benefitTierDisplay: { '5k': { legacyColumn: 1 } } })
  assert.equal(applied.brand.name, '写しの名前')
  assert.deepEqual(applied.benefitTierDisplay, { '5k': { legacyColumn: 1 } })
})

test('受け取ってよいキーだけを抜き出す', () => {
  assert.deepEqual(pickRuntimeSettings({ brand: { name: 'x' }, sheets: { spreadsheetId: 'y' } }), { brand: { name: 'x' } })
  assert.equal(pickRuntimeSettings({ sheets: { spreadsheetId: 'y' } }), null)
})
