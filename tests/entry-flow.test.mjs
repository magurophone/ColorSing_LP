import assert from 'node:assert/strict'
import test from 'node:test'
import { FAN_PAGE_PLAN_ID, describePrice, findPlan, resolvePlans } from '../src/productization/plans.js'
import {
  loadAcquisitionSession,
  recordAccount,
  recordEntitlement,
  selectPlan,
  toAcquisitionInput,
} from '../src/productization/acquisitionSession.js'
import { ACQUISITION_STATE as A, deriveAcquisitionState } from '../src/productization/acquisition.js'

function memoryStorage() {
  const map = new Map()
  return {
    getItem: key => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, value),
    removeItem: key => map.delete(key),
  }
}

test('売っているのは歌推しページだけで、上位ツールやSLTを混ぜない', () => {
  const plans = resolvePlans({})
  assert.equal(plans.length, 1)
  assert.equal(plans[0].id, FAN_PAGE_PLAN_ID)
  assert.equal(plans[0].name, '歌推しページ')
  const text = JSON.stringify(plans)
  for (const word of ['Portal', 'SLT', '総合管理', 'OBS']) {
    assert.equal(text.includes(word), false, `${word} が商品説明に混ざっている`)
  }
})

test('価格はコードへ固定せず、未設定なら金額を作らない', () => {
  const unset = describePrice(findPlan({}, FAN_PAGE_PLAN_ID))
  assert.equal(unset.available, false)
  assert.equal(unset.label, '料金は準備中です')
  assert.equal(/\d/.test(unset.label), false)

  const configured = describePrice(findPlan({ plans: [{ id: FAN_PAGE_PLAN_ID, monthlyAmount: 600 }] }, FAN_PAGE_PLAN_ID))
  assert.equal(configured.available, true)
  assert.equal(configured.label, '月額 600円')
})

test('不正な金額は採用しない', () => {
  for (const monthlyAmount of ['むりょう', -1, null, undefined, NaN]) {
    const plan = findPlan({ plans: [{ id: FAN_PAGE_PLAN_ID, monthlyAmount }] }, FAN_PAGE_PLAN_ID)
    assert.equal(plan.monthlyAmount, null, String(monthlyAmount))
  }
})

test('プラン選択から利用権、アカウントまで画面をまたいで残る', () => {
  const storage = memoryStorage()
  selectPlan(FAN_PAGE_PLAN_ID, storage)
  assert.equal(loadAcquisitionSession(storage).planId, FAN_PAGE_PLAN_ID)
  recordEntitlement({ status: 'granted' }, storage)
  recordAccount({ status: 'ready' }, storage)
  const session = loadAcquisitionSession(storage)
  assert.deepEqual(session.entitlement, { status: 'granted' })
  assert.deepEqual(session.account, { status: 'ready' })
})

test('providerが結果を返さないうちは、完了したことにしない', () => {
  const storage = memoryStorage()
  selectPlan(FAN_PAGE_PLAN_ID, storage)
  recordEntitlement(null, storage)
  recordAccount({ status: 'not_configured' }, storage)
  const session = loadAcquisitionSession(storage)
  assert.equal(session.entitlement, null)
  assert.equal(session.account, null)
  assert.equal(deriveAcquisitionState(toAcquisitionInput(session)), A.PLAN_SELECTED)
})

test('入口の各段階が、そのまま獲得導線の状態になる', () => {
  const storage = memoryStorage()
  assert.equal(deriveAcquisitionState(toAcquisitionInput(loadAcquisitionSession(storage))), A.VISITOR)

  selectPlan(FAN_PAGE_PLAN_ID, storage)
  assert.equal(deriveAcquisitionState(toAcquisitionInput(loadAcquisitionSession(storage))), A.PLAN_SELECTED)

  recordEntitlement({ status: 'pending' }, storage)
  assert.equal(deriveAcquisitionState(toAcquisitionInput(loadAcquisitionSession(storage))), A.PURCHASE_PENDING)

  recordEntitlement({ status: 'granted' }, storage)
  assert.equal(deriveAcquisitionState(toAcquisitionInput(loadAcquisitionSession(storage))), A.ENTITLEMENT_GRANTED)

  recordAccount({ status: 'ready' }, storage)
  assert.equal(deriveAcquisitionState(toAcquisitionInput(loadAcquisitionSession(storage))), A.FANPAGE_NOT_CREATED)

  const withFanPage = toAcquisitionInput(loadAcquisitionSession(storage), { status: 'ready' })
  assert.equal(deriveAcquisitionState(withFanPage), A.FANPAGE_READY)
})

test('仮処理を許す場所を開発機のブラウザだけに限る', async () => {
  const { isLocalPreview } = await import('../src/productization/localPreview.js')
  const original = globalThis.window
  try {
    for (const [hostname, expected] of [
      ['localhost', true],
      ['127.0.0.1', true],
      ['[::1]', true],
      ['colorsing-dashboard.github.io', false],
      ['service.example.com', false],
    ]) {
      globalThis.window = { location: { hostname } }
      assert.equal(isLocalPreview(), expected, hostname)
    }
  } finally {
    if (original === undefined) delete globalThis.window
    else globalThis.window = original
  }
})
