import assert from 'node:assert/strict'
import test from 'node:test'
import {
  inspectSetupState,
  isClearableKey,
  isProtectedKey,
  resetSetupProgress,
} from '../src/productization/setupReset.js'

function storageWith(entries) {
  const map = new Map(Object.entries(entries))
  return {
    keys: () => map.keys(),
    getItem: key => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, value),
    removeItem: key => map.delete(key),
    snapshot: () => [...map.keys()].sort(),
  }
}

test('消してよいのは導線の進行状況だけ', () => {
  assert.equal(isClearableKey('fanpage_creation_state_v1'), true)
  assert.equal(isClearableKey('acquisition_session_v1'), true)
  assert.equal(isClearableKey('onboarding_state_default'), true)
  assert.equal(isClearableKey('onboarding_state_trial-singer'), true)
})

test('顧客の設定は消さない', () => {
  for (const key of ['dashboard_config_magurophone', 'config_meta_magurophone', 'dashboard_config_yusuke']) {
    assert.equal(isProtectedKey(key), true, key)
    assert.equal(isClearableKey(key), false, key)
  }
})

test('知らないキーは消さない', () => {
  for (const key of ['admin_theme', 'icon_gallery_cache', '', null]) {
    assert.equal(isClearableKey(key), false, String(key))
  }
})

test('実行前に、消えるものと残るものを一覧で示す', () => {
  const local = storageWith({
    fanpage_creation_state_v1: '{}',
    acquisition_session_v1: '{}',
    onboarding_state_default: '{}',
    dashboard_config_magurophone: '{}',
    config_meta_magurophone: '{}',
    admin_theme: 'dark',
  })
  const session = storageWith({ onboarding_auth: 'true', unrelated: '1' })
  const found = inspectSetupState({ local, session })
  assert.deepEqual(found.clearable, ['acquisition_session_v1', 'fanpage_creation_state_v1', 'onboarding_state_default'])
  assert.deepEqual(found.protectedKeys, ['config_meta_magurophone', 'dashboard_config_magurophone'])
  assert.deepEqual(found.sessionClearable, ['onboarding_auth'])
})

test('リセットしても顧客設定と無関係なキーは残る', () => {
  const local = storageWith({
    fanpage_creation_state_v1: '{}',
    acquisition_session_v1: '{}',
    onboarding_state_default: '{}',
    dashboard_config_magurophone: '{"brand":{"name":"aaa"}}',
    config_meta_magurophone: '{}',
    admin_theme: 'dark',
  })
  const session = storageWith({ onboarding_auth: 'true', admin_auth: 'true' })

  const result = resetSetupProgress({ local, session })
  assert.deepEqual(result.cleared, ['acquisition_session_v1', 'fanpage_creation_state_v1', 'onboarding_state_default'])
  assert.deepEqual(result.clearedSession, ['admin_auth', 'onboarding_auth'])

  // 顧客設定はそのまま。購入導線の確認と設定の初期化を混ぜない。
  assert.deepEqual(local.snapshot(), ['admin_theme', 'config_meta_magurophone', 'dashboard_config_magurophone'])
  assert.equal(local.getItem('dashboard_config_magurophone'), '{"brand":{"name":"aaa"}}')
  assert.deepEqual(session.snapshot(), [])
})

test('消すものが無いときも安全に動く', () => {
  const local = storageWith({ dashboard_config_magurophone: '{}' })
  const session = storageWith({})
  const result = resetSetupProgress({ local, session })
  assert.deepEqual(result.cleared, [])
  assert.deepEqual(local.snapshot(), ['dashboard_config_magurophone'])
})
