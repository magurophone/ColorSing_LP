import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ACQUISITION_ROUTES,
  ACQUISITION_STATE as A,
  classifyBlocking,
  createIdentityProvider,
  createPaymentProvider,
  createProvisioningProvider,
  deriveAcquisitionState,
  describePortalStep,
} from '../src/productization/acquisition.js'
import { ONBOARDING_STATUS as S, deriveOnboardingSteps } from '../src/onboarding/state.js'

function portalStepOf(acquisition) {
  const model = deriveOnboardingSteps({ config: {}, acquisition })
  return model.steps.find(step => step.id === 'portal_created')
}

test('購入前から公開までの状態を、決済も認証も決めずに判定できる', () => {
  assert.equal(deriveAcquisitionState({}), A.VISITOR)
  assert.equal(deriveAcquisitionState({ planSelected: true }), A.PLAN_SELECTED)
  assert.equal(deriveAcquisitionState({ entitlement: { status: 'pending' } }), A.PURCHASE_PENDING)
  assert.equal(deriveAcquisitionState({ entitlement: { status: 'granted' } }), A.ENTITLEMENT_GRANTED)
  assert.equal(
    deriveAcquisitionState({ entitlement: { status: 'granted' }, account: { status: 'ready' } }),
    A.PORTAL_NOT_CREATED,
  )
  assert.equal(deriveAcquisitionState({ account: { status: 'ready' }, portal: { status: 'provisioning' } }), A.PORTAL_PROVISIONING)
  assert.equal(deriveAcquisitionState({ portal: { status: 'ready' } }), A.PORTAL_READY)
  assert.equal(deriveAcquisitionState({ portal: { status: 'ready', onboardingStarted: true } }), A.ONBOARDING)
  assert.equal(deriveAcquisitionState({ published: true }), A.PUBLISHED)
})

test('各状態に対応する画面が決まっている', () => {
  assert.equal(ACQUISITION_ROUTES[A.VISITOR], '/products')
  assert.equal(ACQUISITION_ROUTES[A.PURCHASE_PENDING], '/start')
  assert.equal(ACQUISITION_ROUTES[A.ENTITLEMENT_GRANTED], '/signup')
  assert.equal(ACQUISITION_ROUTES[A.PORTAL_NOT_CREATED], '/portal/create')
  assert.equal(ACQUISITION_ROUTES[A.PORTAL_READY], '/onboarding')
})

test('providerは注入しない限り未設定を返し、決まったふりで進めない', () => {
  for (const provider of [createPaymentProvider(), createIdentityProvider(), createProvisioningProvider()]) {
    assert.equal(provider.configured, false)
    assert.equal(provider.status, 'not_configured')
  }
  assert.equal(createProvisioningProvider({ readPortal: async () => ({ status: 'ready' }) }).configured, true)
})

test('進めない理由を、操作待ち・処理待ち・失敗に分ける', () => {
  assert.equal(classifyBlocking(A.PORTAL_NOT_CREATED), 'action_required')
  assert.equal(classifyBlocking(A.PORTAL_PROVISIONING), 'waiting')
  assert.equal(classifyBlocking(A.PURCHASE_PENDING), 'waiting')
  assert.equal(classifyBlocking(A.PORTAL_NOT_CREATED, { status: 'failed' }), 'failed')
})

test('未作成は行き止まりにせず、次の操作を提示する', () => {
  const guidance = describePortalStep(A.PORTAL_NOT_CREATED)
  assert.equal(guidance.headline, 'まだPortalを作っていません')
  assert.equal(guidance.action.label, 'Portalを作成する')
  assert.equal(guidance.action.route, '/portal/create')
  assert.equal(guidance.blocking, 'action_required')
})

test('準備中は待ちであってエラーではない', () => {
  const guidance = describePortalStep(A.PORTAL_PROVISIONING, { status: 'provisioning' })
  assert.equal(guidance.headline, '公開ページを準備しています')
  assert.equal(guidance.action, null)
  assert.equal(guidance.blocking, 'waiting')
  assert.equal(portalStepOf({ account: { status: 'ready' }, portal: { status: 'provisioning' } }).status, S.PENDING)
})

test('実際に失敗したときだけBLOCKEDにし、やり直しを示す', () => {
  const step = portalStepOf({ account: { status: 'ready' }, portal: { status: 'failed' } })
  assert.equal(step.status, S.BLOCKED)
  assert.equal(step.guidance.action.label, 'もう一度試す')
})

test('利用者向け案内にシステム語彙を残さない', () => {
  const states = [A.VISITOR, A.ENTITLEMENT_GRANTED, A.PORTAL_NOT_CREATED, A.PORTAL_PROVISIONING]
  for (const state of states) {
    const guidance = describePortalStep(state)
    const text = [guidance.headline, guidance.now, guidance.why, guidance.completion, guidance.later].join(' ')
    for (const word of ['識別情報', 'slug', 'repository', 'config', 'provisioning', 'tenant']) {
      assert.equal(text.includes(word), false, `${state} に ${word} が残っている`)
    }
    // 進めない状態では、必ず次の操作か待つ理由のどちらかを示す。
    assert.equal(Boolean(guidance.action) || guidance.blocking === 'waiting', true, `${state} に次の一手がない`)
  }
})

test('獲得導線を渡さない従来の呼び出しは挙動を変えない', () => {
  const step = deriveOnboardingSteps({ config: {} }).steps.find(item => item.id === 'portal_created')
  assert.equal(step.status, S.BLOCKED)
  assert.equal(step.guidance, undefined)
})
