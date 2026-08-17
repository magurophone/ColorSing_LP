import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DATA_SOURCE,
  TENANT_KIND,
  describeSupportersStep,
  isSheetsMigrationAvailable,
  resolveDataSource,
  resolveTenantKind,
} from '../src/productization/tenantKind.js'
import { ONBOARDING_STATUS as S, deriveOnboardingSteps } from '../src/onboarding/state.js'

const legacyConfig = { sheets: { spreadsheetId: 'existing-sheet' } }
const newConfig = { sheets: { spreadsheetId: '' } }

function stepIds(config, extra = {}) {
  return deriveOnboardingSteps({ config, ...extra }).steps.map(step => step.id)
}

test('スプレッドシートを持つ顧客だけをlegacyとして扱う', () => {
  assert.equal(resolveTenantKind(legacyConfig), TENANT_KIND.LEGACY)
  assert.equal(resolveTenantKind(newConfig), TENANT_KIND.NEW)
  assert.equal(resolveTenantKind({}), TENANT_KIND.NEW)
  // 明示指定があればそれに従う。
  assert.equal(resolveTenantKind({ platform: { tenantKind: 'legacy' } }), TENANT_KIND.LEGACY)
})

test('新規顧客の正規データソースはCentral DBで、選択させない', () => {
  assert.equal(resolveDataSource(newConfig), DATA_SOURCE.CENTRAL)
  assert.equal(resolveDataSource(legacyConfig), DATA_SOURCE.SHEETS)
})

test('Sheetsからの移行は既存顧客だけの機能', () => {
  assert.equal(isSheetsMigrationAvailable(legacyConfig), true)
  assert.equal(isSheetsMigrationAvailable(newConfig), false)
})

test('新規顧客のDAPにSheets接続の必須工程を出さない', () => {
  const ids = stepIds(newConfig)
  assert.equal(ids.includes('data_source_selected'), false)
  assert.equal(ids.includes('data_source_connected'), false)
  assert.equal(ids.includes('supporters_ready'), true)
})

test('既存顧客のDAPは従来の手順を変えない', () => {
  const ids = stepIds(legacyConfig)
  assert.equal(ids.includes('data_source_selected'), true)
  assert.equal(ids.includes('data_source_connected'), true)
  assert.equal(ids.includes('supporters_ready'), false)
})

test('管理画面が未接続のときは、空を完了と誤判定せず準備中にする', () => {
  const step = deriveOnboardingSteps({ config: newConfig }).steps.find(item => item.id === 'supporters_ready')
  assert.equal(step.status, S.PENDING)
  assert.equal(step.canComplete, false)
  assert.equal(step.guidance.blocking, 'waiting')
  assert.equal(step.guidance.action, null)
})

test('未登録なら登録への導線を出し、登録済みなら完了にする', () => {
  const empty = deriveOnboardingSteps({ config: newConfig, supporters: { status: 'empty' } })
    .steps.find(item => item.id === 'supporters_ready')
  assert.equal(empty.status, S.IN_PROGRESS)
  assert.equal(empty.guidance.action.label, 'リスナーを登録する')

  const ready = deriveOnboardingSteps({ config: newConfig, supporters: { status: 'ready' } })
    .steps.find(item => item.id === 'supporters_ready')
  assert.equal(ready.status, S.COMPLETE)
  assert.equal(ready.canComplete, true)
})

test('新規顧客向けの文言に内部実装の語を出さない', () => {
  const samples = [
    describeSupportersStep(null),
    describeSupportersStep({ status: 'empty' }),
    describeSupportersStep({ status: 'ready' }),
  ]
  const text = samples.flatMap(item => [item.headline, item.now, item.why, item.completion, item.later]).join(' ')
  for (const word of ['DataSource', 'データソース', 'スプレッドシート', 'Sheets', 'Central DB', 'tenant']) {
    assert.equal(text.includes(word), false, `${word} が残っている`)
  }
})

test('config.jsが積んでいる特典を「設定済み」にしない', () => {
  const shipped = [{ key: '1k' }]
  const withViews = { ...newConfig, views: [{ id: 'menu', enabled: true }], benefitTiers: shipped }

  // config.js 由来のまま。顧客はまだ何も決めていない。
  const untouched = deriveOnboardingSteps({ config: withViews, baseConfig: { benefitTiers: shipped } })
    .steps.find(item => item.id === 'benefit_structure_complete')
  assert.notEqual(untouched.status, 'complete')

  // 顧客が変えたときだけ完了とする。
  const changed = deriveOnboardingSteps({
    config: { ...withViews, benefitTiers: [{ key: '3k' }] },
    baseConfig: { benefitTiers: shipped },
  }).steps.find(item => item.id === 'benefit_structure_complete')
  assert.equal(changed.status, 'complete')
})

test('歌推しページを作った人は、設定に古いシートIDが残っていても新規顧客のまま', () => {
  const staleConfig = { sheets: { spreadsheetId: 'demo' } }
  const asLegacy = deriveOnboardingSteps({ config: staleConfig }).steps.map(step => step.id)
  assert.equal(asLegacy.includes('data_source_connected'), true)

  const asNew = deriveOnboardingSteps({ config: staleConfig, hasFanPageRecord: true }).steps.map(step => step.id)
  assert.equal(asNew.includes('data_source_connected'), false)
  assert.equal(asNew.includes('supporters_ready'), true)
})
