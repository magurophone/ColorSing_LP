// 購入前から公開までの獲得導線の状態モデル。
//
// 決済事業者、認証事業者、実際のprovisioning方式が決まっていなくても、画面と
// 状態遷移はここで確定できる。外部依存は下の3つの境界の裏へ置き、この
// モジュール自体はどのproviderにも依存しない。
//
// 重要: 進めない状態のすべてがエラーではない。未着手と処理待ちと失敗を
// 区別し、利用者が次に何をすればよいかを状態ごとに返す。

export const ACQUISITION_STATE = Object.freeze({
  VISITOR: 'visitor',
  PLAN_SELECTED: 'plan_selected',
  PURCHASE_PENDING: 'purchase_pending',
  ENTITLEMENT_GRANTED: 'entitlement_granted',
  ACCOUNT_READY: 'account_ready',
  FANPAGE_NOT_CREATED: 'fanpage_not_created',
  FANPAGE_PROVISIONING: 'fanpage_provisioning',
  FANPAGE_READY: 'fanpage_ready',
  ONBOARDING: 'onboarding',
  PUBLISHED: 'published',
})

const A = ACQUISITION_STATE

// 画面はplan購入前から続くひと続きの導線として並ぶ。
export const ACQUISITION_ROUTES = Object.freeze({
  [A.VISITOR]: '/products',
  [A.PLAN_SELECTED]: '/start',
  [A.PURCHASE_PENDING]: '/start',
  [A.ENTITLEMENT_GRANTED]: '/signup',
  [A.ACCOUNT_READY]: '/fanpage/create',
  [A.FANPAGE_NOT_CREATED]: '/fanpage/create',
  [A.FANPAGE_PROVISIONING]: '/fanpage/create',
  [A.FANPAGE_READY]: '/onboarding',
  [A.ONBOARDING]: '/onboarding',
  [A.PUBLISHED]: '/onboarding',
})

export const ACQUISITION_ORDER = Object.freeze([
  A.VISITOR,
  A.PLAN_SELECTED,
  A.PURCHASE_PENDING,
  A.ENTITLEMENT_GRANTED,
  A.ACCOUNT_READY,
  A.FANPAGE_NOT_CREATED,
  A.FANPAGE_PROVISIONING,
  A.FANPAGE_READY,
  A.ONBOARDING,
  A.PUBLISHED,
])

// 外部依存の境界。実装を注入しない限り not_configured を返し、決まっていない
// ことを決まったふりで進めない。
function unconfigured(kind) {
  return { kind, configured: false, status: 'not_configured' }
}

export function createPaymentProvider(adapter = null) {
  if (!adapter) return { ...unconfigured('payment'), async readEntitlement() { return null } }
  return { kind: 'payment', configured: true, readEntitlement: (...args) => adapter.readEntitlement(...args) }
}

export function createIdentityProvider(adapter = null) {
  if (!adapter) return { ...unconfigured('identity'), async readAccount() { return null } }
  return { kind: 'identity', configured: true, readAccount: (...args) => adapter.readAccount(...args) }
}

export function createProvisioningProvider(adapter = null) {
  if (!adapter) return { ...unconfigured('provisioning'), async readFanPage() { return null } }
  return { kind: 'provisioning', configured: true, readFanPage: (...args) => adapter.readFanPage(...args) }
}

export function deriveAcquisitionState({
  planSelected = false,
  entitlement = null,
  account = null,
  portal = null,
  published = false,
} = {}) {
  if (published) return A.PUBLISHED
  if (portal?.status === 'ready') return portal.onboardingStarted ? A.ONBOARDING : A.FANPAGE_READY
  if (portal?.status === 'provisioning') return A.FANPAGE_PROVISIONING
  if (account?.status === 'ready') return A.FANPAGE_NOT_CREATED
  if (entitlement?.status === 'granted') return A.ENTITLEMENT_GRANTED
  if (entitlement?.status === 'pending') return A.PURCHASE_PENDING
  if (planSelected) return A.PLAN_SELECTED
  return A.VISITOR
}

// 進めない理由の種類。エラーとして見せてよいのは failed だけ。
export function classifyBlocking(state, portal = null) {
  if (portal?.status === 'failed') return 'failed'
  if (state === A.FANPAGE_PROVISIONING) return 'waiting'
  if (state === A.PURCHASE_PENDING) return 'waiting'
  return 'action_required'
}

// 利用者向けの文言。システム側の語彙を出さず、必ず次の操作か待ちの理由を返す。
export function describeFanPageStep(state, portal = null) {
  const blocking = classifyBlocking(state, portal)
  // 失敗はどの状態から来ても失敗として扱う。状態別の案内より優先する。
  if (blocking === 'failed') {
    return {
      headline: '歌推しページの作成に失敗しました',
      now: 'もう一度お試しください。繰り返し失敗する場合は運営へご連絡ください。',
      why: '準備の途中で問題が起きたため、次の設定へ進めません。',
      completion: '歌推しページの準備が完了すること。',
      later: '入力済みの設定は失われません。',
      action: { label: 'もう一度試す', route: ACQUISITION_ROUTES[A.FANPAGE_NOT_CREATED] },
      blocking,
    }
  }
  switch (state) {
    case A.VISITOR:
    case A.PLAN_SELECTED:
    case A.PURCHASE_PENDING:
      return {
        headline: 'お申し込みの確認を待っています',
        now: 'お申し込みが完了すると、歌推しページの作成へ進めます。',
        why: '歌推しページはお申し込みごとに用意します。',
        completion: 'お申し込みが確認できること。',
        later: 'プランは後から変更できます。',
        action: blocking === 'waiting' ? null : { label: 'プランを見る', route: ACQUISITION_ROUTES[A.VISITOR] },
        blocking,
      }
    case A.ENTITLEMENT_GRANTED:
      return {
        headline: 'ログイン情報の登録が必要です',
        now: 'あなたのログイン情報を登録してください。',
        why: '設定した内容をあなたのものとして保存するためです。',
        completion: 'ログイン情報が登録されていること。',
        later: 'ログイン情報は後から変更できます。',
        action: { label: '登録に進む', route: ACQUISITION_ROUTES[A.ENTITLEMENT_GRANTED] },
        blocking,
      }
    case A.ACCOUNT_READY:
    case A.FANPAGE_NOT_CREATED:
      return {
        headline: 'まだ歌推しページを作っていません',
        now: '最初にあなたの歌推しページを作成します。「歌推しページを作成する」からページ名と公開URLを設定してください。',
        why: '歌推しページの住所を決めてから、中身の設定へ進みます。',
        completion: '歌推しページが作成されていること。',
        later: '公開URLは後から変えると閲覧者のリンクが切れるため、運営への確認が必要です。',
        action: { label: '歌推しページを作成する', route: ACQUISITION_ROUTES[A.FANPAGE_NOT_CREATED] },
        blocking,
      }
    case A.FANPAGE_PROVISIONING:
      return {
        headline: '歌推しページを準備しています',
        // 進行中を「未着手」と表示すると、止まっているように見えてしまう。
        statusLabel: '準備中',
        now: '歌推しページの準備がまだ完了していません。完了すると次の設定へ進めます。',
        why: '歌推しページの用意には少し時間がかかります。',
        completion: '歌推しページの準備が完了すること。',
        later: 'この画面を閉じても準備は続きます。',
        action: null,
        blocking,
      }
    default:
      return {
        headline: '歌推しページの作成が完了しました',
        now: '続けて公開する内容を設定してください。',
        why: '設定した内容がそのまま公開ページへ反映されます。',
        completion: '歌推しページが利用できること。',
        later: '設定は公開後もいつでも変更できます。',
        action: null,
        blocking: 'action_required',
      }
  }
}
